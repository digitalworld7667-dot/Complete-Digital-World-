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
