# Complete Digital World — consolidated static audit (4 Nov 2026)

## What was checked
- ZIP extracted and file inventory reviewed (38 files).
- `node --check app.js`: PASS.
- Frontend table mappings and Edge Function call names compared.
- Both SQL migrations, five Edge Functions, and three GitHub workflows reviewed.
- Schema inventory reviewed for attendance and teacher-assignment uniqueness constraints.

## Confirmed / useful
- 23 existing public tables were previously reported with RLS enabled.
- `attendance(student_id, attendance_date)` has a unique constraint; bulk attendance upsert matches it.
- `teacher_class_assignments(teacher_id, school_id, class_name)` has a unique constraint; teacher provisioning upsert matches it.
- Public school/support forms use a server-side rate-limit RPC; its function is present in the school-operations migration.
- Protected admin/account Edge Functions validate the caller's Supabase Auth session and active profile, and check role/school scope before privileged operations.
- Browser config contains a publishable key; no service-role key should ever be put there.

## Change made in this package
- GitHub Pages workflow now stages only `index.html`, `app.js`, `styles.css`, and `supabase-config.js` into `dist/` before publishing. It no longer publishes SQL migrations, internal documentation, bootstrap scripts, or workflow files as part of the Pages artifact.

## Important items that cannot honestly be marked PASS yet
1. Live RLS policy behavior / cross-school isolation: static inventory is available, but real users from each role were not used for end-to-end tests. RLS being enabled alone does not prove policies are correct.
2. Migration compatibility: migrations are included but were not executed against the live project. Back up first and apply to staging before production.
3. Edge Function runtime/type-check: Deno/Supabase CLI are not installed in this environment; `deno check` and remote deployment were not run.
4. SMTP/email invitation/password reset delivery: provider and redirect settings require live Supabase configuration and an inbox test.
5. School Admin settings writes update both `school_settings` and `schools`; verify the existing `schools` UPDATE policy permits only the intended school admins before enabling this screen.
6. Account deletion is permanent and may be blocked by foreign-key references depending on the live schema. Test with a disposable account before production use.
7. Bus GPS device/map, QR/fingerprint, SMS/WhatsApp/push delivery are not implemented in this package.

## Production-safe next steps
1. Take a Supabase backup. Do not reset/drop existing tables.
2. Apply the two included migrations to a staging clone first; review SQL errors and resulting policies/triggers.
3. Configure GitHub secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID`; configure Supabase `SITE_URL` for password reset actions.
4. Deploy the five Edge Functions via the included workflow.
5. Configure Auth Site URL / Redirect URLs and SMTP, then test invitations and password reset.
6. Test one disposable account for each role, including cross-school access denial, attendance, fees/payments, homework review, and account status changes.

**Scope statement:** This is a source/package audit and one safe workflow improvement, not a claim that the live Supabase project or GitHub Pages deployment has been changed. Existing production data has not been touched.
