-- Enforce paid/trial subscription validity through shared RLS helpers.
-- Keep login and the School Admin subscription/payment screen available after expiry.
create or replace function private.is_school_subscription_current(p_school_id uuid)
returns boolean language sql stable security definer set search_path=''
as $function$
  select exists(select 1 from public.school_subscriptions s where s.school_id=p_school_id
    and ((s.status='trialing' and s.trial_ends_at>now()) or (s.status='active' and s.paid_until>now())));
$function$;
revoke all on function private.is_school_subscription_current(uuid) from public,anon,authenticated;

create or replace function private.has_school_role(p_school_id uuid,p_roles text[])
returns boolean language sql stable security definer set search_path=''
as $function$
  select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.school_id=p_school_id
    and p.role=any(p_roles) and p.account_status='active' and private.is_school_subscription_current(p_school_id));
$function$;

create or replace function private.is_school_member(p_school_id uuid)
returns boolean language sql stable security definer set search_path=''
as $function$
  select private.is_super_admin() or exists(select 1 from public.profiles p where p.id=(select auth.uid())
    and p.school_id=p_school_id and p.account_status='active' and private.is_school_subscription_current(p_school_id));
$function$;

create or replace function private.is_student_self(p_student_id uuid)
returns boolean language sql stable security definer set search_path=''
as $function$
  select exists(select 1 from public.students s join public.profiles p on p.id=s.profile_id
    where s.id=p_student_id and p.id=(select auth.uid()) and p.school_id=s.school_id
    and p.account_status='active' and private.is_school_subscription_current(s.school_id));
$function$;

create or replace function private.is_parent_of_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path=''
as $function$
  select exists(select 1 from public.parents pa join public.students s on s.id=pa.student_id
    join public.profiles p on p.id=pa.profile_id where pa.student_id=p_student_id and p.id=(select auth.uid())
    and p.school_id=s.school_id and p.account_status='active' and private.is_school_subscription_current(s.school_id));
$function$;

create or replace function private.is_assigned_bus_driver(p_bus_id uuid)
returns boolean language sql stable security definer set search_path=''
as $function$
  select exists(select 1 from public.buses b join public.profiles p on p.id=b.driver_profile_id
    where b.id=p_bus_id and p.id=(select auth.uid()) and p.school_id=b.school_id
    and p.account_status='active' and private.is_school_subscription_current(b.school_id));
$function$;

create or replace function private.is_teacher_assigned_to_class(p_school_id uuid,p_class_name text)
returns boolean language sql stable security definer set search_path=''
as $function$
  select exists(select 1 from public.teacher_class_assignments a join public.teachers t on t.id=a.teacher_id
    join public.profiles p on p.id=t.profile_id where a.school_id=p_school_id and a.class_name=p_class_name
    and p.id=(select auth.uid()) and t.school_id=a.school_id and p.school_id=a.school_id
    and p.account_status='active' and private.is_school_subscription_current(a.school_id));
$function$;
