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
- Marks, fees, fee payments, homework, homework submissions aur school notices ke create/list screens.
- Timetable entries, school events, teacher attendance, bus logs aur support ticket submission.
- Visible database records ka CSV export.
- School registration requests: public request form, Super Admin approve/reject, approval par real school record create.
- School settings, account active/inactive controls, admin-triggered password reset email aur account deletion.
- Activity logs: key tables par insert/update/delete audit triggers.
- Public support ticket submission through an atomic IP-rate-limited Edge Function.
- GitHub Actions se Supabase Edge Functions deploy karne ka optional workflow (`deploy-supabase.yml`): secure-login, provision-user, admin-account-action, submit-school-request, submit-support-ticket.
- **Manual attendance:** Admin/teacher school + class + date choose kare, poori class ki student list aaye, har student ke liye Present / Absent / Late / Leave select kare, aur ek click mein poori class Supabase mein save ho. Same date ki existing attendance pehle se selected dikhegi; save karne par update ya insert hoga.
- Parent aur student apne linked child/self ki attendance read-only dekhte hain.
- Existing RLS policies database-side authorization apply karti hain.

## Aapke latest HTML upload ke baare mein

Repository mein sirf Supabase Auth + RLS wala production application rakha gaya hai. Koi demo account, default password, sample login, localStorage authentication ya demo reset nahi hai. Feature status ke liye `FEATURE_PARITY_HI.md` dekhein.

Agar purani demo/prototype files pehle GitHub par commit ho chuki hain, toh current repository se unhe delete karo. Git history mein pehle commit hue secrets reh sakte hain; kisi real password/token ko turant rotate karo aur zaroorat par history cleanup karo.

## New migration and function secrets

New workflows ke liye `supabase/migrations/202611030001_school_operations_security.sql` SQL Editor mein backup ke baad apply karo. Yeh `school_requests`, `school_settings`, `activity_logs`, account status, student/parent/bus extra fields aur public form rate-limit tables create karta hai; RLS helper functions ko bhi update karta hai taaki deactivated account purane session/JWT se data access na kar sake. Fee payments ke baad fee status auto-recalculate hota hai. Is migration ko apply kiye bina nayi screens kaam nahi karengi.

Admin password reset ke liye Supabase Edge Function secret `SITE_URL` ko deployed website URL par set karo: `supabase secrets set SITE_URL=https://YOUR-USERNAME.github.io/YOUR-REPO/` (CLI ko project se link karne ke baad). Supabase Auth → URL Configuration mein bhi Site URL / Redirect URLs same rakho.

## hCaptcha protection (login, password reset, school request, support)

- Frontend Site Key HTML/JavaScript mein public hai: `7b1a048a-fdb6-4c8e-a1b6-b1f8beb029d8`.
- Supabase Edge Function Secrets mein private secret ka naam `HCAPTCHA_SECRET` hona chahiye. Secret value ko GitHub, HTML, JavaScript, ZIP report ya chat mein kabhi commit/share na karein.
- Supabase Authentication → Attack Protection mein CAPTCHA protection enabled, provider `hCaptcha`, aur wahi provider secret saved hona chahiye.
- Public `submit-school-request` aur `submit-support-ticket` Edge Functions token ko hCaptcha `siteverify` API se server-side verify karti hain; secret missing ho toh request fail closed hoti hai.
- Login aur password reset Supabase Auth CAPTCHA verification use karte hain. Browser mein secret key nahi hoti.

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

Manual attendance existing `attendance` table use karti hai. School operations ke extra workflows ke liye `202611030001_school_operations_security.sql` apply karna zaroori hai.

### 4. Edge Functions deploy karo

Supabase CLI install karke project root se commands run karo. Ya GitHub Actions mein `SUPABASE_ACCESS_TOKEN` aur `SUPABASE_PROJECT_ID` secrets add karke Actions → Deploy Supabase Edge Functions → Run workflow use karo. Workflow sirf Edge Functions deploy karta hai; database migration automatic nahi chalata.

Manual CLI commands:

```bash
supabase login
supabase link --project-ref buzmpikgfdnmsukmgnkz
supabase functions deploy secure-login --no-verify-jwt
supabase functions deploy provision-user --no-verify-jwt
supabase functions deploy admin-account-action --no-verify-jwt
supabase functions deploy submit-school-request --no-verify-jwt
supabase functions deploy submit-support-ticket --no-verify-jwt
```

`secure-login` login attempt verify karta hai. `provision-user` signed-in caller ka JWT verify karke role permissions server-side check karta hai. Supabase ke built-in Edge Function secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) available hone chahiye. Service role key ko browser mein kabhi expose mat karna.

### 5. Auth URL aur email setup

Supabase Dashboard → Authentication → URL Configuration mein:

- Site URL: tumhari deployed GitHub Pages website ka exact URL.
- Redirect URLs: wahi exact GitHub Pages URL aur password recovery redirect path.

Authentication email invitation aur password reset ke liye SMTP/email provider configure karna hoga. SMTP set na ho to invitation email deliver nahi hogi.

### 6. First Super Admin (no default password)

1. Supabase Dashboard → Authentication → Users mein trusted administrator ka Auth user create/invite karo. Password Supabase Auth handle karega.
2. `supabase/bootstrap/first_super_admin.sql` mein `REPLACE_WITH_YOUR_AUTH_USER_EMAIL` ko us Auth user ke exact email se replace karo.
3. Supabase SQL Editor mein script ek baar run karo. Yeh tabhi role assign karegi jab abhi koi Super Admin profile nahi hai.
4. Is repository mein koi pre-created Super Admin email/password ya default credential nahi hai. Public signup se `super_admin` role kabhi assign mat karna.

### 7. Production checklist

- Supabase Auth SMTP aur redirect URLs test karo.
- Har role ke liye alag Auth account create karke RLS aur cross-school isolation verify karo.
- Database backup, migration status aur Edge Function logs check karo.
- Live test pass hone ke baad hi real student data import karo.

### 8. Schools aur accounts create karo

1. Super Admin se login karo.
2. `Schools` tab se school record create karo.
3. `Accounts` tab se us school ka School Admin invite karo.
4. School Admin apne school ke Student, Teacher, Parent aur Bus Driver accounts invite kar sakta hai.
5. Student account ke liye Class + Roll Number bharo.
6. Parent account ke liye usi school ke Student record UUID se link karo.
7. Teacher account ke liye `Teacher assigned classes` mein classes comma-separated do, jaise `Class 6, Class 7`. Ye assignment manual attendance permission ke liye zaroori hai.
8. Bus Driver profile banne ke baad `buses.driver_profile_id` mein us profile UUID assign karna hoga.

### 9. Manual attendance ka use

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
- [ ] Fee payment, homework submission, timetable, school event, teacher attendance aur bus event workflows test.
- [ ] GitHub Actions mein Edge Function deployment successful verify.

## Final delivery status

Detailed, corrected status (implemented code vs. work requiring live services) is in `DELIVERY_STATUS_HI.md`. In short: this is an advanced Supabase-backed code build, **not yet a verified production deployment**. Some current forms require UUIDs to be entered manually; GPS, QR/fingerprint and outbound SMS/WhatsApp/push are not implemented. Live migrations, Edge Function deployment, SMTP and role-by-role RLS tests still need to be performed against the actual Supabase project.


## अतिरिक्त जरूरी migration (07-11-2026)
`supabase/migrations/202611070001_fee_payment_integrity.sql` fee payment में गलत student/school mapping, waived fee पर payment और fee amount से ज्यादा payment को database स्तर पर रोकता है। इसे बाकी migrations के बाद पहले staging/backup के साथ test करें। इस ZIP को सीधे live project पर बिना backup और परीक्षण के लागू न करें।


### 10 नवंबर 2026 — अतिरिक्त सुरक्षा सुधार

नई migration `supabase/migrations/202611100001_harden_rls_helper_privileges.sql` को migration क्रम में सबसे अंत में चलाएँ। यह RLS helper functions की execute permission `authenticated`/`service_role` तक सीमित करती है और Teacher को school के सभी user profiles पढ़ने से रोकती है। Account deletion को hard-delete से बदलकर deactivate-only किया गया है ताकि academic/financial history सुरक्षित रहे। इन बदलावों को live database पर अभी apply नहीं किया गया है। विस्तृत निष्कर्ष `PHASE3_SECURITY_REVIEW_HI.md` में हैं।
