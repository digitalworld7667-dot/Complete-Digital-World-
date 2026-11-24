-- Secure student QR attendance tokens and scan RPCs
create table if not exists public.student_attendance_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (school_id, student_id)
);
alter table public.student_attendance_qr_tokens enable row level security;
revoke all on public.student_attendance_qr_tokens from anon, authenticated;

create or replace function public.get_or_create_student_attendance_qr(p_student_id uuid)
returns table(student_id uuid, student_name text, class_name text, section text, token uuid)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_school_id uuid;
  v_class_name text;
  v_student_name text;
  v_section text;
  v_token uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select s.school_id,s.class_name,s.student_name,s.section
    into v_school_id,v_class_name,v_student_name,v_section
    from public.students s
   where s.id=p_student_id and s.student_status='active';
  if not found then raise exception 'Active student not found'; end if;
  if not (
    private.is_super_admin()
    or private.has_school_role(v_school_id, array['school_admin']::text[])
    or (private.has_school_role(v_school_id, array['teacher']::text[])
        and private.is_teacher_assigned_to_class(v_school_id,v_class_name))
  ) then raise exception 'Not authorized to create this student QR'; end if;

  insert into public.student_attendance_qr_tokens(school_id,student_id,created_by)
  values(v_school_id,p_student_id,auth.uid())
  on conflict (school_id,student_id) do update
    set revoked_at=null
    where public.student_attendance_qr_tokens.revoked_at is not null;

  select q.token into v_token
    from public.student_attendance_qr_tokens q
   where q.school_id=v_school_id and q.student_id=p_student_id and q.revoked_at is null;
  return query select p_student_id,v_student_name,v_class_name,v_section,v_token;
end;
$$;

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

  select a.* into v_existing from public.attendance a
   where a.student_id=v_student.id and a.attendance_date=current_date;
  if found then
    return query select v_student.student_name,v_student.class_name,v_student.section,current_date,v_existing.status,true;
    return;
  end if;

  insert into public.attendance(school_id,student_id,attendance_date,status,marked_by)
  values(v_student.school_id,v_student.id,current_date,'present',auth.uid())
  on conflict (student_id,attendance_date) do nothing;

  select a.* into v_existing from public.attendance a
   where a.student_id=v_student.id and a.attendance_date=current_date;
  v_inserted := v_existing.marked_by=auth.uid() and v_existing.status='present';
  return query select v_student.student_name,v_student.class_name,v_student.section,current_date,v_existing.status,not v_inserted;
end;
$$;

grant execute on function public.get_or_create_student_attendance_qr(uuid) to authenticated;
grant execute on function public.mark_attendance_by_student_qr(uuid) to authenticated;
