# Complete Digital World — एक बार में Supabase Security Fix

## इस पैकेज में क्या बदला

- पहले भेजी गई पाँचों Supabase CSV reports और Phase 4 project migrations को cross-check किया गया।
- Live reports में `activity_logs`, `school_request_rate_limits`, `school_requests`, `school_settings`, `support_ticket_rate_limits` missing थीं।
- `profiles_read` policy में Teacher को directory-wide profile access मिल रहा था; इसे हटाने वाली Phase 3 policy migration शामिल है।
- `current_school_id()` और `current_user_role()` के `anon EXECUTE` grants बाद की CSV में बंद दिखे। Consolidated script में ये restrictions भी कायम रखी गई हैं।
- Live table-grants report में login lockout tables पर authenticated CRUD grants दिखे; consolidated script इन्हें browser roles से revoke करती है और service_role को देती है।
- पाँचों project migrations सही क्रम में शामिल हैं: login lockout, school operations/security, atomic school approval, fee payment integrity, helper privilege hardening।

## चलाने का तरीका

1. पहले Supabase से database backup/export लें।
2. `supabase/ONE_TIME_CONSOLIDATED_SECURITY_FIX.sql` को पूरा Supabase SQL Editor में paste करके एक बार Run करें।
3. Run सफल होने पर नीचे के अंतिम result set को CSV में export करके review के लिए रखें।
4. अगर error आए तो दोबारा Run न करें; पूरा error message साझा करें। Transactional script होने के कारण SQL error पर changes rollback होने चाहिए।

## जरूरी सीमा

यह script database schema, policies, triggers और permissions बदलती है; यह read-only नहीं है। Static inspection किया गया है, लेकिन इस environment में PostgreSQL engine या आपके live Supabase database पर execution test संभव नहीं था। सफल Run और role-wise live tests के बिना production security certification नहीं दी जा सकती।

## पुराने file के बारे में

पहले दी गई `07_apply_school_security_fixes.sql` अधूरी consolidated copy थी; उसमें atomic school approval और fee-payment integrity migrations शामिल नहीं थीं। उसे run न करें। इस नई `ONE_TIME_CONSOLIDATED_SECURITY_FIX.sql` को ही use करें।
