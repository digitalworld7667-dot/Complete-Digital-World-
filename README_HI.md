# Complete Digital World — GitHub + Supabase build

Yeh package tumhare diye gaye Supabase schema inventory aur pehle wale GitHub ZIP ko base bana kar update kiya gaya hai. Is build mein purana QR/notification dispatcher code hata diya gaya hai aur **manual class attendance** rakhi gayi hai.

> Zaroori: ZIP upload karne se website apne aap live Supabase par deploy nahi hoti. GitHub Pages frontend host karta hai; Supabase database aur Edge Functions ko alag se configure/deploy karna hota hai. Live project ko is environment se query nahi kiya gaya, isliye deployment ke baad test zaroor karna.

## Is package mein

- Supabase Auth login, session restore, logout aur password reset.
- Secure-login Edge Function (lockout migration/function ke saath).
- Authorized invitation/provisioning Edge Function.
- Roles: Super Admin, School Admin, Teacher, Parent, Student, Bus Driver.
- Supabase-backed reads for the existing schema tables used by the UI.
- School creation and role account provisioning.
- Teacher provisioning ke waqt comma-separated assigned classes save hoti hain.
- Marks, fees, homework aur school notices ke basic create/list screens.
- **Manual attendance:** Admin/teacher school + class + date choose kare, poori class ki student list aaye, har student ke liye Present / Absent / Late / Leave select kare, aur ek click mein poori class Supabase mein save ho. Same date ki existing attendance pehle se selected dikhegi; save karne par update ya insert hoga.
- Parent aur student apne linked child/self ki attendance read-only dekhte hain.
- Existing RLS policies database-side authorization apply karti hain.

## Is phase mein jaan-bujhkar nahi hai

- SMS / WhatsApp / push notification delivery. `notification_queue` table ko delete ya modify nahi kiya gaya; is build se koi dispatcher deploy nahi hota.
- QR attendance, QR credentials, camera scanner.
- Fingerprint hardware integration.
- Live bus GPS sharing / tracking.

In features ko later phase mein add karna hai. `Notices` tab school ke notices dikhata hai; woh SMS/WhatsApp notification delivery nahi hai.

## CSV inventory ke saath matching

- `attendance` table ke existing columns use hote hain: `student_id`, `school_id`, `attendance_date`, `status`, `marked_by`.
- Inventory mein `UNIQUE(student_id, attendance_date)` constraint aur status check (`present`, `absent`, `late`, `leave`) listed hai. Bulk save isi unique key par upsert karta hai.
- Teacher attendance class filtering `teacher_class_assignments` table se hoti hai. Teacher account banate waqt assigned classes dena zaroori hai.
- `parents` table ke snapshot mein `phone` column nahi tha, isliye current code parent phone field ko query/insert nahi karta.
- Existing `fees` aur `fee_payments` schema use hota hai. Koi `fee_records` replacement table nahi banayi gayi.
- Koi table drop/rename nahi hoti. Is package mein QR/notification add-on migration nahi hai.

## Step-by-step deployment

### 1. Backup aur ZIP extract

1. Existing GitHub repository ka backup ZIP ya separate branch bana lo.
2. Is ZIP ko extract karo.
3. Extracted `cdw_build` folder ke **andar ka content** repository ke root mein upload karo. `cdw_build/cdw_build` nested folder mat banana.
4. GitHub par files review karke commit/push karo. `.github/workflows/pages.yml` GitHub Pages ko `main` branch se deploy karta hai.

### 2. Supabase config verify karo

`supabase-config.js` mein project URL aur publishable key pehle wale project config se rakhe gaye hain. Supabase Dashboard → Project Settings → API se verify karo ki dono tumhare intended project se match karte hain.

Publishable/anon key browser mein use ho sakti hai. **Service role key ko kabhi `supabase-config.js`, HTML, JavaScript ya GitHub repository mein mat daalna.**

### 3. Database lockout objects verify karo

Tumhari CSV inventory mein `login_account_security`, `login_ip_security` aur `record_login_failure` function already listed hain. Agar live database mein ye objects maujood hain, migration dobara run mat karo.

Agar ye objects missing hon, backup ke baad SQL Editor mein ye file run karo:

`supabase/migrations/202611020001_login_lockout.sql`

Manual attendance ke liye nayi SQL migration ki zaroorat nahi hai; woh inventory mein maujood `attendance` table aur constraints use karti hai.

### 4. Edge Functions deploy karo

Supabase CLI install karke project root se commands run karo:

```bash
supabase login
supabase link --project-ref buzmpikgfdnmsukmgnkz
supabase functions deploy secure-login --no-verify-jwt
supabase functions deploy provision-user --no-verify-jwt
```

`secure-login` login attempt verify karta hai. `provision-user` signed-in caller ka JWT verify karke role permissions server-side check karta hai. Supabase ke built-in Edge Function secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) available hone chahiye. Service role key ko browser mein kabhi expose mat karna.

### 5. Auth URL aur email setup

Supabase Dashboard → Authentication → URL Configuration mein:

- Site URL: tumhari deployed GitHub Pages website ka exact URL.
- Redirect URLs: wahi exact GitHub Pages URL aur password recovery redirect path.

Authentication email invitation aur password reset ke liye SMTP/email provider configure karna hoga. SMTP set na ho to invitation email deliver nahi hogi.

### 6. First Super Admin

Agar Super Admin profile pehle se hai to duplicate mat banao. Nahi hai to:

1. Supabase Dashboard → Authentication → Users mein apna trusted admin Auth user create karo.
2. Us user ka Auth UUID copy karo.
3. SQL Editor mein apna UUID daal kar run karo:

```sql
insert into public.profiles (id, school_id, full_name, role)
values ('YOUR_AUTH_USER_UUID', null, 'Platform Administrator', 'super_admin');
```

Sirf apne trusted account ko `super_admin` role do.

### 7. Schools aur accounts create karo

1. Super Admin se login karo.
2. `Schools` tab se school record create karo.
3. `Accounts` tab se us school ka School Admin invite karo.
4. School Admin apne school ke Student, Teacher, Parent aur Bus Driver accounts invite kar sakta hai.
5. Student account ke liye Class + Roll Number bharo.
6. Parent account ke liye usi school ke Student record UUID se link karo.
7. Teacher account ke liye `Teacher assigned classes` mein classes comma-separated do, jaise `Class 6, Class 7`. Ye assignment manual attendance permission ke liye zaroori hai.
8. Bus Driver profile banne ke baad `buses.driver_profile_id` mein us profile UUID assign karna hoga.

### 8. Manual attendance ka use

1. School Admin ya assigned Teacher login kare.
2. `Attendance` tab kholo.
3. School (Super Admin ke liye), class aur date select karo.
4. `Load students` dabao.
5. Har student ke saamne Present / Absent / Late / Leave select karo.
6. `Save attendance for ... students` dabao.
7. Student `My Attendance` aur Parent `Attendance` tab mein saved records read-only dekh sakte hain.

Attendance save par database ki RLS policies aur unique constraint enforce hote hain. Teacher ko sirf assigned classes ke students dikhne chahiye; agar class assignment missing hai to pehle Teacher account ki class assignments correct karo.

## Deployment ke baad testing checklist

- [ ] Super Admin login, school create aur school admin invite.
- [ ] School Admin login aur apne school ke accounts create.
- [ ] Teacher ko assigned classes milti hain; unassigned class access deny hota hai.
- [ ] Ek class ke students load karke bulk attendance save karo.
- [ ] Same date par attendance dobara kholne par saved statuses selected aate hain.
- [ ] Student sirf apni attendance dekh sakta hai.
- [ ] Parent sirf linked child ki attendance dekh sakta hai.
- [ ] Doosre school ka data kisi school user ko visible nahi hona chahiye.
- [ ] Password reset email and recovery flow test.
- [ ] Mobile, tablet aur desktop browser test.

## Known boundaries / honesty note

- Yeh ZIP code package hai; isse tumhare live Supabase par deployment ya end-to-end test automatically nahi hota.
- Current UI mein core CRUD modules ki coverage partial hai; full school operations (timetable management, homework submissions review, fee payment receipts, support ticket workflow, bulk import/export, account editing/deactivation) ke liye agle development steps chahiye.
- RLS policies ko live project par role-by-role test karna zaroori hai. Frontend ke hidden tabs security ka replacement nahi hain.
- Existing schema inventory ek snapshot hai; agar live database is snapshot se badal chuka hai to queries fail ho sakti hain. Error aaye to uska exact message aur relevant SQL schema dekhkar fix karna hoga.
