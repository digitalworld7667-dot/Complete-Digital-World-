# Complete Digital World — build audit notes

## Inputs reviewed
- Previous `Complete_Digital_World_Supabase_Auth_Lockout_v2.zip`
- `Supabase Snippet Schema Inventory with RLS, Constraints, Indexes, Triggers, and Functions.csv`
- Earlier production build package

## Changes made in this revision
1. Removed QR issue/scan Edge Functions and QR browser libraries.
2. Removed notification dispatcher Edge Function and QR/notification add-on migration.
3. Kept the existing database `notification_queue` table untouched; this package does not dispatch notifications.
4. Removed parent `phone` reads/writes because the supplied CSV snapshot does not show `parents.phone`.
5. Removed live GPS write UI; bus tracking is deferred.
6. Implemented manual whole-class attendance using existing `attendance` table.
7. Bulk attendance uses `upsert` on `student_id,attendance_date`, matching the unique constraint in the CSV.
8. Teacher class assignments are created during teacher provisioning from comma-separated class names.
9. Student and parent attendance views remain read-only and depend on existing RLS policies.
10. Removed all attendance/QR/notification schema additions; no destructive table replacement is included.

## Schema facts used
- 23 tables appear in the CSV inventory.
- `attendance` has status values `present`, `absent`, `late`, `leave` and unique key `(student_id, attendance_date)`.
- `teacher_class_assignments` has unique key `(teacher_id, school_id, class_name)`.
- `parents` snapshot does not contain a `phone` column.
- Existing `fees` and `fee_payments` tables are retained.

## Not verified from this environment
- Live Supabase API connectivity and current project state.
- Successful deployment of Edge Functions.
- Email provider/SMTP delivery.
- End-to-end role/RLS behavior on real accounts.
- GitHub Pages deployment status.

Treat the CSV as a point-in-time inventory, not proof that the live database has not changed. Run the deployment checklist in `README_HI.md` before using this system with real student records.
