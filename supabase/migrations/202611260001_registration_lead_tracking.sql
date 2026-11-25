create table if not exists public.registration_leads (
 id uuid primary key default gen_random_uuid(), session_id uuid not null unique,
 institution_type text not null default 'unknown', visitor_name text, contact_email text, phone text,
 current_step text not null default 'registration_opened',
 status text not null default 'started' check(status in ('started','in_progress','issue','submitted')),
 contact_status text not null default 'new' check(contact_status in ('new','contacted','resolved','not_needed')),
 last_seen_at timestamptz not null default now(), submitted_request_id uuid, last_error text, ip_hash text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists registration_leads_last_seen_idx on public.registration_leads(last_seen_at desc);
alter table public.registration_leads enable row level security;
revoke all on public.registration_leads from anon,authenticated,public;
grant select on public.registration_leads to authenticated;
grant update(contact_status) on public.registration_leads to authenticated;
drop policy if exists "Super admins view registration leads" on public.registration_leads;
create policy "Super admins view registration leads" on public.registration_leads for select to authenticated
using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='super_admin' and coalesce(p.account_status,'active')='active'));
drop policy if exists "Super admins update registration lead support status" on public.registration_leads;
create policy "Super admins update registration lead support status" on public.registration_leads for update to authenticated
using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='super_admin' and coalesce(p.account_status,'active')='active'))
with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='super_admin' and coalesce(p.account_status,'active')='active'));
