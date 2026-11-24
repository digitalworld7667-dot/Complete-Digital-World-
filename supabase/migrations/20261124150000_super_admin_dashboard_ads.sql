create table if not exists public.super_admin_dashboard_ads (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 120),
  advertiser_name text not null check (char_length(btrim(advertiser_name)) between 2 and 120),
  image_url text not null check (image_url ~ '^https?://'),
  target_url text not null check (target_url ~ '^https?://'),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dashboard_ads_valid_schedule check (ends_at is null or starts_at is null or ends_at > starts_at)
);
alter table public.super_admin_dashboard_ads enable row level security;
revoke all on public.super_admin_dashboard_ads from anon, authenticated;
grant select, insert, update, delete on public.super_admin_dashboard_ads to authenticated;
create policy "super admins manage dashboard ads"
on public.super_admin_dashboard_ads for all to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin' and p.account_status='active'))
with check (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='super_admin' and p.account_status='active'));
