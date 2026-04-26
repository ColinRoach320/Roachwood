-- Roachwood — Phase 2 builder-first portal
-- - Renames gallery_items → gallery_photos (matches the live schema)
-- - Adds documents.kind so progress photos and PDFs can share one table
-- - Adds design_ideas (client-uploaded inspiration)
-- - Adds messages (two-way notes between client and Colin)

-- ============================================================
-- gallery_items → gallery_photos
-- ============================================================
do $$
begin
  if exists (select 1 from pg_class where relname = 'gallery_items') then
    execute 'alter table public.gallery_items rename to gallery_photos';
  end if;
end$$;

-- Recreate indexes/policies under the new name if the rename happened.
-- (alter table rename keeps existing policies/indexes attached, but their
-- names retain the old prefix; this is cosmetic and safe to leave.)

-- ============================================================
-- documents: split photos vs files
-- ============================================================
alter table public.documents
  add column if not exists kind text not null default 'document'
    check (kind in ('document','photo'));

create index if not exists documents_kind_idx on public.documents(kind);

-- ============================================================
-- design_ideas (client-driven inspiration)
-- ============================================================
create table if not exists public.design_ideas (
  id            uuid primary key default uuid_generate_v4(),
  job_id        uuid not null references public.jobs(id) on delete cascade,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  title         text,
  notes         text,
  image_url     text,        -- pasted URL
  storage_path  text,        -- uploaded blob (one of url / path is set)
  created_at    timestamptz not null default now()
);

create index if not exists design_ideas_job_idx on public.design_ideas(job_id);

alter table public.design_ideas enable row level security;

drop policy if exists "design_ideas admin all" on public.design_ideas;
create policy "design_ideas admin all"
  on public.design_ideas for all
  using (public.is_admin())
  with check (public.is_admin());

-- Clients can read + insert design ideas on their own jobs.
drop policy if exists "design_ideas client read" on public.design_ideas;
create policy "design_ideas client read"
  on public.design_ideas for select
  using (
    exists (
      select 1 from public.jobs j
      join public.clients c on c.id = j.client_id
      where j.id = design_ideas.job_id
        and c.profile_id = auth.uid()
    )
  );

drop policy if exists "design_ideas client insert" on public.design_ideas;
create policy "design_ideas client insert"
  on public.design_ideas for insert
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.jobs j
      join public.clients c on c.id = j.client_id
      where j.id = design_ideas.job_id
        and c.profile_id = auth.uid()
    )
  );

drop policy if exists "design_ideas client delete" on public.design_ideas;
create policy "design_ideas client delete"
  on public.design_ideas for delete
  using (uploaded_by = auth.uid());

-- ============================================================
-- messages (two-way job thread)
-- ============================================================
create table if not exists public.messages (
  id          uuid primary key default uuid_generate_v4(),
  job_id      uuid not null references public.jobs(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists messages_job_idx on public.messages(job_id, created_at);
create index if not exists messages_sender_idx on public.messages(sender_id);

alter table public.messages enable row level security;

drop policy if exists "messages admin all" on public.messages;
create policy "messages admin all"
  on public.messages for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "messages client read" on public.messages;
create policy "messages client read"
  on public.messages for select
  using (
    exists (
      select 1 from public.jobs j
      join public.clients c on c.id = j.client_id
      where j.id = messages.job_id
        and c.profile_id = auth.uid()
    )
  );

drop policy if exists "messages client insert" on public.messages;
create policy "messages client insert"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.jobs j
      join public.clients c on c.id = j.client_id
      where j.id = messages.job_id
        and c.profile_id = auth.uid()
    )
  );

-- ============================================================
-- design-ideas storage bucket (private)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('design-ideas', 'design-ideas', false)
on conflict (id) do nothing;
