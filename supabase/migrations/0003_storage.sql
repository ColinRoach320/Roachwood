-- Roachwood — Storage bucket for documents.
-- Run after 0001 and 0002. The bucket itself is private (admin uploads via
-- service role; clients fetch via signed URLs from the server).

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- No storage RLS policies needed: all access goes through the Next.js
-- server using the service role key. If you later add direct browser
-- access, scope read policies to authenticated users joined through
-- public.documents → public.jobs → public.clients.profile_id.
