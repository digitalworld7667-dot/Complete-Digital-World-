# Repaired review package — 07-11-2026

## Is revision mein source-level fixes
1. Direct Super Admin school creation sets `approval_status='approved'`.
2. School Admin settings are saved only in `school_settings`; no forbidden UPDATE is attempted against `schools`.
3. Signed-in support ticket form includes requester contact.
4. New SQL migration validates fee-payment fee/student/school linkage, rejects waived fees and prevents overpayment.

## Important deployment limits
- Existing `profiles.account_status`, `students.section/admission_number/guardian_contact`, `parents.relationship`, `buses.vehicle_number/route_name/authorization_reference`, and school-request/settings/activity-log objects are created by `202611030001_school_operations_security.sql`. Until migrations are applied, related UI/functions will not work.
- Apply migrations only after a database backup and staging test, in filename order.
- No GitHub repository or live Supabase project was changed.
- Edge Function runtime, real RLS, SMTP, Auth invitation/reset, and end-to-end role tests remain unverified.
- GPS hardware/maps, QR/fingerprint, and SMS/WhatsApp/push delivery are not implemented.
