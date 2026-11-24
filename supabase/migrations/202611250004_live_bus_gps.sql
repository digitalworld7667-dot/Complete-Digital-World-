-- Live bus GPS: secure write and role-scoped read RPCs
create index if not exists bus_locations_bus_recorded_idx
  on public.bus_locations(bus_id, recorded_at desc);

create or replace function public.record_my_bus_location(
  p_latitude double precision,
  p_longitude double precision
) returns timestamptz
language plpgsql security definer
set search_path = public, private, pg_temp
as $$
declare v_bus_id uuid; v_recorded timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_latitude is null or p_longitude is null
     or p_latitude not between -90 and 90
     or p_longitude not between -180 and 180 then
    raise exception 'Invalid GPS coordinates';
  end if;
  select b.id into v_bus_id
    from public.buses b
   where b.driver_profile_id=auth.uid()
     and private.is_assigned_bus_driver(b.id)
   order by b.created_at desc limit 1;
  if v_bus_id is null then raise exception 'No active bus is assigned to this driver'; end if;
  if exists(select 1 from public.bus_locations l where l.bus_id=v_bus_id and l.recorded_at>now()-interval '5 seconds') then
    raise exception 'GPS update received too recently; wait a moment';
  end if;
  insert into public.bus_locations(bus_id,latitude,longitude,recorded_at)
  values(v_bus_id,p_latitude,p_longitude,now())
  returning recorded_at into v_recorded;
  return v_recorded;
end;
$$;

create or replace function public.get_visible_bus_live_locations()
returns table(
  bus_id uuid, school_id uuid, bus_number text, vehicle_number text,
  route_name text, latitude double precision, longitude double precision,
  recorded_at timestamptz, location_stale boolean
)
language sql stable security definer
set search_path = public, private, pg_temp
as $$
  with visible_buses as (
    select b.id,b.school_id,b.bus_number,b.vehicle_number,b.route_name
      from public.buses b
     where private.is_super_admin()
        or (private.has_school_role(b.school_id,array['school_admin']::text[]))
        or private.is_assigned_bus_driver(b.id)
        or (
          exists (
            select 1 from public.bus_logs bl
            join public.parents pa on pa.student_id=bl.student_id
            where pa.profile_id=auth.uid() and bl.bus_id=b.id
          )
          and exists (
            select 1 from public.profiles p
             where p.id=auth.uid() and p.role='parent' and p.account_status='active'
          )
        )
  ), latest as (
    select distinct on (l.bus_id) l.bus_id,l.latitude,l.longitude,l.recorded_at
      from public.bus_locations l
      join visible_buses vb on vb.id=l.bus_id
     order by l.bus_id,l.recorded_at desc
  )
  select vb.id,vb.school_id,vb.bus_number,vb.vehicle_number,vb.route_name,
         l.latitude,l.longitude,l.recorded_at,
         (l.recorded_at is null or l.recorded_at < now()-interval '2 minutes')
    from visible_buses vb
    left join latest l on l.bus_id=vb.id
   order by vb.bus_number;
$$;

revoke all on function public.record_my_bus_location(double precision,double precision) from public, anon;
revoke all on function public.get_visible_bus_live_locations() from public, anon;
grant execute on function public.record_my_bus_location(double precision,double precision) to authenticated;
grant execute on function public.get_visible_bus_live_locations() to authenticated;
