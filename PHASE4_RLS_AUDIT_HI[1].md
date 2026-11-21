# Complete Digital World — Phase 4 RLS Audit Kit

तारीख: 10 नवंबर 2026

## इस चरण में किया गया काम

- Phase 3 package की वास्तविक ZIP दोबारा extract करके files और SQL migration contents inspect किए।
- `SUPABASE_SCHEMA_INVENTORY.csv` से `support_tickets`, `students`, `teachers`, `parents`, `buses`, `teacher_class_assignments`, `fees` और `fee_payments` के relevant columns/constraints cross-check किए।
- `provision-user` में teacher assignment का `ON CONFLICT (teacher_id,school_id,class_name)` unique index से match verify किया।
- `submit-support-ticket` के fields को inventory से match verify किया।
- `admin-account-action` में active-admin check, school-scope check, account deactivation rollback और permanent-delete block inspect किए।
- Read-only diagnostic SQL जोड़ी: `supabase/diagnostics/rls_access_audit.sql`। यह RLS enablement, all policies, browser-role table grants, SECURITY DEFINER function execute grants और missing-RLS tables दिखाती है।

## अभी तक मिले verified points

1. Inventory में `support_tickets` के `requester_name`, `requester_contact`, `category`, `subject`, `message`, `school_id`, `status`, `requester_profile_id` fields मौजूद हैं; support Edge Function इन्हीं fields को insert करती है।
2. `teacher_class_assignments` पर `(teacher_id, school_id, class_name)` unique index मौजूद है; teacher provisioning का upsert conflict target उससे match करता है।
3. Account status endpoint केवल `active`/`inactive` स्वीकार करता है, caller का active admin profile जाँचता है, School Admin को अपने school तक सीमित करता है और Super Admin profile को बदलने से रोकता है।
4. Public support submission service-role Edge Function से होती है और rate-limit RPC call करती है; browser से service-role key इस्तेमाल नहीं होती।

## अभी भी जरूरी सावधानी

- उपलब्ध schema inventory में `pg_policies`/पूर्ण RLS policy export शामिल नहीं है। इसलिए पुराने base-schema policies का role-by-role access अभी प्रमाणित नहीं किया जा सकता।
- PostgreSQL/Supabase CLI runtime उपलब्ध न होने के कारण SQL engine execution नहीं हुआ।
- Live project credentials और test accounts उपलब्ध नहीं हैं; वास्तविक Super Admin, School Admin, Teacher, Parent, Student और Driver JWT के साथ RLS tests नहीं चले।
- `rls_access_audit.sql` read-only है। इसे Supabase SQL Editor में चलाकर पूरा output सुरक्षित रखें और review के लिए दें।

## अगला अनिवार्य परीक्षण

हर role से दूसरे school के records पढ़ने/बदलने की कोशिश करें; अपेक्षित परिणाम zero rows या permission denied होना चाहिए। Parent केवल linked student, Student केवल अपना record, Teacher केवल assigned classes, Driver केवल assigned bus/route, School Admin केवल अपने school और Super Admin केवल platform-wide admin operations कर सके।

**स्थिति:** Package static review आगे बढ़ा है; live RLS certification अभी बाकी है।
