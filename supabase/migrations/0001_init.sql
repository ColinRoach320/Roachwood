-- Roach Wood — initial schema
-- Run via Supabase SQL editor or `supabase db push`.

create extension if not exists "uuid-ossp";

-- ============================================================
-- profiles (linked to auth.users)
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  role        text not null check (role in ('admin','client')) default 'client',
  full_name   text,
  email       text,
  phone       text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- clients
-- ============================================================
create table public.clients (
  id            uuid primary key default uuid_generate_v4(),
  profile_id    uuid references public.profiles(id) on delete set null,
  company_name  text,
  contact_name  text not null,
  email         text,
  phone         text,
  address       text,
  notes         text,
  created_at    timestamptz not null default now()
);

create index clients_profile_id_idx on public.clients(profile_id);

-- ============================================================
-- jobs
-- ============================================================
create table public.jobs (
  id               uuid primary key default uuid_generate_v4(),
  client_id        uuid not null references public.clients(id) on delete cascade,
  title            text not null,
  description      text,
  status           text not null check (status in
                     ('quoted','approved','in_progress','on_hold','completed','cancelled'))
                     default 'quoted',
  start_date       date,
  end_date         date,
  estimated_value  numeric(12,2),
  address          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index jobs_client_id_idx on public.jobs(client_id);
create index jobs_status_idx on public.jobs(status);

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger jobs_touch_updated_at
  before update on public.jobs
  for each row execute procedure public.touch_updated_at();

-- ============================================================
-- job updates (workshop-side notes, optionally visible to client)
-- ============================================================
create table public.job_updates (
  id                 uuid primary key default uuid_generate_v4(),
  job_id             uuid not null references public.jobs(id) on delete cascade,
  author_id          uuid references public.profiles(id) on delete set null,
  body               text not null,
  visible_to_client  boolean not null default true,
  created_at         timestamptz not null default now()
);

create index job_updates_job_id_idx on public.job_updates(job_id);

-- ============================================================
-- approvals (client decision points)
-- ============================================================
create table public.approvals (
  id           uuid primary key default uuid_generate_v4(),
  job_id       uuid not null references public.jobs(id) on delete cascade,
  title        text not null,
  description  text,
  status       text not null check (status in ('pending','approved','rejected')) default 'pending',
  decided_by   uuid references public.profiles(id) on delete set null,
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index approvals_job_id_idx on public.approvals(job_id);
create index approvals_status_idx on public.approvals(status);

-- ============================================================
-- documents (metadata; binary lives in Storage bucket "documents")
-- ============================================================
create table public.documents (
  id                 uuid primary key default uuid_generate_v4(),
  job_id             uuid references public.jobs(id) on delete cascade,
  name               text not null,
  storage_path       text not null,
  visible_to_client  boolean not null default true,
  uploaded_by        uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now()
);

create index documents_job_id_idx on public.documents(job_id);

-- ============================================================
-- helper: is_admin()
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- new-user trigger: auto-create a profile row
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles    enable row level security;
alter table public.clients     enable row level security;
alter table public.jobs        enable row level security;
alter table public.job_updates enable row level security;
alter table public.approvals   enable row level security;
alter table public.documents   enable row level security;

-- profiles: users can read their own row; admins can do anything
create policy "profiles self-read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles admin all"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- clients: admins all; clients can read the row tied to their profile
create policy "clients admin all"
  on public.clients for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "clients self read"
  on public.clients for select
  using (profile_id = auth.uid());

-- jobs: admins all; client reads jobs belonging to their client row
create policy "jobs admin all"
  on public.jobs for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "jobs client read"
  on public.jobs for select
  using (
    exists (
      select 1 from public.clients c
      where c.id = jobs.client_id
        and c.profile_id = auth.uid()
    )
  );

-- job_updates: admins all; clients read only visible updates on their jobs
create policy "job_updates admin all"
  on public.job_updates for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "job_updates client read"
  on public.job_updates for select
  using (
    visible_to_client = true
    and exists (
      select 1 from public.jobs j
      join public.clients c on c.id = j.client_id
      where j.id = job_updates.job_id
        and c.profile_id = auth.uid()
    )
  );

-- approvals: admins all; clients read theirs; clients can decide their own pending approvals
create policy "approvals admin all"
  on public.approvals for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "approvals client read"
  on public.approvals for select
  using (
    exists (
      select 1 from public.jobs j
      join public.clients c on c.id = j.client_id
      where j.id = approvals.job_id
        and c.profile_id = auth.uid()
    )
  );

create policy "approvals client decide"
  on public.approvals for update
  using (
    status = 'pending'
    and exists (
      select 1 from public.jobs j
      join public.clients c on c.id = j.client_id
      where j.id = approvals.job_id
        and c.profile_id = auth.uid()
    )
  )
  with check (status in ('approved','rejected'));

-- documents: admins all; clients read only visible docs on their jobs
create policy "documents admin all"
  on public.documents for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "documents client read"
  on public.documents for select
  using (
    visible_to_client = true
    and exists (
      select 1 from public.jobs j
      join public.clients c on c.id = j.client_id
      where j.id = documents.job_id
        and c.profile_id = auth.uid()
    )
  );
