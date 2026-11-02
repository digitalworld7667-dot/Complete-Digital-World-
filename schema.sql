-- Complete Digital World: SAFE additive migration for the audited live database.
-- Does NOT drop, rename, truncate, or modify existing tables/data.
-- Run only after reviewing in Supabase SQL Editor and taking a backup.

create table if not exists public.fee_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  fee_title text not null,
  fee_period text,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date,
  status text not null default 'pending' check (status in ('pending','partial','paid','waived')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  fee_record_id uuid not null references public.fee_records(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_date timestamptz not null default now(),
  payment_method text,
  reference_number text,
  received_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists fee_records_school_student_idx on public.fee_records(school_id, student_id);
create index if not exists fee_records_school_status_idx on public.fee_records(school_id, status);
create index if not exists fee_payments_fee_record_idx on public.fee_payments(fee_record_id);
create index if not exists fee_payments_school_student_idx on public.fee_payments(school_id, student_id);

alter table public.fee_records enable row level security;
alter table public.fee_payments enable row level security;

-- Conservative default: only school admins and super admins can read/write fees.
-- Parent/student fee visibility must be added only after verified parent-child and
-- profile-to-student relationships are mapped in the live schema.
drop policy if exists fee_records_admin_select on public.fee_records;
create policy fee_records_admin_select on public.fee_records
for select to authenticated
using (public.current_user_role() in ('school_admin','super_admin')
  and (public.current_user_role() = 'super_admin' or school_id = public.current_school_id()));

drop policy if exists fee_records_admin_insert on public.fee_records;
create policy fee_records_admin_insert on public.fee_records
for insert to authenticated
with check (public.current_user_role() in ('school_admin','super_admin')
  and (public.current_user_role() = 'super_admin' or school_id = public.current_school_id()));

drop policy if exists fee_records_admin_update on public.fee_records;
create policy fee_records_admin_update on public.fee_records
for update to authenticated
using (public.current_user_role() in ('school_admin','super_admin')
  and (public.current_user_role() = 'super_admin' or school_id = public.current_school_id()))
with check (public.current_user_role() in ('school_admin','super_admin')
  and (public.current_user_role() = 'super_admin' or school_id = public.current_school_id()));

drop policy if exists fee_records_admin_delete on public.fee_records;
create policy fee_records_admin_delete on public.fee_records
for delete to authenticated
using (public.current_user_role() in ('school_admin','super_admin')
  and (public.current_user_role() = 'super_admin' or school_id = public.current_school_id()));

drop policy if exists fee_payments_admin_select on public.fee_payments;
create policy fee_payments_admin_select on public.fee_payments
for select to authenticated
using (public.current_user_role() in ('school_admin','super_admin')
  and (public.current_user_role() = 'super_admin' or school_id = public.current_school_id()));

drop policy if exists fee_payments_admin_insert on public.fee_payments;
create policy fee_payments_admin_insert on public.fee_payments
for insert to authenticated
with check (public.current_user_role() in ('school_admin','super_admin')
  and (public.current_user_role() = 'super_admin' or school_id = public.current_school_id()));

drop policy if exists fee_payments_admin_update on public.fee_payments;
create policy fee_payments_admin_update on public.fee_payments
for update to authenticated
using (public.current_user_role() in ('school_admin','super_admin')
  and (public.current_user_role() = 'super_admin' or school_id = public.current_school_id()))
with check (public.current_user_role() in ('school_admin','super_admin')
  and (public.current_user_role() = 'super_admin' or school_id = public.current_school_id()));

drop policy if exists fee_payments_admin_delete on public.fee_payments;
create policy fee_payments_admin_delete on public.fee_payments
for delete to authenticated
using (public.current_user_role() in ('school_admin','super_admin')
  and (public.current_user_role() = 'super_admin' or school_id = public.current_school_id()));

-- Important: fee_records/fee_payments are database-ready tables; the current
-- frontend's fees screen still uses local demo storage until API wiring is done.
