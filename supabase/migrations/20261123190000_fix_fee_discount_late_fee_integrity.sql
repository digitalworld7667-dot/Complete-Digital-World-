-- Keep fee payment validation and status calculations consistent with discounts and late fees.
-- Payable amount = base amount - discount + late fee.

alter table public.fees
  add constraint fees_discount_not_above_amount_check
  check (discount_amount <= amount) not valid;

alter table public.fees
  validate constraint fees_discount_not_above_amount_check;

create or replace function public.validate_fee_payment_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_fee public.fees%rowtype;
  v_existing_paid numeric := 0;
  v_old_payment_id uuid := null;
  v_payable numeric := 0;
begin
  if new.amount_paid is null or new.amount_paid <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;
  if tg_op = 'UPDATE' then v_old_payment_id := old.id; end if;

  select * into v_fee from public.fees where id = new.fee_id for update;
  if not found then raise exception 'Fee record not found'; end if;
  if v_fee.student_id <> new.student_id or v_fee.school_id <> new.school_id then
    raise exception 'Payment student and school must match the selected fee';
  end if;
  if v_fee.status = 'waived' then raise exception 'A waived fee cannot receive a payment'; end if;

  v_payable := greatest(v_fee.amount - v_fee.discount_amount, 0) + v_fee.late_fee_amount;
  select coalesce(sum(p.amount_paid), 0) into v_existing_paid
  from public.fee_payments p
  where p.fee_id = new.fee_id and p.id is distinct from v_old_payment_id;

  if v_existing_paid + new.amount_paid > v_payable then
    raise exception 'Payment exceeds the remaining fee balance';
  end if;
  return new;
end;
$function$;

create or replace function public.recalculate_fee_status_from_payments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_fee_id uuid;
  v_fee_ids uuid[];
  v_amount numeric;
  v_discount numeric;
  v_late_fee numeric;
  v_payable numeric;
  v_paid numeric;
  v_due date;
  v_status text;
begin
  if tg_op = 'INSERT' then v_fee_ids := array[new.fee_id];
  elsif tg_op = 'DELETE' then v_fee_ids := array[old.fee_id];
  else v_fee_ids := array[new.fee_id, old.fee_id]; end if;

  foreach v_fee_id in array v_fee_ids loop
    select f.amount, f.discount_amount, f.late_fee_amount, f.due_date, f.status
      into v_amount, v_discount, v_late_fee, v_due, v_status
    from public.fees f where f.id = v_fee_id;

    if found and v_status <> 'waived' then
      v_payable := greatest(v_amount - v_discount, 0) + v_late_fee;
      select coalesce(sum(p.amount_paid), 0) into v_paid
      from public.fee_payments p where p.fee_id = v_fee_id;

      if v_paid >= v_payable then v_status := 'paid';
      elsif v_paid > 0 then v_status := 'partial';
      elsif v_due is not null and v_due < current_date then v_status := 'overdue';
      else v_status := 'pending'; end if;

      update public.fees set status = v_status, updated_at = now() where id = v_fee_id;
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$function$;

create or replace function public.guard_fee_amount_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_paid numeric := 0;
  v_new_payable numeric := 0;
begin
  if new.discount_amount > new.amount then
    raise exception 'Discount cannot exceed the base fee amount';
  end if;
  v_new_payable := greatest(new.amount - new.discount_amount, 0) + new.late_fee_amount;
  select coalesce(sum(p.amount_paid), 0) into v_paid
  from public.fee_payments p where p.fee_id = new.id;
  if v_paid > v_new_payable then
    raise exception 'Updated fee amount cannot be lower than payments already collected';
  end if;
  return new;
end;
$function$;

create or replace function public.recalculate_fee_status_after_fee_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_payable numeric;
  v_paid numeric := 0;
  v_status text;
begin
  if new.status = 'waived' then return new; end if;
  v_payable := greatest(new.amount - new.discount_amount, 0) + new.late_fee_amount;
  select coalesce(sum(p.amount_paid), 0) into v_paid
  from public.fee_payments p where p.fee_id = new.id;

  if v_paid >= v_payable then v_status := 'paid';
  elsif v_paid > 0 then v_status := 'partial';
  elsif new.due_date is not null and new.due_date < current_date then v_status := 'overdue';
  else v_status := 'pending'; end if;

  update public.fees set status = v_status, updated_at = now() where id = new.id;
  return new;
end;
$function$;

drop trigger if exists guard_fee_amount_change on public.fees;
create trigger guard_fee_amount_change
before update of amount, discount_amount, late_fee_amount
on public.fees for each row execute function public.guard_fee_amount_change();

drop trigger if exists recalculate_fee_status_after_fee_change on public.fees;
create trigger recalculate_fee_status_after_fee_change
after update of amount, discount_amount, late_fee_amount, due_date
on public.fees for each row execute function public.recalculate_fee_status_after_fee_change();

revoke all on function public.validate_fee_payment_integrity() from public, anon, authenticated;
revoke all on function public.recalculate_fee_status_from_payments() from public, anon, authenticated;
revoke all on function public.guard_fee_amount_change() from public, anon, authenticated;
revoke all on function public.recalculate_fee_status_after_fee_change() from public, anon, authenticated;
