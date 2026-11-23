-- Secure manual fee collection with server-generated receipt numbers.
create unique index if not exists fee_payments_school_receipt_uidx
  on public.fee_payments (school_id, receipt_number)
  where receipt_number is not null;

create or replace function public.record_fee_payment(
  p_fee_id uuid,
  p_amount_paid numeric,
  p_payment_method text,
  p_payment_date timestamptz default now(),
  p_transaction_reference text default null
)
returns table(payment_id uuid, receipt_number text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_fee public.fees%rowtype;
  v_actor uuid := auth.uid();
  v_receipt text;
  v_payment_id uuid;
  v_method text;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_fee_id is null then raise exception 'Select a fee record'; end if;
  if p_amount_paid is null or p_amount_paid <= 0 then raise exception 'Payment amount must be greater than zero'; end if;

  v_method := lower(btrim(coalesce(p_payment_method,'')));
  if v_method not in ('cash','upi','bank_transfer','cheque','card','demand_draft','other') then
    raise exception 'Unsupported payment method';
  end if;

  select * into v_fee from public.fees where id=p_fee_id for update;
  if not found then raise exception 'Fee record not found or access denied'; end if;

  if not (private.is_super_admin() or private.has_school_role(v_fee.school_id, array['school_admin']::text[])) then
    raise exception 'Only an authorized school administrator can record payments';
  end if;

  v_receipt := 'MSDT-' || to_char(coalesce(p_payment_date::date,current_date),'YYYY') || '-' ||
    upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));

  insert into public.fee_payments(
    school_id,fee_id,student_id,amount_paid,payment_method,
    transaction_reference,receipt_number,payment_date,received_by
  ) values (
    v_fee.school_id,v_fee.id,v_fee.student_id,p_amount_paid,v_method,
    nullif(btrim(p_transaction_reference),''),v_receipt,
    coalesce(p_payment_date,now()),v_actor
  )
  returning id into v_payment_id;

  return query select v_payment_id,v_receipt;
end;
$function$;

revoke all on function public.record_fee_payment(uuid,numeric,text,timestamptz,text) from public, anon;
grant execute on function public.record_fee_payment(uuid,numeric,text,timestamptz,text) to authenticated;
