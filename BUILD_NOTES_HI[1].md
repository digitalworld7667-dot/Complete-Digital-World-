# Current build notes

- Repository se reference prototype aur uska browser-local login/sample credentials remove kar diya gaya hai.
- Koi seeded demo user, default Super Admin password, localStorage auth fallback ya demo reset feature nahi hai.
- First Super Admin ke liye manual, one-time Supabase SQL bootstrap script add ki gayi hai; password Supabase Auth mein hi set hota hai.
- Supabase school workflows, account status/reset/delete, activity logs, school settings, homework grading, fee-payment recalculation aur expanded student/parent/transport fields included hain.
- Production migration: `202611030001_school_operations_security.sql`.
- Five Edge Functions included; deploy and verify separately.
- No live Supabase migration, function deployment, SMTP delivery, GitHub deployment or role/RLS end-to-end test has been performed here.
