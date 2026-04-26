-- Roachwood — Phase 2 storage buckets.
-- gallery: public (marketing photos load directly via getPublicUrl).
-- social:  private (admin-only drafts; signed URLs server-side).

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('social', 'social', false)
on conflict (id) do nothing;

-- Allow anyone to read from gallery so the public marketing page can
-- render <img> tags with the public CDN URL. Writes still go through
-- the service role (admin upload action).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and policyname = 'gallery public read'
  ) then
    create policy "gallery public read"
      on storage.objects for select
      using (bucket_id = 'gallery');
  end if;
end$$;
