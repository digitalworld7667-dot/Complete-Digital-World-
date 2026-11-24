create or replace function public.mark_attendance_by_student_qr(p_token uuid)
returns table(student_name text, class_name text, section text, attendance_date date, attendance_status text, already_marked boolean)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_student public.students%rowtype;
  v_existing public.attendance%rowtype;
  v_inserted boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select s.* into v_student
    from public.student_attendance_qr_tokens q
    join public.students s on s.id=q.student_id and s.school_id=q.school_id
   where q.token=p_token and q.revoked_at is null and s.student_status='active';
  if not found then raise exception 'Invalid or revoked student QR'; end if;
  if not (
    private.is_super_admin()
    or private.has_school_role(v_student.school_id, array['school_admin']::text[])
    or (private.has_school_role(v_student.school_id, array['teacher']::text[])
        and private.is_teacher_assigned_to_class(v_student.school_id,v_student.class_name))
  ) then raise exception 'Not authorized to mark attendance for this student'; end if;

  insert into public.attendance(school_id,student_id,attendance_date,status,marked_by)
  values(v_student.school_id,v_student.id,current_date,'present',auth.uid())
  on conflict (student_id,attendance_date) do nothing
  returning true into v_inserted;

  select a.* into v_existing from public.attendance a
   where a.student_id=v_student.id and a.attendance_date=current_date;
  return query select v_student.student_name,v_student.class_name,v_student.section,current_date,v_existing.status,not coalesce(v_inserted,false);
end;
$$;