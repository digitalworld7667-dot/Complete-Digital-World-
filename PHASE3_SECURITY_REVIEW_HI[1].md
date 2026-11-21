# Complete Digital World — Phase 3 Security Review

तारीख: 10 नवंबर 2026

## इस चरण में मिले और ठीक किए गए मुद्दे

### 1. RLS helper functions की public execute permission
- `202611030001_school_operations_security.sql` में कई `SECURITY DEFINER` helper functions बनाई गई थीं, लेकिन सभी के लिए `PUBLIC`/`anon` execute permission explicitly हटाई नहीं गई थी।
- नई migration `202611100001_harden_rls_helper_privileges.sql` इन helper functions को केवल `authenticated` और `service_role` तक सीमित करती है।
- `touch_updated_at()` trigger-only function को direct RPC execution से भी बंद किया गया है।

### 2. Teacher profile directory exposure
- पुरानी `profiles_read` policy में Teacher को अपने school के सभी profiles पढ़ने की अनुमति थी।
- Frontend review में Teacher workflow के लिए profile directory query नहीं मिली; roster data `students` table से आता है।
- नई migration Teacher को केवल अपना profile पढ़ने देती है। Super Admin और उसी school का School Admin अपना पूर्व आवश्यक access रखते हैं।

### 3. Permanent account deletion से linked records का जोखिम
- पुराना `delete_account` action Supabase Auth user को hard-delete करता था। Student/Teacher/Parent/Bus/Fees/Attendance जैसी linked records की foreign-key dependencies के कारण यह fail हो सकता था या audit/history preservation को नुकसान पहुँचा सकता था।
- Frontend से permanent Delete button हटाया गया है। Backend अब `delete_account` action को HTTP 409 के साथ रोकता है और `set_account_status: inactive` इस्तेमाल करने को कहता है। इससे login block होता है और academic/financial history बनी रहती है।

## Migration order (updated)

1. `202611020001_login_lockout.sql`
2. `202611030001_school_operations_security.sql`
3. `202611060001_atomic_school_approval.sql`
4. `202611070001_fee_payment_integrity.sql`
5. `202611100001_harden_rls_helper_privileges.sql`

## Checks

- `node --check app.js`: PASS
- TypeScript files transpile/syntax check: PASS (यह Deno runtime/type check नहीं है)
- YAML workflow parse: PASS
- SQL migration dependency and object-name static review: completed
- PostgreSQL engine execution: NOT RUN (psql/Supabase CLI unavailable)
- Live Supabase RLS/Auth tests: NOT RUN (project credentials/test accounts unavailable)

## Important limitation

`SUPABASE_SCHEMA_INVENTORY.csv` में table columns/constraints हैं, लेकिन complete `pg_policies` export मौजूद नहीं है। इसलिए पुराने base-schema policies की पूर्ण role-by-role correctness इस ZIP से अकेले certify नहीं की जा सकती। नई policy changes static review किए गए हैं; live project पर apply/test करना बाकी है।

## Status

Package-level fixes are included. Production-ready / live-verified का दावा नहीं किया जा रहा। पहले backup लेकर migrations को staging या Supabase SQL editor में क्रम से verify करना होगा, फिर Super Admin, School Admin, Teacher, Parent, Student और Driver accounts से RLS tests करने होंगे।
