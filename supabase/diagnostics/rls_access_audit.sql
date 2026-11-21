-- READ-ONLY diagnostics for Complete Digital World Supabase project.
-- Run in Supabase SQL Editor after migrations. This script does not change data or permissions.

-- 1) All public tables: RLS enabled/forced state.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','p')
order by c.relname;

-- 2) Every policy in public schema, including command, roles, USING and WITH CHECK.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3) Direct table privileges for browser roles.
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;

-- 4) Security-definer functions exposed to browser roles.
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by p.proname;

-- 5) Required project tables missing RLS. Add/remove names only if your approved schema differs.
with required(table_name) as (
  values ('profiles'),('schools'),('students'),('teachers'),('parents'),('buses'),
         ('attendance'),('teacher_attendance'),('marks'),('fees'),('fee_payments'),
         ('homework'),('homework_submissions'),('notices'),('timetable_entries'),
         ('school_events'),('bus_locations'),('bus_logs'),('support_tickets'),
         ('teacher_class_assignments'),('school_requests'),('school_settings'),
         ('activity_logs'),('login_account_security'),('login_ip_security'),
         ('school_request_rate_limits'),('support_ticket_rate_limits')
)
select r.table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from required r left join pg_class c on c.relname = r.table_name
  and c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p')
where c.oid is null or not c.relrowsecurity
order by r.table_name;
