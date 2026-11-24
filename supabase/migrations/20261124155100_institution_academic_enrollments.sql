create table if not exists public.institution_academic_enrollments (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.schools(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 academic_unit_id uuid not null,
 enrolled_at timestamptz not null default now(),
 status text not null default 'active' check(status in ('active','completed','withdrawn')),
 created_at timestamptz not null default now(),
 constraint institution_academic_enrollments_unique unique(student_id,academic_unit_id),
 constraint institution_academic_enrollments_unit_school_fk foreign key(academic_unit_id,school_id) references public.institution_academic_units(id,school_id) on delete cascade
);
create index if not exists institution_academic_enrollments_school_idx on public.institution_academic_enrollments(school_id,status);
create or replace function public.validate_institution_academic_enrollment() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.students s where s.id=new.student_id and s.school_id=new.school_id) then raise exception 'Student must belong to the same institution'; end if;
 return new;
end; $$;
drop trigger if exists validate_institution_academic_enrollment on public.institution_academic_enrollments;
create trigger validate_institution_academic_enrollment before insert or update on public.institution_academic_enrollments for each row execute function public.validate_institution_academic_enrollment();
alter table public.institution_academic_enrollments enable row level security;
create policy institution_academic_enrollments_read on public.institution_academic_enrollments for select to authenticated using(private.is_super_admin() or private.is_school_member(school_id));
create policy institution_academic_enrollments_insert on public.institution_academic_enrollments for insert to authenticated with check(private.is_super_admin() or private.has_school_role(school_id,array['school_admin']::text[]));
create policy institution_academic_enrollments_update on public.institution_academic_enrollments for update to authenticated using(private.is_super_admin() or private.has_school_role(school_id,array['school_admin']::text[])) with check(private.is_super_admin() or private.has_school_role(school_id,array['school_admin']::text[]));
create policy institution_academic_enrollments_delete on public.institution_academic_enrollments for delete to authenticated using(private.is_super_admin() or private.has_school_role(school_id,array['school_admin']::text[]));
grant select,insert,update,delete on public.institution_academic_enrollments to authenticated;
