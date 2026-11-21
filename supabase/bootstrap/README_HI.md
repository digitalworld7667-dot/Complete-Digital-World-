# Pehla Super Admin kaise banayein

1. Supabase Dashboard → Authentication → Users mein trusted administrator ka Auth user create/invite karein. Password Supabase Auth handle karega; is repository mein password nahi rakha jayega.
2. Base schema aur `supabase/migrations/` ki required migrations apply karein.
3. `first_super_admin.sql` kholkar `REPLACE_WITH_YOUR_AUTH_USER_EMAIL` ko usi Auth user ke email se replace karein.
4. Supabase SQL Editor mein script ko **ek hi baar** run karein.
5. Script tabhi role banayegi jab database mein abhi koi `super_admin` profile na ho. Agar pehle se Super Admin hai toh script ruk jayegi.

Is SQL file ko GitHub par rakhna theek hai: ismein password, service-role key ya token nahi hai. Is script ko public registration endpoint se kabhi expose na karein. Super Admin role sirf trusted project owner ke manual bootstrap se assign hota hai.
