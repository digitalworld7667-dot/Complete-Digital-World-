-- Platform-level UPI instructions for schools paying MS Digital Tech subscriptions.
create table if not exists public.platform_payment_settings (
  singleton_id integer primary key default 1 check (singleton_id = 1),
  enabled boolean not null default false,
  upi_vpa text,
  payee_name text,
  qr_image_data text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint platform_payment_qr_size check (qr_image_data is null or length(qr_image_data) <= 1500000)
);
alter table public.platform_payment_settings enable row level security;
drop policy if exists "Authenticated users can read platform payment instructions" on public.platform_payment_settings;
create policy "Authenticated users can read platform payment instructions"
  on public.platform_payment_settings for select to authenticated using (true);
drop policy if exists "Only super admins manage platform payment instructions" on public.platform_payment_settings;
create policy "Only super admins manage platform payment instructions"
  on public.platform_payment_settings for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'super_admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'super_admin'));
revoke all on public.platform_payment_settings from anon;
grant select, insert, update on public.platform_payment_settings to authenticated;
