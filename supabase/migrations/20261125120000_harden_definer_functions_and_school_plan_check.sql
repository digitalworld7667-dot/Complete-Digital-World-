-- Security hardening for school plan entitlement checks and SECURITY DEFINER RPCs.
-- Keep authenticated access for app RPCs; each function performs its own role/school checks.

create or replace function public.school_plan_allows(p_school_id uuid, p_required_plan text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_plan text;
  v_status text;
  v_trial timestamptz;
  v_paid timestamptz;
  v_level integer;
  v_required integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  if private.is_super_admin() then
    return true;
  end if;

  if not exists (
    select 1
      from public.profiles p
     where p.id = (select auth.uid())
       and p.school_id = p_school_id
       and p.account_status = 'active'
  ) then
    return false;
  end if;

  if p_required_plan not in ('basic','advanced','premium') then
    return false;
  end if;

  select s.plan, s.status, s.trial_ends_at, s.paid_until
    into v_plan, v_status, v_trial, v_paid
    from public.school_subscriptions s
   where s.school_id = p_school_id;

  if not found then
    return false;
  end if;

  if not (
    (v_status = 'trialing' and v_trial > now())
    or (v_paid is not null and v_paid > now())
    or v_status = 'active'
  ) then
    return false;
  end if;

  v_level := case v_plan
    when 'premium' then 3
    when 'advanced' then 2
    when 'basic' then 1
    else 0
  end;
  v_required := case p_required_plan
    when 'premium' then 3
    when 'advanced' then 2
    else 1
  end;

  return v_level >= v_required;
end;
$function$;

revoke all on function public.school_plan_allows(uuid, text) from public, anon;
grant execute on function public.school_plan_allows(uuid, text) to authenticated, service_role;

-- Harden name resolution for SECURITY DEFINER functions without changing their app-facing permissions.
alter function public.get_or_create_student_attendance_qr(uuid) set search_path = '';
alter function public.get_visible_bus_live_locations() set search_path = '';
alter function public.mark_attendance_by_student_qr(uuid) set search_path = '';
alter function public.record_fee_payment(uuid,numeric,text,timestamptz,text) set search_path = '';
alter function public.record_my_bus_location(double precision,double precision) set search_path = '';
