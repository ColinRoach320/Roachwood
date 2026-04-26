-- Roachwood — Phase 2: content management.
-- Tables for testimonials, gallery, social posts, and a singleton
-- site_settings row. Public RLS allows the marketing site (anon role)
-- to read visible rows directly.

-- ============================================================
-- testimonials
-- ============================================================
create table if not exists public.testimonials (
  id            uuid primary key default uuid_generate_v4(),
  client_name   text not null,
  location      text,
  quote         text not null,
  star_rating   int  not null default 5 check (star_rating between 1 and 5),
  project_type  text,
  visible       boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists testimonials_visible_idx on public.testimonials(visible);
create index if not exists testimonials_sort_idx on public.testimonials(sort_order, created_at);

-- ============================================================
-- gallery_items
-- ============================================================
create table if not exists public.gallery_items (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  description   text,
  service_type  text check (service_type in
                  ('kitchen','cabinetry','deck','interior','other')),
  storage_path  text not null,
  visible       boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists gallery_visible_idx on public.gallery_items(visible);
create index if not exists gallery_sort_idx on public.gallery_items(sort_order, created_at);

-- ============================================================
-- social_posts (drafts; not auto-publishing yet)
-- ============================================================
create table if not exists public.social_posts (
  id            uuid primary key default uuid_generate_v4(),
  job_id        uuid references public.jobs(id) on delete set null,
  platform      text not null check (platform in
                  ('instagram','facebook','houzz','other')),
  caption       text not null,
  hashtags      text,
  storage_path  text,
  status        text not null check (status in ('draft','posted')) default 'draft',
  posted_at     timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists social_status_idx on public.social_posts(status);
create index if not exists social_job_idx on public.social_posts(job_id);

-- ============================================================
-- site_settings — singleton row (id = 1)
-- ============================================================
create table if not exists public.site_settings (
  id            int primary key default 1 check (id = 1),
  phone         text,
  email         text,
  service_area  text,
  tagline       text,
  updated_at    timestamptz not null default now()
);

insert into public.site_settings (id, phone, email, service_area, tagline)
values (1,
        '(586) 344-0982',
        'info@roachwood.co',
        'Scottsdale & Greater Phoenix Area',
        'Built right. Made to last.')
on conflict (id) do nothing;

-- updated_at trigger
drop trigger if exists site_settings_touch on public.site_settings;
create trigger site_settings_touch
  before update on public.site_settings
  for each row execute procedure public.touch_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.testimonials   enable row level security;
alter table public.gallery_items  enable row level security;
alter table public.social_posts   enable row level security;
alter table public.site_settings  enable row level security;

-- Public reads (anon + authenticated): only visible rows on testimonials
-- and gallery; settings are always readable.
drop policy if exists "testimonials public read" on public.testimonials;
create policy "testimonials public read"
  on public.testimonials for select
  using (visible = true);

drop policy if exists "testimonials admin all" on public.testimonials;
create policy "testimonials admin all"
  on public.testimonials for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "gallery public read" on public.gallery_items;
create policy "gallery public read"
  on public.gallery_items for select
  using (visible = true);

drop policy if exists "gallery admin all" on public.gallery_items;
create policy "gallery admin all"
  on public.gallery_items for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "site_settings public read" on public.site_settings;
create policy "site_settings public read"
  on public.site_settings for select
  using (true);

drop policy if exists "site_settings admin write" on public.site_settings;
create policy "site_settings admin write"
  on public.site_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- Social posts are workshop-internal: admin only.
drop policy if exists "social_posts admin all" on public.social_posts;
create policy "social_posts admin all"
  on public.social_posts for all
  using (public.is_admin())
  with check (public.is_admin());
