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


## Additional production workflows added in the current build
11. Added migration for school requests, school settings, account status, activity logs, extra student/parent/bus profile fields and public-form rate-limit tables.
12. Added server-side Edge Functions for admin account actions, school request submission/review, and public support ticket submission.
13. Added account activation/deactivation, admin password reset, account deletion, school request review, school settings and activity log screens.
14. Added activity log triggers and RLS helper checks so deactivated accounts lose data access even if an older JWT remains valid.
15. Added fee status recalculation from payment ledger and teacher grading/feedback for homework submissions.
16. Added parent relationship, student section/admission/guardian contact, and bus vehicle/route details.

## Remaining external/hardware dependencies
- Live bus GPS sender/device + map UI.
- QR scanner/camera flow and fingerprint hardware.
- SMS/WhatsApp/push provider integration and delivery worker.
- Production end-to-end tests against the actual Supabase project.

The new migration and Edge Functions are included in the package but have not been applied/deployed to the live Supabase project from this environment.


## अतिरिक्त source fixes in repaired review package (07-11-2026)
- Super Admin द्वारा सीधे बनाई गई school row को explicitly `approved` बनाया; इससे pending default के कारण account provisioning block नहीं होगा।
- School Admin settings form अब `schools` master table को update करने की कोशिश नहीं करता, क्योंकि supplied RLS inventory में `schools` UPDATE केवल Super Admin के लिए था। Settings `school_settings` में सुरक्षित रहती हैं।
- Signed-in support ticket form में requester contact field जोड़ा।
- Fee payment integrity guard migration जोड़ी: fee/student/school match, waived-fee rejection और overpayment protection.

इन fixes का static source review किया गया है; live Supabase migration, RLS और real-account tests इस environment में नहीं किए गए।
