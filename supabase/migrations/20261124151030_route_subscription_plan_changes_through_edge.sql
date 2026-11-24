-- Subscription plan RPCs are service-role-only; authenticated clients use manage-school-subscription Edge Function.
drop function if exists public.school_select_subscription_plan(text);
create function public.school_select_subscription_plan(p_school_id uuid,p_actor_id uuid,p_plan text)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_sub public.school_subscriptions%rowtype; v_rate numeric(10,2);
begin
 if p_plan not in ('basic','advanced','premium') then raise exception 'Invalid plan'; end if;
 if not exists(select 1 from public.profiles p where p.id=p_actor_id and p.role='school_admin' and p.school_id=p_school_id and p.account_status='active') then
  raise exception 'Active School Admin access required for this school';
 end if;
 select * into v_sub from public.school_subscriptions where school_id=p_school_id for update;
 if not found then raise exception 'School subscription not found'; end if;
 v_rate:=case p_plan when 'basic' then 30 when 'advanced' then 40 else 50 end;
 update public.school_subscriptions set plan=p_plan,list_price_per_student=v_rate,
   price_per_student=v_rate,discount_type=null,discount_value=0,offer_label=null,offer_valid_until=null,
   custom_price_per_student=null,monthly_amount=student_count*v_rate,plan_selected_at=coalesce(plan_selected_at,now()),
   updated_at=now(),updated_by=p_actor_id where id=v_sub.id;
 insert into public.activity_logs(school_id,actor_profile_id,action,entity_table,entity_id,new_data)
 values(v_sub.school_id,p_actor_id,'SCHOOL_SUBSCRIPTION_PLAN_SELECTED','school_subscriptions',v_sub.id::text,
 jsonb_build_object('plan',p_plan,'price_per_student',v_rate));
 return jsonb_build_object('success',true,'plan',p_plan,'price_per_student',v_rate,'monthly_amount',v_sub.student_count*v_rate);
end; $function$;

drop function if exists public.super_admin_manage_subscription(uuid,text,text,numeric,text,timestamptz,numeric);
create function public.super_admin_manage_subscription(
 p_actor_id uuid,p_school_id uuid,p_plan text,p_discount_type text default null,
 p_discount_value numeric default 0,p_offer_label text default null,
 p_custom_price_per_student numeric default null
) returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_sub public.school_subscriptions%rowtype; v_base numeric(10,2); v_final numeric(10,2);
begin
 if not exists(select 1 from public.profiles p where p.id=p_actor_id and p.role='super_admin' and p.account_status='active') then
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
  plan_selected_at=coalesce(plan_selected_at,now()),updated_at=now(),updated_by=p_actor_id where id=v_sub.id;
 insert into public.activity_logs(school_id,actor_profile_id,action,entity_table,entity_id,old_data,new_data)
 values(p_school_id,p_actor_id,'SUPER_ADMIN_SUBSCRIPTION_CONTROL','school_subscriptions',v_sub.id::text,
 jsonb_build_object('plan',v_sub.plan,'price_per_student',v_sub.price_per_student),
 jsonb_build_object('plan',p_plan,'list_price_per_student',v_base,'price_per_student',v_final,
 'discount_type',p_discount_type,'discount_value',p_discount_value,'offer_label',p_offer_label,
 'custom_price_per_student',p_custom_price_per_student));
 return jsonb_build_object('success',true,'plan',p_plan,'list_price_per_student',v_base,
 'price_per_student',v_final,'student_count',v_sub.student_count,'monthly_amount',v_sub.student_count*v_final);
end; $function$;

revoke all on function public.school_select_subscription_plan(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.school_select_subscription_plan(uuid,uuid,text) to service_role;
revoke all on function public.super_admin_manage_subscription(uuid,uuid,text,text,numeric,text,numeric) from public, anon, authenticated;
grant execute on function public.super_admin_manage_subscription(uuid,uuid,text,text,numeric,text,numeric) to service_role;
