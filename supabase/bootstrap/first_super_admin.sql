-- One-time bootstrap for the FIRST platform Super Admin.
-- Run manually in Supabase SQL Editor only AFTER the base schema and migrations.
-- First create the intended user in Supabase Dashboard > Authentication > Users.
-- Replace the email below with that user's exact email. No password is stored here.

do $$
declare
  v_email text := lower(trim('REPLACE_WITH_YOUR_AUTH_USER_EMAIL'));
  v_user_id uuid;
  v_full_name text;
begin
  if v_email = '' or v_email = 'replace_with_your_auth_user_email' then
    raise exception 'Edit the email placeholder before running this script.';
  end if;

  if exists (select 1 from public.profiles where role = 'super_admin') then
    raise exception 'A Super Admin profile already exists. Bootstrap stopped to prevent an unintended privilege change.';
  end if;

  select id, coalesce(nullif(raw_user_meta_data->>'full_name',''), split_part(email,'@',1))
    into v_user_id, v_full_name
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_user_id is null then
    raise exception 'No Supabase Auth user found for %. Create the user in Authentication > Users first.', v_email;
  end if;

  insert into public.profiles (id, school_id, full_name, role)
  values (v_user_id, null, coalesce(v_full_name, 'Platform Administrator'), 'super_admin')
  on conflict (id) do update
    set school_id = null,
        full_name = excluded.full_name,
        role = 'super_admin';
end;
$$;
