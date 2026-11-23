-- Ensure a student can submit only homework assigned to their own class/section.
-- Ensure teachers can only review submissions whose student matches the homework class/section.

drop policy if exists homework_submissions_insert on public.homework_submissions;

create policy homework_submissions_insert
on public.homework_submissions
for insert
to authenticated
with check (
  private.is_student_self(student_id)
  and exists (
    select 1
    from public.students s
    join public.homework h
      on h.id = homework_submissions.homework_id
     and h.school_id = homework_submissions.school_id
     and h.school_id = s.school_id
    where s.id = homework_submissions.student_id
      and s.school_id = homework_submissions.school_id
      and s.class_name = h.class_name
      and (h.section is null or s.section is not distinct from h.section)
  )
);

drop policy if exists homework_submissions_update on public.homework_submissions;

create policy homework_submissions_update
on public.homework_submissions
for update
to authenticated
using (
  private.is_super_admin()
  or private.has_school_role(school_id, array['school_admin']::text[])
  or exists (
    select 1
    from public.homework h
    join public.students s
      on s.id = homework_submissions.student_id
     and s.school_id = homework_submissions.school_id
    where h.id = homework_submissions.homework_id
      and h.school_id = homework_submissions.school_id
      and s.class_name = h.class_name
      and (h.section is null or s.section is not distinct from h.section)
      and private.has_school_role(h.school_id, array['teacher']::text[])
      and private.is_teacher_assigned_to_class(h.school_id, h.class_name)
  )
)
with check (
  private.is_super_admin()
  or private.has_school_role(school_id, array['school_admin']::text[])
  or exists (
    select 1
    from public.homework h
    join public.students s
      on s.id = homework_submissions.student_id
     and s.school_id = homework_submissions.school_id
    where h.id = homework_submissions.homework_id
      and h.school_id = homework_submissions.school_id
      and s.class_name = h.class_name
      and (h.section is null or s.section is not distinct from h.section)
      and private.has_school_role(h.school_id, array['teacher']::text[])
      and private.is_teacher_assigned_to_class(h.school_id, h.class_name)
  )
);
