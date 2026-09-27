# Form schemas

Forms are data (`public.form_schemas`). The dedicated per-type post forms added on 2026-09-27 live at the end of
`supabase/seed/02_form_schemas.sql` as one `insert ... on conflict do update` statement, so re-running the seed updates them.

Rules (enforced by `FormSchema` in `packages/shared`): at most 4 basic fields, required fields only in basic,
no free text in basic, every form has a `location` field. Templates use `{{key}}` placeholders; option values are
rendered with their labels, amounts with ₹ formatting, `{{type}}` with the post type name; empty clauses are dropped.

To change a form: edit the row in the seed, then apply to the running DB with
`docker exec -i supabase_db_MobileApp psql -U postgres < supabase/seed/02_form_schemas.sql` (idempotent) — or `pnpm db:reset`.
