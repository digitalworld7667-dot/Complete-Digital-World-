-- Atomic Super Admin verification for school subscription payments.
create or replace function public.review_school_subscription_payment(
  p_payment_id uuid,
  p_decision text,
  p_reviewer_id uuid,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_payment public.school_subscription_payments%rowtype;
  v_subscription public.school_subscriptions%rowtype;
  v_paid_until timestamptz;
begin
  if p_decision not in ('verify','reject') then
    raise exception 'Decision must be verify or reject';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id=p_reviewer_id and p.role='super_admin' and p.account_status='active'
  ) then raise exception 'Active Super Admin access required'; end if;

  select * into v_payment from public.school_subscription_payments
  where id=p_payment_id for update;
  if not found then raise exception 'Payment reference not found'; end if;
  if v_payment.status <> 'pending' then raise exception 'Payment reference has already been reviewed'; end if;

  select * into v_subscription from public.school_subscriptions
  where id=v_payment.subscription_id and school_id=v_payment.school_id for update;
  if not found then raise exception 'School subscription not found'; end if;

  if p_decision='verify' then
    if v_payment.amount < v_subscription.monthly_amount then
      raise exception 'Submitted amount is below the current monthly subscription amount';
    end if;
    v_paid_until := greatest(coalesce(v_subscription.paid_until,now()),now()) + interval '1 month';
    update public.school_subscription_payments
      set status='verified', verified_by=p_reviewer_id, verified_at=now(), admin_note=nullif(left(coalesce(p_note,''),1000),'')
      where id=p_payment_id;
    update public.school_subscriptions
      set status='active', paid_until=v_paid_until, updated_at=now()
      where id=v_subscription.id;
    insert into public.activity_logs(school_id,actor_profile_id,action,entity_table,entity_id,new_data)
      values(v_payment.school_id,p_reviewer_id,'SCHOOL_SUBSCRIPTION_PAYMENT_VERIFIED','school_subscription_payments',p_payment_id::text,
      jsonb_build_object('amount',v_payment.amount,'paid_until',v_paid_until));
    return jsonb_build_object('success',true,'payment_id',p_payment_id,'status','verified','paid_until',v_paid_until);
  else
    update public.school_subscription_payments
      set status='rejected', verified_by=p_reviewer_id, verified_at=now(), admin_note=nullif(left(coalesce(p_note,''),1000),'')
      where id=p_payment_id;
    insert into public.activity_logs(school_id,actor_profile_id,action,entity_table,entity_id,new_data)
      values(v_payment.school_id,p_reviewer_id,'SCHOOL_SUBSCRIPTION_PAYMENT_REJECTED','school_subscription_payments',p_payment_id::text,
      jsonb_build_object('amount',v_payment.amount,'note',left(coalesce(p_note,''),1000)));
    return jsonb_build_object('success',true,'payment_id',p_payment_id,'status','rejected');
  end if;
end;
$function$;

revoke all on function public.review_school_subscription_payment(uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.review_school_subscription_payment(uuid,text,uuid,text) to service_role;
