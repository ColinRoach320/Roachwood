-- Roachwood — review + social URLs on site_settings.
--
-- Colin enters these once in /admin/content/settings. They populate
-- the marketing footer (Instagram + Houzz) and the job-complete email
-- (Google review, Houzz, Instagram).

alter table public.site_settings
  add column if not exists google_review_url text;
alter table public.site_settings
  add column if not exists houzz_url text;
alter table public.site_settings
  add column if not exists instagram_url text;
