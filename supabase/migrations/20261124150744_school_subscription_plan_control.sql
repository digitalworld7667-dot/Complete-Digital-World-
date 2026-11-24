-- School chooses a subscription only after approval; Super Admin controls plan rates and discounts.
alter table public.school_requests alter column selected_plan drop not null;
alter table public.school_requests alter column selected_plan drop default;
alter table public.school_subscriptions alter column plan drop not null;
alter table public.school_subscriptions alter column price_per_student set default 0;

alter table public.school_subscriptions
  add column if not exists list_price_per_student numeric(10,2) not null default 0,
  add column if not exists discount_type text,
  add column if not exists discount_value numeric(10,2) not null default 0,
  add column if not exists offer_label text,
  add column if not exists offer_valid_until timestamptz,
  add column if not exists custom_price_per_student numeric(10,2),
  add column if not exists plan_selected_at timestamptz,
  add column if not exists updated_by uuid;

alter table public.school_subscriptions drop constraint if exists school_subscriptions_discount_type_check;
alter table public.school_subscriptions add constraint school_subscriptions_discount_type_check
 check (discount_type is null or discount_type in ('percent','fixed_per_student'));

create or replace function public.review_school_request_atomic(
 p_request_id uuid, p_decision text, p_reviewer_id uuid, p_rejection_reason text default null
) returns jsonb
language plpgsql security definer set search_path=''
as $function$
declare v_request public.school_requests%rowtype; v_school_id uuid:=null;
begin
 if p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected'; end if;
 if auth.uid() is null or auth.uid() <> p_reviewer_id then raise exception 'Authenticated reviewer mismatch'; end if;
 if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='super_admin' and p.account_status='active') then raise exception 'Active Super Admin access required'; end if;
 select * into v_request from public.school_requests where id=p_request_id for update;
 if not found then raise exception 'School request not found'; end if;
 if v_request.status<>'pending' then raise exception 'Request has already been reviewed'; end if;
 if p_decision='approved' then
  insert into public.schools(name,school_code,city,address,phone,contact_email,approval_status,alternate_phone,website,state,district,pincode,school_type,board,affiliation_number,classes_offered,instruction_medium,academic_session,estimated_students,estimated_teachers,branches_count,logo_url,document_urls)
  values(v_request.school_name,v_request.school_code,v_request.city,v_request.address,v_request.phone,v_request.contact_email,'approved',v_request.alternate_phone,v_request.website,v_request.state,v_request.district,v_request.pincode,v_request.school_type,v_request.board,v_request.affiliation_number,v_request.classes_offered,v_request.instruction_medium,v_request.academic_session,v_request.estimated_students,v_request.estimated_teachers,v_request.branches_count,v_request.logo_url,v_request.document_urls)
  returning id into v_school_id;
  insert into public.school_subscriptions(school_id,plan,student_count,price_per_student,list_price_per_student,minimum_monthly_fee,monthly_amount,status,trial_started_at,trial_ends_at,plan_selected_at)
  values(v_school_id,null,0,0,0,0,0,'trialing',now(),now()+interval '7 days',null);
 end if;
 update public.school_requests set status=p_decision,reviewed_by=p_reviewer_id,reviewed_at=now(),
  rejection_reason=case when p_decision='rejected' then left(coalesce(p_rejection_reason,''),1000) else null end
 where id=p_request_id;
 insert into public.activity_logs(school_id,actor_profile_id,action,entity_table,entity_id,old_data,new_data)
 values(v_school_id,p_reviewer_id,'SCHOOL_REQUEST_'||upper(p_decision),'school_requests',p_request_id::text,
  jsonb_build_object('status','pending'),jsonb_build_object('status',p_decision,'school_id',v_school_id,'selected_plan',null));
 return jsonb_build_object('success',true,'request_id',p_request_id,'status',p_decision,'school_id',v_school_id);
end; $function$;

create or replace function public.school_select_subscription_plan(p_plan text)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_sub public.school_subscriptions%rowtype; v_rate numeric(10,2);
begin
 if auth.uid() is null then raise exception 'Login required'; end if;
 if p_plan not in ('basic','advanced','premium') then raise exception 'Invalid plan'; end if;
 select * into v_sub from public.school_subscriptions s
 where s.school_id=(select p.school_id from public.profiles p where p.id=auth.uid() and p.role='school_admin' and p.account_status='active')
 for update;
 if not found then raise exception 'School subscription not found'; end if;
 v_rate:=case p_plan when 'basic' then 30 when 'advanced' then 40 else 50 end;
 update public.school_subscriptions set plan=p_plan,list_price_per_student=v_rate,
   price_per_student=v_rate,discount_type=null,discount_value=0,offer_label=null,offer_valid_until=null,
   custom_price_per_student=null,monthly_amount=student_count*v_rate,plan_selected_at=coalesce(plan_selected_at,now()),
   updated_at=now(),updated_by=auth.uid()
 where id=v_sub.id;
 insert into public.activity_logs(school_id,actor_profile_id,action,entity_table,entity_id,new_data)
 values(v_sub.school_id,auth.uid(),'SCHOOL_SUBSCRIPTION_PLAN_SELECTED','school_subscriptions',v_sub.id::text,
 jsonb_build_object('plan',p_plan,'price_per_student',v_rate));
 return jsonb_build_object('success',true,'plan',p_plan,'price_per_student',v_rate,'monthly_amount',v_sub.student_count*v_rate);
end; $function$;

create or replace function public.super_admin_manage_subscription(
 p_school_id uuid, p_plan text, p_discount_type text default null,
 p_discount_value numeric default 0, p_offer_label text default null,
 p_offer_valid_until timestamptz default null, p_custom_price_per_student numeric default null
) returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_sub public.school_subscriptions%rowtype; v_base numeric(10,2); v_final numeric(10,2);
begin
 if auth.uid() is null or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='super_admin' and p.account_status='active') then
  raise exception 'Active Super Admin access required';
 end if;
 if p_plan not in ('basic','advanced','premium') then raise exception 'Invalid plan'; end if;
 if p_discount_type is not null and p_discount_type not in ('percent','fixed_per_student') then raise exception 'Invalid discount type'; end if;
 if coalesce(p_discount_value,0)<0 or (p_discount_type='percent' and p_discount_value>100) then raise exception 'Invalid discount value'; end if;
 if p_custom_price_per_student is not null and p_custom_price_per_student<0 then raise exception 'Custom price cannot be negative'; end if;
 select * into v_sub from public.school_subscriptions where school_id=p_school_id for update;
 if not found then raise exception 'School subscription not found'; end if;
 v_base:=case p_plan when 'basic' then 30 when 'advanced' then 40 else 50 end;
 v_final:=coalesce(p_custom_price_per_student,
   case p_discount_type when 'percent' then v_base-(v_base*coalesce(p_discount_value,0)/100)
   when 'fixed_per_student' then greatest(0,v_base-coalesce(p_discount_value,0))
   else v_base end);
 update public.school_subscriptions set plan=p_plan,list_price_per_student=v_base,price_per_student=v_final,
  discount_type=p_discount_type,discount_value=coalesce(p_discount_value,0),
  offer_label=nullif(left(coalesce(p_offer_label,''),120),''),offer_valid_until=null,
  custom_price_per_student=p_custom_price_per_student,monthly_amount=student_count*v_final,
  plan_selected_at=coalesce(plan_selected_at,now()),updated_at=now(),updated_by=auth.uid()
 where id=v_sub.id;
 insert into public.activity_logs(school_id,actor_profile_id,action,entity_table,entity_id,old_data,new_data)
 values(p_school_id,auth.uid(),'SUPER_ADMIN_SUBSCRIPTION_CONTROL','school_subscriptions',v_sub.id::text,
 jsonb_build_object('plan',v_sub.plan,'price_per_student',v_sub.price_per_student),
 jsonb_build_object('plan',p_plan,'list_price_per_student',v_base,'price_per_student',v_final,
 'discount_type',p_discount_type,'discount_value',p_discount_value,'offer_label',p_offer_label,
 'custom_price_per_student',p_custom_price_per_student));
 return jsonb_build_object('success',true,'plan',p_plan,'list_price_per_student',v_base,
 'price_per_student',v_final,'student_count',v_sub.student_count,'monthly_amount',v_sub.student_count*v_final);
end; $function$;

revoke all on function public.school_select_subscription_plan(text) from public, anon;
grant execute on function public.school_select_subscription_plan(text) to authenticated;
revoke all on function public.super_admin_manage_subscription(uuid,text,text,numeric,text,timestamptz,numeric) from public, anon;
grant execute on function public.super_admin_manage_subscription(uuid,text,text,numeric,text,timestamptz,numeric) to authenticated;
