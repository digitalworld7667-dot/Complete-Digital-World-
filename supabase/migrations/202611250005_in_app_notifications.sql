-- In-app notifications for attendance, fee payments and bus events
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  event_type text not null check (event_type in ('attendance','fee_payment','bus_boarded','bus_dropped')),
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists user_notifications_recipient_created_idx on public.user_notifications(recipient_profile_id,created_at desc);
alter table public.user_notifications enable row level security;
drop policy if exists user_notifications_read_own on public.user_notifications;
create policy user_notifications_read_own on public.user_notifications for select to authenticated using (recipient_profile_id=auth.uid());
drop policy if exists user_notifications_update_own on public.user_notifications;
create policy user_notifications_update_own on public.user_notifications for update to authenticated using (recipient_profile_id=auth.uid()) with check (recipient_profile_id=auth.uid());
revoke all on public.user_notifications from anon, public;
grant select, update on public.user_notifications to authenticated;

create or replace function private.create_student_event_notifications(p_school_id uuid,p_student_id uuid,p_event_type text,p_title text,p_message text)
returns void language plpgsql security definer set search_path = public, private, pg_temp as $$
declare v_profile_id uuid;
begin
  for v_profile_id in
    select distinct target.profile_id from (
      select pa.profile_id from public.parents pa where pa.student_id=p_student_id and pa.profile_id is not null
      union select s.profile_id from public.students s where s.id=p_student_id and s.profile_id is not null
    ) target join public.profiles p on p.id=target.profile_id
    where p.school_id=p_school_id and p.account_status='active'
  loop
    insert into public.user_notifications(school_id,recipient_profile_id,student_id,event_type,title,message)
    values(p_school_id,v_profile_id,p_student_id,p_event_type,p_title,p_message);
  end loop;
end; $$;
revoke all on function private.create_student_event_notifications(uuid,uuid,text,text,text) from public, anon, authenticated;

create or replace function private.notify_attendance_event()
returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
declare v_name text;
begin
  select student_name into v_name from public.students where id=new.student_id;
  perform private.create_student_event_notifications(new.school_id,new.student_id,'attendance','Attendance updated',
    coalesce(v_name,'Student')||' attendance for '||new.attendance_date::text||' is '||new.status||'.');
  return new;
end; $$;
drop trigger if exists trg_notify_attendance_event on public.attendance;
create trigger trg_notify_attendance_event after insert or update of status on public.attendance for each row execute function private.notify_attendance_event();

create or replace function private.notify_fee_payment_event()
returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
declare v_name text;
begin
  select student_name into v_name from public.students where id=new.student_id;
  perform private.create_student_event_notifications(new.school_id,new.student_id,'fee_payment','Fee payment recorded',
    'A payment of Rs. '||new.amount_paid::text||' has been recorded for '||coalesce(v_name,'student')||'.');
  return new;
end; $$;
drop trigger if exists trg_notify_fee_payment_event on public.fee_payments;
create trigger trg_notify_fee_payment_event after insert on public.fee_payments for each row execute function private.notify_fee_payment_event();

create or replace function private.notify_bus_event()
returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
declare v_name text; v_title text;
begin
  select student_name into v_name from public.students where id=new.student_id;
  v_title := case when new.event_type='boarded' then 'Student boarded bus' else 'Student left bus' end;
  perform private.create_student_event_notifications(new.school_id,new.student_id,
    case when new.event_type='boarded' then 'bus_boarded' else 'bus_dropped' end,v_title,
    coalesce(v_name,'Student')||case when new.event_type='boarded' then ' has boarded the bus.' else ' has been dropped off.' end);
  return new;
end; $$;
drop trigger if exists trg_notify_bus_event on public.bus_logs;
create trigger trg_notify_bus_event after insert on public.bus_logs for each row execute function private.notify_bus_event();
