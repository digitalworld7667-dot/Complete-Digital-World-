create table if not exists public.staff_salary_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  staff_name text not null,
  staff_role text,
  salary_month date not null,
  basic_salary numeric(12,2) not null default 0 check (basic_salary >= 0),
  allowances numeric(12,2) not null default 0 check (allowances >= 0),
  deductions numeric(12,2) not null default 0 check (deductions >= 0),
  net_salary numeric(12,2) generated always as (greatest(basic_salary + allowances - deductions, 0)) stored,
  status text not null default 'pending' check (status in ('pending','approved','paid','cancelled')),
  payment_mode text not null default 'manual' check (payment_mode in ('manual','auto_pay')),
  payment_date timestamptz,
  transaction_reference text,
  payslip_number text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_salary_month_first_day check (extract(day from salary_month) = 1),
  constraint staff_salary_paid_fields check (status <> 'paid' or payment_date is not null)
);
create index if not exists staff_salary_records_school_month_idx
  on public.staff_salary_records (school_id, salary_month desc);
create index if not exists staff_salary_records_teacher_idx
  on public.staff_salary_records (teacher_id, salary_month desc);

create table if not exists public.school_salary_autopay_settings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null unique references public.schools(id) on delete cascade,
  enabled boolean not null default false,
  provider_name text,
  provider_account_reference text,
  authorization_reference text,
  authorized_at timestamptz,
  salary_payment_day integer not null default 1 check (salary_payment_day between 1 and 28),
  status text not null default 'not_configured' check (status in ('not_configured','pending_authorization','active','paused','revoked','failed')),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint salary_autopay_requires_authorization check (
    enabled = false or (status = 'active' and provider_name is not null
      and provider_account_reference is not null and authorization_reference is not null
      and authorized_at is not null)
  )
);

alter table public.staff_salary_records enable row level security;
alter table public.school_salary_autopay_settings enable row level security;

drop policy if exists staff_salary_records_school_admin_all on public.staff_salary_records;
create policy staff_salary_records_school_admin_all on public.staff_salary_records
  for all using (private.is_super_admin() or private.has_school_role(school_id, array['school_admin']::text[]))
  with check (private.is_super_admin() or private.has_school_role(school_id, array['school_admin']::text[]));

drop policy if exists staff_salary_records_teacher_read on public.staff_salary_records;
create policy staff_salary_records_teacher_read on public.staff_salary_records
  for select using (
    private.is_active_user() and teacher_id is not null and exists (
      select 1 from public.teachers t
      where t.id = staff_salary_records.teacher_id
        and t.profile_id = auth.uid()
        and t.school_id = staff_salary_records.school_id
    )
  );

drop policy if exists school_salary_autopay_admin_all on public.school_salary_autopay_settings;
create policy school_salary_autopay_admin_all on public.school_salary_autopay_settings
  for all using (private.is_super_admin() or private.has_school_role(school_id, array['school_admin']::text[]))
  with check (private.is_super_admin() or private.has_school_role(school_id, array['school_admin']::text[]));

comment on table public.staff_salary_records is
  'School-managed salary ledger for teachers and staff. Manual bank/UPI transfer is recorded here; auto-pay requires an external authorized provider integration.';
comment on table public.school_salary_autopay_settings is
  'Optional school salary auto-pay configuration. No bank credentials or payment execution are stored in this table.';
