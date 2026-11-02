# Complete Digital World — Supabase Auth integration build

## Is build mein kya update hua
- Existing responsive school-management UI preserve kiya gaya hai.
- `supabase-config.js` mein existing Supabase project URL aur browser-safe Publishable Key use hoti hai.
- Supabase JS v2 CDN SDK load hota hai.
- Login ab Supabase Auth `signInWithPassword` se verify hota hai; localStorage ke demo email/password se login nahi hota.
- Login ke baad `profiles` table mein `auth.uid()` matching profile, role aur school mapping verify hoti hai.
- Student, teacher aur parent profile ke liye linked record lookup hota hai.
- Refresh par valid Supabase session restore hota hai; logout Supabase Auth se hota hai.
- Real user login ke waqt browser ke seeded demo records clear kiye jaate hain, taaki demo students/fees/attendance real account ko na dikhayein.
- Public self-registration band hai. Browser se role choose karke privileged account banana secure nahi hota.

## Bahut zaroori limitation
**Yeh Auth integration milestone hai, poora database-module integration nahi.** Dashboard ka existing Attendance, Marks, Fees, Homework, Notices, Timetable, Transport, Support aur admin-management UI abhi Supabase tables ke saath end-to-end CRUD sync nahi karta. Login ke baad dashboard mein real data blank ho sakta hai; is build ko real school operations ya production student records ke liye abhi use na karein. Agle phase mein har module ko exact live schema + RLS ke saath wire aur role-wise test karna hoga.

## Existing Supabase account ki requirements
1. Supabase Authentication → Users mein user account hona chahiye.
2. `public.profiles.id` us Auth user's UID ke exactly equal hona chahiye.
3. `profiles.role` supported values mein ho: `super_admin`, `school_admin`, `teacher`, `parent`, `student`, `bus_driver` (legacy `driver` bhi mapped hai).
4. School users ke liye `profiles.school_id` valid school row ko point kare.
5. Student/teacher/parent dashboards ke liye respective table mein `profile_id = auth.uid()` linked row honi chahiye.

## Security
- Frontend mein sirf publishable key hai. `service_role` / secret key kabhi browser, GitHub ya HTML mein mat daalein.
- Actual data authorization Supabase RLS policies se hota hai; UI role checks security boundary nahi hain.
- Account creation/invitations aur password reset ke liye trusted server-side Edge Function/admin workflow abhi alag se banana hai.

## GitHub Pages
Repository root mein `index.html`, `auth-integration.js`, `supabase-config.js`, `.github/workflows/` aur baaki files upload karein. GitHub Pages ko GitHub Actions workflow se deploy karein.

## SQL note
Is package ka purana `supabase/schema.sql` historical starter migration hai aur current audited live database ke liye authoritative schema nahi hai. Use abhi run na karein. Current live schema/RLS audit ke mutabik hi future migrations banengi.
