# Delivery status — Complete Digital World

## Is clean source package mein

- Active app Supabase Auth aur database RLS ke saath hai.
- Super Admin, School Admin, Teacher, Parent, Student aur Bus Driver ke role-based views.
- Account provisioning/admin actions Edge Functions se.
- School requests, school settings, activity logs, manual class attendance, students/teachers/parents, marks, fees/payments, homework/submission review, notices, timetable, school events, buses/bus logs, teacher attendance, support tickets aur CSV export.
- First Super Admin ke liye manual one-time Supabase bootstrap SQL.

**Koi seeded demo account, default Super Admin password, sample login, browser-local demo authentication ya demo reset function repository mein include nahi hai.** Password Supabase Auth mein set/reset hoga. Publishable key browser config mein public key hai; service-role key nahi hai.

## Abhi bhi remote setup/testing chahiye

- Live GPS: mobile/device location sender aur map UI nahi hai.
- QR/fingerprint: camera scanner/biometric integration nahi hai.
- SMS / WhatsApp / push: provider adapter, consent, delivery worker aur delivery receipts nahi hain.
- Email: Supabase Auth SMTP/provider configure aur test karna hai.
- Live DB: migrations remote Supabase project par apply nahi ki gayi hain.
- Live functions: Edge Functions remote project par deploy nahi ki gayi hain.
- Security: har role ke real accounts se RLS aur tenant isolation test nahi hua.
- Hosting: GitHub Pages deployment verify nahi hua.

## Local checks

- `node --check app.js`
- ZIP integrity test
- Demo credential / legacy prototype file scan

Yeh checks live SQL compatibility, Deno runtime, SMTP, RLS, browser UX ya remote deployment prove nahi karte.

## Safe deployment sequence

1. GitHub repository aur Supabase database ka backup lo.
2. GitHub repo se purani prototype/demo files remove karo. Agar kabhi real credential commit hua tha toh use rotate karo; Git history cleanup bhi zaroori ho sakta hai.
3. Live Supabase schema ko `SUPABASE_SCHEMA_INVENTORY.csv` se compare karo; CSV sirf snapshot hai.
4. Migrations ko backup ke baad staging mein apply/test karo.
5. Five Edge Functions deploy karo.
6. Auth URL/redirects aur SMTP configure karo.
7. `supabase/bootstrap/README_HI.md` ke mutabik first Super Admin manually create karo.
8. Har role aur cross-school RLS ko test karke hi production student data import karo.

Service-role key, GitHub token aur provider secrets ko browser files, Git repo ya chat mein kabhi mat rakho. Supabase/GitHub secret settings use karo.


## Biometric attendance foundation — integration boundary

- Migration `202611180001_schoolwide_biometric_attendance.sql` adds staff members, staff attendance, biometric devices/enrollments, and biometric event storage with RLS.
- The current UI supports importing a machine-exported CSV; it does not connect directly to fingerprint/face/RFID hardware.
- No device-vendor API credentials, live event-ingestion endpoint, fingerprint templates, or face images are included. Do not store biometric templates/images in this database.
- Apply and test this migration against a backup before enabling the staff attendance workflow. Verify every school-scoped RLS policy with real test accounts.
