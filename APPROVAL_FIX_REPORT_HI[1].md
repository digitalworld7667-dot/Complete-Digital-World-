# School Approval Fix Report

## सुधार
- नए schools के `approval_status` का database default `pending` है; migration में पहले से मौजूद schools को approved मानकर preserve किया गया है।
- School request approval/rejection अब `review_school_request_atomic` RPC के जरिए एक database transaction में होता है।
- Request row `FOR UPDATE` से lock होती है, इसलिए एक pending request को दो admins एक साथ approve नहीं कर सकते।
- RPC केवल active `super_admin` profile वाले reviewer को स्वीकार करता है और केवल `service_role` execute कर सकता है।
- Edge Function अब सीधे school create और request update नहीं करती; atomic RPC call करती है।

## जरूरी सीमा
यह code-level सुधार है। इस environment में आपके Supabase project से connection/credentials उपलब्ध नहीं हैं, इसलिए migration को आपके live database पर चलाया या live approval flow test नहीं किया गया। Deployment से पहले backup लेकर नई migration deploy करें और staging में pending -> approved तथा pending -> rejected दोनों flows test करें।
