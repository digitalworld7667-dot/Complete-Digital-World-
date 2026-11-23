-- Secure transport assignments and scope GPS visibility to assigned families.
-- No existing student/bus links are inferred or backfilled.

CREATE TABLE IF NOT EXISTS public.student_bus_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  bus_id uuid NOT NULL,
  assigned_from date NOT NULL DEFAULT CURRENT_DATE,
  assigned_until date,
  assigned_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_bus_assignments_valid_dates
    CHECK (assigned_until IS NULL OR assigned_until >= assigned_from),
  CONSTRAINT student_bus_assignments_student_school_fk
    FOREIGN KEY (student_id, school_id)
    REFERENCES public.students (id, school_id) ON DELETE CASCADE,
  CONSTRAINT student_bus_assignments_bus_school_fk
    FOREIGN KEY (bus_id, school_id)
    REFERENCES public.buses (id, school_id) ON DELETE CASCADE,
  CONSTRAINT student_bus_assignments_assigned_by_fk
    FOREIGN KEY (assigned_by) REFERENCES public.profiles (id) ON DELETE SET NULL
);

-- Composite key supports a school-scoped foreign key from assignments.
CREATE UNIQUE INDEX IF NOT EXISTS buses_id_school_id_key
  ON public.buses (id, school_id);


-- Prevent overlapping assignment date ranges, including concurrent writes.
CREATE OR REPLACE FUNCTION private.prevent_overlapping_student_bus_assignments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.school_id::text || ':' || NEW.student_id::text, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.student_bus_assignments a
    WHERE a.school_id = NEW.school_id
      AND a.student_id = NEW.student_id
      AND a.id IS DISTINCT FROM NEW.id
      AND pg_catalog.daterange(a.assigned_from, a.assigned_until, '[]')
          && pg_catalog.daterange(NEW.assigned_from, NEW.assigned_until, '[]')
  ) THEN
    RAISE EXCEPTION 'Student already has an overlapping bus assignment period'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_overlapping_student_bus_assignments
  ON public.student_bus_assignments;
CREATE TRIGGER prevent_overlapping_student_bus_assignments
BEFORE INSERT OR UPDATE OF school_id, student_id, assigned_from, assigned_until
ON public.student_bus_assignments
FOR EACH ROW
EXECUTE FUNCTION private.prevent_overlapping_student_bus_assignments();

-- Fast lookup for currently open assignments.
CREATE UNIQUE INDEX IF NOT EXISTS student_bus_assignments_one_open_assignment
  ON public.student_bus_assignments (school_id, student_id)
  WHERE assigned_until IS NULL;

CREATE INDEX IF NOT EXISTS student_bus_assignments_bus_idx
  ON public.student_bus_assignments (school_id, bus_id);

CREATE INDEX IF NOT EXISTS student_bus_assignments_student_idx
  ON public.student_bus_assignments (school_id, student_id);

ALTER TABLE public.student_bus_assignments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_bus_assignments TO authenticated;

DROP POLICY IF EXISTS student_bus_assignments_read ON public.student_bus_assignments;
CREATE POLICY student_bus_assignments_read
ON public.student_bus_assignments
FOR SELECT TO authenticated
USING (
  private.is_super_admin()
  OR private.has_school_role(school_id, ARRAY['school_admin']::text[])
  OR private.is_assigned_bus_driver(bus_id)
  OR EXISTS (
    SELECT 1
    FROM public.parents pa
    WHERE pa.student_id = student_bus_assignments.student_id
      AND pa.school_id = student_bus_assignments.school_id
      AND pa.profile_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS student_bus_assignments_insert ON public.student_bus_assignments;
CREATE POLICY student_bus_assignments_insert
ON public.student_bus_assignments
FOR INSERT TO authenticated
WITH CHECK (
  private.is_super_admin()
  OR private.has_school_role(school_id, ARRAY['school_admin']::text[])
);

DROP POLICY IF EXISTS student_bus_assignments_update ON public.student_bus_assignments;
CREATE POLICY student_bus_assignments_update
ON public.student_bus_assignments
FOR UPDATE TO authenticated
USING (
  private.is_super_admin()
  OR private.has_school_role(school_id, ARRAY['school_admin']::text[])
)
WITH CHECK (
  private.is_super_admin()
  OR private.has_school_role(school_id, ARRAY['school_admin']::text[])
);

DROP POLICY IF EXISTS student_bus_assignments_delete ON public.student_bus_assignments;
CREATE POLICY student_bus_assignments_delete
ON public.student_bus_assignments
FOR DELETE TO authenticated
USING (
  private.is_super_admin()
  OR private.has_school_role(school_id, ARRAY['school_admin']::text[])
);

-- GPS coordinates are visible only to transport admins, the assigned driver,
-- or a parent linked to a student currently assigned to that bus.
DROP POLICY IF EXISTS bus_locations_read ON public.bus_locations;
CREATE POLICY bus_locations_read
ON public.bus_locations
FOR SELECT TO authenticated
USING (
  private.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.buses b
    WHERE b.id = bus_locations.bus_id
      AND private.has_school_role(b.school_id, ARRAY['school_admin']::text[])
  )
  OR private.is_assigned_bus_driver(bus_id)
  OR EXISTS (
    SELECT 1
    FROM public.student_bus_assignments a
    JOIN public.parents pa
      ON pa.student_id = a.student_id
     AND pa.school_id = a.school_id
    WHERE a.bus_id = bus_locations.bus_id
      AND pa.profile_id = (SELECT auth.uid())
      AND a.assigned_from <= CURRENT_DATE
      AND (a.assigned_until IS NULL OR a.assigned_until >= CURRENT_DATE)
  )
);

-- Only the assigned driver or transport admins can submit GPS coordinates.
DROP POLICY IF EXISTS bus_locations_insert ON public.bus_locations;
CREATE POLICY bus_locations_insert
ON public.bus_locations
FOR INSERT TO authenticated
WITH CHECK (
  private.is_assigned_bus_driver(bus_id)
  OR EXISTS (
    SELECT 1 FROM public.buses b
    WHERE b.id = bus_locations.bus_id
      AND (private.is_super_admin()
        OR private.has_school_role(b.school_id, ARRAY['school_admin']::text[]))
  )
);

-- Historical GPS rows cannot be edited/deleted by drivers or parents.
DROP POLICY IF EXISTS bus_locations_update ON public.bus_locations;
CREATE POLICY bus_locations_update
ON public.bus_locations
FOR UPDATE TO authenticated
USING (
  private.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.buses b
    WHERE b.id = bus_locations.bus_id
      AND private.has_school_role(b.school_id, ARRAY['school_admin']::text[])
  )
)
WITH CHECK (
  private.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.buses b
    WHERE b.id = bus_locations.bus_id
      AND private.has_school_role(b.school_id, ARRAY['school_admin']::text[])
  )
);

DROP POLICY IF EXISTS bus_locations_delete ON public.bus_locations;
CREATE POLICY bus_locations_delete
ON public.bus_locations
FOR DELETE TO authenticated
USING (
  private.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.buses b
    WHERE b.id = bus_locations.bus_id
      AND private.has_school_role(b.school_id, ARRAY['school_admin']::text[])
  )
);

-- A driver may log boarding/drop-off only for a student assigned to that bus
-- on the event date. Admin permissions are retained.
DROP POLICY IF EXISTS bus_logs_insert ON public.bus_logs;
CREATE POLICY bus_logs_insert
ON public.bus_logs
FOR INSERT TO authenticated
WITH CHECK (
  private.is_super_admin()
  OR private.has_school_role(school_id, ARRAY['school_admin']::text[])
  OR (
    bus_id IS NOT NULL
    AND private.is_assigned_bus_driver(bus_id)
    AND EXISTS (
      SELECT 1
      FROM public.student_bus_assignments a
      WHERE a.school_id = bus_logs.school_id
        AND a.student_id = bus_logs.student_id
        AND a.bus_id = bus_logs.bus_id
        AND a.assigned_from <= (bus_logs.event_time AT TIME ZONE 'UTC')::date
        AND (a.assigned_until IS NULL
          OR a.assigned_until >= (bus_logs.event_time AT TIME ZONE 'UTC')::date)
    )
  )
);
