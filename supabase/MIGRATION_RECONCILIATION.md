# Supabase migration reconciliation

This manifest records the migrations reported as applied by the live Supabase project at the time of the audit. It is **not** a replacement for the original migration SQL files.

## Applied migration history

| Version | Name |
|---|---|
| 202611020001 | login_lockout |
| 202611030001 | school_operations_security |
| 202611060001 | atomic_school_approval |
| 202611070001 | fee_payment_integrity |
| 202611100001 | harden_rls_helper_privileges |
| 20261112121303 | disable_temporary_login_lockouts |
| 20261112130610 | expand_school_registration_details |
| 20261112130713 | copy_registration_details_on_approval |
| 20261112183918 | add_supported_languages_to_school_registration |
| 20261117184139 | school_wise_fee_structures |
| 20261117192445 | school_payment_settings_and_verified_transactions |
| 20261117193037 | restrict_fee_collection_to_school_admin |
| 20261117193448 | payment_transactions_server_only |
| 20261122101153 | add_missing_fee_foreign_key_indexes |
| 20261122101343 | optimize_fee_structures_insert_rls_policy |
| 20261122124016 | add_biometric_device_registry_and_student_mapping |
| 20261122194748 | add_login_ids_and_password_activation |

## Important reconciliation note

The live project reports 17 applied migrations, while this repository currently contains only the later file `20261123000100_add_login_ids_and_password_activation.sql`. The SQL source for the earlier 17 migration versions is not present in the repository and cannot be reconstructed safely from the migration history table alone. Do not mark these versions repaired by creating empty placeholder SQL files, and do not replay guessed DDL against production.

Before restoring migration source history, obtain the original migration files from the developer's working copy, release archives, or a verified backup. Compare each migration against the live schema, policies, functions, triggers, indexes, and grants. Then reconcile using a reviewed baseline or forward-only migrations.

## Current schema typing

`src/types/database.types.ts` is generated from the live Supabase project and provides a current schema type snapshot. It does not replace SQL migrations or capture all database security behavior.
