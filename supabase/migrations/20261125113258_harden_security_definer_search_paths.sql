-- Harden name resolution for SECURITY DEFINER functions without changing app-facing permissions.
alter function public.get_or_create_student_attendance_qr(uuid) set search_path = '';
alter function public.get_visible_bus_live_locations() set search_path = '';
alter function public.mark_attendance_by_student_qr(uuid) set search_path = '';
alter function public.record_fee_payment(uuid,numeric,text,timestamptz,text) set search_path = '';
alter function public.record_my_bus_location(double precision,double precision) set search_path = '';
