# Complete Digital World — Managed single package

## Ek hi canonical project
- `index.html` — latest full school-management UI (same original interface, consolidated as the only frontend entry point).
- `supabase-config.js` — one canonical Supabase browser config; `config/supabase-config.js` is an identical compatibility copy.
- `supabase/schema.sql` — safe, additive fee-table migration aligned to the audited live schema.
- `.github/workflows/pages.yml` — GitHub Pages deployment.

## Important status (please read)
The existing `index.html` is still a **frontend demo**: its login and module records use browser `localStorage`. Adding a Supabase URL/key file does not connect authentication or data automatically. I have kept the existing UI intact rather than replacing it with a broken partial auth rewrite.

The previous starter SQL had tables/columns that do not match your audited live database. It is intentionally not included. This package's SQL only adds `fee_records` and `fee_payments` plus indexes and conservative school-admin/super-admin RLS policies. It does not delete or alter your existing tables or records. Parent/student fee access is intentionally not opened until the live parent-child/profile links are verified.

`notification_queue` stores pending jobs; it does not send SMS/WhatsApp by itself. A Supabase Edge Function plus SMS/WhatsApp provider is still required. QR/fingerprint and live GPS also need device/provider integration.

## Supabase setup
1. Take a database backup.
2. Open Supabase → SQL Editor. Review `supabase/schema.sql`, then run it. Do not run the old starter schema from earlier packages.
3. Confirm the two fee tables and RLS policies were created.
4. Never place a `service_role`/secret key in HTML, JS, GitHub, or browser storage. Use only the publishable key in frontend code.

## GitHub Pages
1. Extract this ZIP. Upload the **contents** of this folder to the root of your repository.
2. Confirm `index.html`, `supabase-config.js`, `supabase/`, and `.github/workflows/` are in the repository root.
3. GitHub → Settings → Pages → Build and deployment → GitHub Actions.
4. Open Actions and wait for the deployment workflow to succeed.

## What is not falsely marked complete
- Supabase Auth + all frontend reads/writes: not yet wired.
- Fees UI sync: not yet wired to the new tables.
- SMS/WhatsApp delivery worker: not configured.
- Parent/student fee read policies: pending verified relationship mapping.
