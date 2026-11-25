-- Security hardening for School ERP salary and privileged RPC access.
-- Keep authenticated role access where the function performs its own role checks.
revoke all on function public.get_or_create_student_attendance_qr(uuid) from anon;
revoke all on function public.mark_attendance_by_student_qr(uuid) from anon;
revoke all on function public.school_plan_allows(uuid,text) from anon;

-- Salary records must never rely on PUBLIC policies; restrict them to signed-in users.
drop policy if exists staff_salary_records_school_admin_all on public.staff_salary_records;
create policy staff_salary_records_school_admin_all
on public.staff_salary_records
for all
to authenticated
using (
  (select private.is_super_admin())
  or (select private.has_school_role(school_id, array['school_admin']::text[]))
)
with check (
  (select private.is_super_admin())
  or (select private.has_school_role(school_id, array['school_admin']::text[]))
);

drop policy if exists staff_salary_records_teacher_read on public.staff_salary_records;
create policy staff_salary_records_teacher_read
on public.staff_salary_records
for select
to authenticated
using (
  (select private.is_active_user())
  and teacher_id is not null
  and exists (
    select 1 from public.teachers t
    where t.id = staff_salary_records.teacher_id
      and t.profile_id = (select auth.uid())
      and t.school_id = staff_salary_records.school_id
  )
);
