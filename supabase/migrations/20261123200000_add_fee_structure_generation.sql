-- Idempotent class-wise fee generation from an active fee structure.
create unique index if not exists fees_structure_student_period_uidx
  on public.fees (school_id, student_id, fee_structure_id, period)
  where fee_structure_id is not null;

create or replace function public.generate_fees_from_structure(
  p_fee_structure_id uuid,
  p_period text,
  p_due_date date
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_structure public.fee_structures%rowtype;
  v_inserted integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_fee_structure_id is null or nullif(btrim(p_period), '') is null or p_due_date is null then
    raise exception 'Fee structure, period and due date are required';
  end if;

  select * into v_structure
  from public.fee_structures
  where id = p_fee_structure_id
  for share;

  if not found then
    raise exception 'Fee structure not found or access denied';
  end if;

  if not (private.is_super_admin() or private.has_school_role(v_structure.school_id, array['school_admin']::text[])) then
    raise exception 'Only School Admin or Super Admin can generate fees';
  end if;

  if not v_structure.is_active then
    raise exception 'Cannot generate fees from an inactive fee structure';
  end if;

  insert into public.fees (
    school_id, student_id, fee_type, period, amount, due_date,
    status, created_by, fee_structure_id, discount_amount, late_fee_amount
  )
  select
    v_structure.school_id,
    s.id,
    v_structure.fee_type,
    btrim(p_period),
    v_structure.amount,
    p_due_date,
    case when p_due_date < current_date then 'overdue' else 'pending' end,
    auth.uid(),
    v_structure.id,
    0,
    v_structure.late_fee_amount
  from public.students s
  where s.school_id = v_structure.school_id
    and s.class_name = v_structure.class_name
  on conflict (school_id, student_id, fee_structure_id, period)
    where fee_structure_id is not null
    do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$function$;

revoke all on function public.generate_fees_from_structure(uuid, text, date) from public, anon;
grant execute on function public.generate_fees_from_structure(uuid, text, date) to authenticated;
