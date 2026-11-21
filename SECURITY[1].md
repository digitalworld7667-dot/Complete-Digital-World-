# Security notes

- Never commit Supabase `service_role` keys, SMTP passwords, provider tokens, or other server secrets.
- The browser `sb_publishable_...` key is intended to be public; all data protection must come from correct RLS policies.
- Keep account provisioning and privileged database operations inside Edge Functions.
- Do not grant `super_admin` through a public registration form.
- Test all six roles with separate test accounts before entering real student data.
- Confirm cross-school isolation and parent-to-child mapping in live RLS policies.
- The UI is not a security boundary; database RLS and server-side authorization are.
- Take a database backup before applying any SQL migration.
- This phase intentionally does not deploy notification delivery, QR attendance, fingerprint readers, or bus GPS.
- No demo users, default passwords, seeded Super Admin credentials, or browser-local login fallback are included.
- The first Super Admin is created manually in Supabase using `supabase/bootstrap/first_super_admin.sql`; do not expose this operation through public registration.


## Newly added administrator workflows

- Account status and deletion are performed by the `admin-account-action` Edge Function after validating the caller's Auth JWT and school scope. Never call Supabase Auth admin APIs from the browser.
- Admin password reset uses Supabase Auth email delivery. Configure the `SITE_URL` Edge Function secret and Auth redirect allow-list.
- Public school registration and support submissions go through rate-limited Edge Functions; service-role credentials remain server-side.
- `activity_logs` is populated by database triggers. Browser roles receive read-only access according to school scope.
- Apply `202611030001_school_operations_security.sql` before deploying the updated frontend; the frontend expects `profiles.account_status` to exist.


### Edge Function account-state enforcement

`provision-user` and `admin-account-action` re-read the caller profile on the server and require `account_status = active`; this is important because these functions use the service-role client and must not rely on browser-side role checks. Account management also prevents self-deactivation and prevents a School Admin from changing or deleting another School Admin account.
