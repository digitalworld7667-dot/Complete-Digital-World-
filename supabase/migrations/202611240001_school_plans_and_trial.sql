-- MS Digital Tech school plans, seven-day trial, and manual subscription payments
alter table public.school_requests
  add column if not exists selected_plan text not null default 'basic'
  check (selected_plan in ('basic','advanced','premium'));

create table if not exists public.school_subscriptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null unique references public.schools(id) on delete cascade,
  plan text not null check (plan in ('basic','advanced','premium')),
  student_count integer not null default 0 check (student_count >= 0),
  price_per_student numeric(10,2) not null check (price_per_student in (30,40,50)),
  minimum_monthly_fee numeric(10,2) not null default 1500 check (minimum_monthly_fee = 1500),
  monthly_amount numeric(12,2) not null check (monthly_amount >= 1500),
  status text not null default 'trialing' check (status in ('trialing','active','expired','suspended')),
  trial_started_at timestamptz not null,
  trial_ends_at timestamptz not null,
  paid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_subscriptions_trial_window check (trial_ends_at > trial_started_at)
);

create table if not exists public.school_subscription_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.school_subscriptions(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 1500),
  payment_method text not null default 'upi' check (payment_method in ('upi','bank_transfer','cash')),
  transaction_reference text not null check (length(trim(transaction_reference)) between 6 and 160),
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  submitted_by uuid not null references auth.users(id),
  submitted_at timestamptz not null default now(),
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now()
);
create index if not exists school_subscription_payments_school_status_idx
  on public.school_subscription_payments (school_id, status, submitted_at desc);

alter table public.school_subscriptions enable row level security;
alter table public.school_subscription_payments enable row level security;
revoke all on public.school_subscriptions from anon, authenticated;
revoke all on public.school_subscription_payments from anon, authenticated;
grant select on public.school_subscriptions to authenticated;
grant select, insert on public.school_subscription_payments to authenticated;

drop policy if exists "School members read own subscription" on public.school_subscriptions;
create policy "School members read own subscription" on public.school_subscriptions
for select to authenticated using (
  (select private.is_super_admin()) or exists (
    select 1 from public.profiles p where p.id=(select auth.uid())
    and p.school_id=school_subscriptions.school_id
    and p.role in ('school_admin','teacher','parent','student','bus_driver')
    and coalesce(p.account_status,'active')='active'
  )
);
drop policy if exists "School admins read own subscription payments" on public.school_subscription_payments;
create policy "School admins read own subscription payments" on public.school_subscription_payments
for select to authenticated using (
  (select private.is_super_admin()) or exists (
    select 1 from public.profiles p where p.id=(select auth.uid())
    and p.school_id=school_subscription_payments.school_id
    and p.role='school_admin' and coalesce(p.account_status,'active')='active'
  )
);
drop policy if exists "School admins submit own subscription payments" on public.school_subscription_payments;
create policy "School admins submit own subscription payments" on public.school_subscription_payments
for insert to authenticated with check (
  submitted_by=(select auth.uid()) and status='pending'
  and verified_by is null and verified_at is null
  and exists (select 1 from public.profiles p where p.id=(select auth.uid())
    and p.school_id=school_subscription_payments.school_id and p.role='school_admin'
    and coalesce(p.account_status,'active')='active')
  and exists (select 1 from public.school_subscriptions s
    where s.id=school_subscription_payments.subscription_id and s.school_id=school_subscription_payments.school_id)
);

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
    v_amount := greatest(v_students * v_price,1500);
    insert into public.school_subscriptions(school_id,plan,student_count,price_per_student,monthly_amount,status,trial_started_at,trial_ends_at)
    values(v_school_id,coalesce(v_request.selected_plan,'basic'),v_students,v_price,v_amount,'trialing',now(),now()+interval '7 days');
  end if;
  update public.school_requests set status=p_decision, reviewed_by=p_reviewer_id, reviewed_at=now(),
    rejection_reason=case when p_decision='rejected' then left(coalesce(p_rejection_reason,''),1000) else null end
  where id=p_request_id;
  insert into public.activity_logs(school_id,actor_profile_id,action,entity_table,entity_id,old_data,new_data)
  values(v_school_id,p_reviewer_id,'SCHOOL_REQUEST_'||upper(p_decision),'school_requests',p_request_id::text,
    jsonb_build_object('status','pending'),jsonb_build_object('status',p_decision,'school_id',v_school_id,'selected_plan',v_request.selected_plan));
  return jsonb_build_object('success',true,'request_id',p_request_id,'status',p_decision,'school_id',v_school_id);
end; $function$;
