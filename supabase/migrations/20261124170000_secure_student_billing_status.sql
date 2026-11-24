-- Secure School Admin / Super Admin control for billable student status.
create or replace function public.set_student_billing_status(
  p_student_id uuid,
  p_status text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare v_school_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_status not in ('active','inactive','graduated','withdrawn') then
    raise exception 'Invalid student status';
  end if;
  select s.school_id into v_school_id from public.students s where s.id=p_student_id;
  if v_school_id is null then raise exception 'Student record not found'; end if;
  if not ((select private.is_super_admin())
    or (select private.has_school_role(v_school_id,array['school_admin']::text[]))) then
    raise exception 'Only an active School Admin of this school or Super Admin can change student billing status';
  end if;
  update public.students set student_status=p_status where id=p_student_id;
  return jsonb_build_object('success',true,'student_id',p_student_id,'student_status',p_status);
end;
$function$;
revoke all on function public.set_student_billing_status(uuid,text) from public, anon;
grant execute on function public.set_student_billing_status(uuid,text) to authenticated;
