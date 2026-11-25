-- QR attendance RPCs require an authenticated session; never expose to anon/PUBLIC.
revoke all on function public.get_or_create_student_attendance_qr(uuid) from public, anon;
revoke all on function public.mark_attendance_by_student_qr(uuid) from public, anon;
grant execute on function public.get_or_create_student_attendance_qr(uuid) to authenticated, service_role;
grant execute on function public.mark_attendance_by_student_qr(uuid) to authenticated, service_role;
