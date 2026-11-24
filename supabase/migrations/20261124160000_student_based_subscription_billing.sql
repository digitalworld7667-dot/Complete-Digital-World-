-- Student-based school subscription billing: remove the ₹1,500 floor.
-- A student is billable only while student_status = 'active'.

alter table public.school_subscriptions
  drop constraint if exists school_subscriptions_minimum_monthly_fee_check,
  drop constraint if exists school_subscriptions_monthly_amount_check;

alter table public.school_subscription_payments
  drop constraint if exists school_subscription_payments_amount_check;

alter table public.school_subscriptions
  alter column minimum_monthly_fee set default 0;

update public.school_subscriptions
set minimum_monthly_fee = 0,
    monthly_amount = student_count * price_per_student,
    updated_at = now();

alter table public.school_subscriptions
  add constraint school_subscriptions_minimum_monthly_fee_nonnegative check (minimum_monthly_fee >= 0),
  add constraint school_subscriptions_monthly_amount_nonnegative check (monthly_amount >= 0);

alter table public.school_subscription_payments
  add constraint school_subscription_payments_amount_positive check (amount > 0);

alter table public.students
  add column if not exists student_status text not null default 'active';

alter table public.students drop constraint if exists students_student_status_check;
alter table public.students
  add constraint students_student_status_check
  check (student_status in ('active','inactive','graduated','withdrawn'));

create index if not exists students_school_status_idx
  on public.students (school_id, student_status);

create or replace function public.refresh_school_subscription_amount(p_school_id uuid)
returns void language plpgsql security definer set search_path = ''
as $function$
declare v_count integer;
begin
  select count(*)::integer into v_count
  from public.students
  where school_id = p_school_id and student_status = 'active';

  update public.school_subscriptions
  set student_count = v_count,
      monthly_amount = v_count * price_per_student,
      minimum_monthly_fee = 0,
      updated_at = now()
  where school_id = p_school_id;
end;
$function$;

revoke all on function public.refresh_school_subscription_amount(uuid) from public, anon, authenticated;
grant execute on function public.refresh_school_subscription_amount(uuid) to service_role;

create or replace function public.sync_school_subscription_student_count()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_school_subscription_amount(old.school_id);
    return old;
  end if;
  perform public.refresh_school_subscription_amount(new.school_id);
  if tg_op = 'UPDATE' and old.school_id is distinct from new.school_id then
    perform public.refresh_school_subscription_amount(old.school_id);
  end if;
  return new;
end;
$function$;

revoke all on function public.sync_school_subscription_student_count() from public, anon, authenticated;

drop trigger if exists sync_school_subscription_student_count on public.students;
create trigger sync_school_subscription_student_count
after insert or update of school_id, student_status or delete
on public.students for each row
execute function public.sync_school_subscription_student_count();

create or replace function public.sync_new_school_subscription_student_count()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  perform public.refresh_school_subscription_amount(new.school_id);
  return new;
end;
$function$;

revoke all on function public.sync_new_school_subscription_student_count() from public, anon, authenticated;

drop trigger if exists sync_new_school_subscription_student_count on public.school_subscriptions;
create trigger sync_new_school_subscription_student_count
after insert or update of price_per_student, plan
on public.school_subscriptions for each row
execute function public.sync_new_school_subscription_student_count();

do $block$
declare r record;
begin
  for r in select school_id from public.school_subscriptions loop
    perform public.refresh_school_subscription_amount(r.school_id);
  end loop;
end;
$block$;
