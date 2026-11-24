alter table public.attendance add column if not exists academic_unit_id uuid;
alter table public.attendance drop constraint if exists attendance_academic_unit_school_fk;
alter table public.attendance add constraint attendance_academic_unit_school_fk foreign key(academic_unit_id,school_id) references public.institution_academic_units(id,school_id) on delete restrict;
alter table public.marks add column if not exists academic_unit_id uuid;
alter table public.marks drop constraint if exists marks_academic_unit_school_fk;
alter table public.marks add constraint marks_academic_unit_school_fk foreign key(academic_unit_id,school_id) references public.institution_academic_units(id,school_id) on delete restrict;
create index if not exists attendance_academic_unit_date_idx on public.attendance(school_id,academic_unit_id,attendance_date);
create index if not exists marks_academic_unit_exam_idx on public.marks(school_id,academic_unit_id,exam_name);
