-- INS-41: Drop legacy tokens table
-- The tokens table had RLS enabled but NO policies, making it insecure.
-- All token management now uses the linked_accounts table.
-- The getTokens/saveTokens functions in lib/database/base.ts have been removed.

DROP TABLE IF EXISTS tokens;
