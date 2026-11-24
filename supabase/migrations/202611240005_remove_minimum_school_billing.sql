-- Remove the compulsory ₹1,500 minimum from MS Digital Tech school subscriptions.
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
  add constraint school_subscriptions_minimum_monthly_fee_check
    check (minimum_monthly_fee = 0),
  add constraint school_subscriptions_monthly_amount_check
    check (monthly_amount >= 0);

alter table public.school_subscription_payments
  add constraint school_subscription_payments_amount_check
    check (amount > 0);

create or replace function public.review_school_request_atomic(
  p_request_id uuid, p_decision text, p_reviewer_id uuid, p_rejection_reason text default null
) returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_request public.school_requests%rowtype; v_school_id uuid := null;
  v_price numeric(10,2); v_students integer; v_amount numeric(12,2);
begin
  if p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected'; end if;
  if not exists (select 1 from public.profiles p where p.id=p_reviewer_id and p.role='super_admin' and p.account_status='active') then
    raise exception 'Active Super Admin access required';
  end if;
  select * into v_request from public.school_requests where id=p_request_id for update;
  if not found then raise exception 'School request not found'; end if;
  if v_request.status <> 'pending' then raise exception 'Request has already been reviewed'; end if;
  if p_decision='approved' then
    insert into public.schools(name,school_code,city,address,phone,contact_email,approval_status,alternate_phone,website,state,district,pincode,school_type,board,affiliation_number,classes_offered,instruction_medium,academic_session,estimated_students,estimated_teachers,branches_count,logo_url,document_urls)
    values(v_request.school_name,v_request.school_code,v_request.city,v_request.address,v_request.phone,v_request.contact_email,'approved',v_request.alternate_phone,v_request.website,v_request.state,v_request.district,v_request.pincode,v_request.school_type,v_request.board,v_request.affiliation_number,v_request.classes_offered,v_request.instruction_medium,v_request.academic_session,v_request.estimated_students,v_request.estimated_teachers,v_request.branches_count,v_request.logo_url,v_request.document_urls)
    returning id into v_school_id;
    v_price := case v_request.selected_plan when 'advanced' then 40 when 'premium' then 50 else 30 end;
    v_students := greatest(coalesce(v_request.estimated_students,0),0);
    v_amount := v_students * v_price;
    insert into public.school_subscriptions(school_id,plan,student_count,price_per_student,minimum_monthly_fee,monthly_amount,status,trial_started_at,trial_ends_at)
    values(v_school_id,coalesce(v_request.selected_plan,'basic'),v_students,v_price,0,v_amount,'trialing',now(),now()+interval '7 days');
  end if;
  update public.school_requests set status=p_decision, reviewed_by=p_reviewer_id, reviewed_at=now(),
    rejection_reason=case when p_decision='rejected' then left(coalesce(p_rejection_reason,''),1000) else null end
  where id=p_request_id;
  insert into public.activity_logs(school_id,actor_profile_id,action,entity_table,entity_id,old_data,new_data)
  values(v_school_id,p_reviewer_id,'SCHOOL_REQUEST_'||upper(p_decision),'school_requests',p_request_id::text,
    jsonb_build_object('status','pending'),jsonb_build_object('status',p_decision,'school_id',v_school_id,'selected_plan',v_request.selected_plan));
  return jsonb_build_object('success',true,'request_id',p_request_id,'status',p_decision,'school_id',v_school_id);
end; $function$;
