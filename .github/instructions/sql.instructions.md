---
applyTo: "supabase/migrations/**/*.sql,supabase/seed.sql"
---

- Every migration file starts with a comment block: purpose, affected tables, special notes.
- File naming: `YYYYMMDDHHmmss_short_description.sql` in UTC.
- Always enable RLS on new tables: `ALTER TABLE {name} ENABLE ROW LEVEL SECURITY;`
- User-facing tables get four policies: SELECT, INSERT, UPDATE, DELETE with `auth.uid() = user_id`.
- Use `gen_random_uuid()` for UUID defaults.
- Add `created_at TIMESTAMPTZ DEFAULT now()` to every table.
- Use `CHECK` constraints for enum columns instead of Postgres enums (easier to migrate).
- After writing a migration, always run `npx supabase db reset` to verify it applies cleanly.
