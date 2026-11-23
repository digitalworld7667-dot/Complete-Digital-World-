-- Restrict teacher attendance visibility to administrators and the teacher who owns the row.
-- Students and parents must not be able to browse staff attendance records.
drop policy if exists teacher_attendance_read on public.teacher_attendance;

create policy teacher_attendance_read
on public.teacher_attendance
for select
to authenticated
using (
  (select private.is_super_admin())
  or (select private.has_school_role(school_id, array['school_admin']::text[]))
  or (
    (select private.is_active_user())
    and exists (
      select 1
      from public.teachers t
      where t.id = teacher_attendance.teacher_id
        and t.profile_id = (select auth.uid())
        and t.school_id = teacher_attendance.school_id
    )
  )
);
