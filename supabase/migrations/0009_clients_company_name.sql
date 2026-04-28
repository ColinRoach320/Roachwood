-- Roachwood — restore clients.company_name on production.
--
-- The column is defined in 0001_init.sql but is missing from the
-- production database (confirmed via Supabase error 42703 on
-- /admin/clients/[id]). The codebase references it in 20+ places:
-- PDF templates, every detail page, every form, the Client type, and
-- the create/update client actions. Removing it from code would lose
-- the "Company" field that clients are already expected to fill out.
--
-- Idempotent: safe to re-run on any environment.

alter table public.clients add column if not exists company_name text;
