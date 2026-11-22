alter table public.profiles
  add column if not exists login_id text,
  add column if not exists must_change_password boolean not null default false;

create unique index if not exists profiles_login_id_unique
  on public.profiles (upper(login_id))
  where login_id is not null;

alter table public.profiles
  add constraint profiles_login_id_format_check
  check (login_id is null or login_id ~ '^MSD-(STD|TCH|PAR|DRV|ADM)-[0-9]{4,10}$');