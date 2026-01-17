---
description: Rules for Supabase Database Changes
---

# Supabase Database Migration Rules

1.  **NEVER** ask the user to manually run SQL in the Supabase Dashboard SQL Editor.
2.  **ALWAYS** create a migration file for any database schema change.
    *   Use the naming convention `YYYYMMDDHHMMSS_description.sql`.
    *   Place files in `supabase/migrations/`.
3.  **ALWAYS** apply the migration using `npx supabase db push` (or `npx supabase migration up` if applicable) immediately after creating the file.
4.  Verify the migration success programmatically if possible (e.g., checking for column existence).
