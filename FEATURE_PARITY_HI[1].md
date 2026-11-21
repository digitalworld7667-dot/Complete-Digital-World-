# Feature implementation status — Supabase build

Yeh repository Supabase-backed application code rakhti hai. Is repository mein koi seeded demo account, sample login password, browser-local authentication, ya demo reset feature nahi hai. User accounts Supabase Auth se create/invite hote hain; role `profiles` table mein controlled hota hai.

## Implemented in application code (deployment and permissions must still be verified)

- **Super Admin:** school list/create, school registration request review, account provisioning, account activation/deactivation, password reset email, account deletion, support tickets, activity logs.
- **School Admin:** school-scoped students/teachers/parents, account provisioning, school settings, class attendance, marks, fees, fee payments, homework, homework submissions, notices, timetable, school events, buses, bus logs, teacher attendance, support tickets, activity logs.
- **Teacher:** assigned-class attendance, marks, homework, homework submission review, timetable, notices, school events, teacher attendance.
- **Parent:** linked child's profile, attendance, marks, fees/payments, notices, homework/submissions, timetable, school events and bus logs.
- **Student:** own attendance/marks/fees/payments, class homework and submissions, notices, timetable and school events.
- **Bus Driver:** assigned bus and bus logs.
- **Public website:** Supabase Auth login and password recovery, school registration request, public support ticket.
- **Audit and fee ledger:** database audit triggers and fee status recalculation from recorded payments.
- **Exports:** CSV export for records visible to the signed-in role.

## Not implemented as live integrations

- **Live GPS:** requires a driver/device location sender and map UI.
- **QR attendance / fingerprint:** requires scanner/camera or biometric hardware integration.
- **SMS / WhatsApp / push:** requires provider credentials, consent and a delivery worker.
- **Email delivery:** requires Supabase Auth SMTP/provider configuration and a delivery test.

## Required before production use

1. Compare the live database with `SUPABASE_SCHEMA_INVENTORY.csv`; it is a snapshot, not a live introspection.
2. Back up the database and apply `supabase/migrations/202611030001_school_operations_security.sql` after confirming the base schema.
3. Deploy all five Edge Functions.
4. Configure Auth Site URL, redirect URLs and SMTP.
5. Create the first Super Admin using the manual one-time process in `supabase/bootstrap/README_HI.md`. No default Super Admin password is supplied.
6. Test every role, school isolation, RLS and email delivery using real Supabase Auth accounts before entering production data.

This repository is source code and deployment material. It does not prove that the remote Supabase database, Edge Functions or GitHub Pages site have already been deployed or tested.
