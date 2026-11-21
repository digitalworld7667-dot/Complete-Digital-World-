# अतिरिक्त जाँच और सुधार (06-11-2026)

## किए गए वास्तविक checks
- `node --check app.js`: PASS
- `.github/workflows/*.yml` YAML parse: PASS
- Frontend के पाँचों `functions.invoke()` नामों का Supabase Function folders से मिलान: PASS
- `supabase/config.toml` में पाँचों Function entries का मिलान: PASS
- Approval RPC में transaction-based function, `FOR UPDATE` row lock, active Super Admin validation और `service_role`-only execute grant: static checks PASS

## मिला हुआ mismatch और सुधार
- पुरानी `SUPABASE_SCHEMA_INVENTORY.csv` में migration द्वारा बनाई गई पाँच tables (`school_requests`, `activity_logs`, `school_settings`, `school_request_rate_limits`, `support_ticket_rate_limits`) नहीं थीं।
- Inventory में इन tables के columns, types, defaults और nullability entries जोड़ी गईं।

## अभी भी इस environment में निष्पादित नहीं हो सके
- `deno check` / Edge Function runtime tests: Deno उपलब्ध नहीं।
- PostgreSQL migration execution / SQL lint: `psql`/Supabase CLI उपलब्ध नहीं।
- Live RLS role tests, Auth invite/reset/ban tests: live project credentials और test users उपलब्ध नहीं।
- GitHub Actions execution: repository push/runner access उपलब्ध नहीं।

इनको PASS नहीं माना गया है।
