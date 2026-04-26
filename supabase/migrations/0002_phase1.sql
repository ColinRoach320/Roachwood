-- Roachwood — Phase 1: estimates, invoices, expenses
-- These tables already exist in the live project; this file captures them
-- so the schema is reproducible from the migrations/ folder. Safe to re-run.

-- ============================================================
-- estimates
-- ============================================================
create table if not exists public.estimates (
  id           uuid primary key default uuid_generate_v4(),
  job_id       uuid not null references public.jobs(id) on delete cascade,
  title        text not null,
  line_items   jsonb not null default '[]'::jsonb,
  subtotal     numeric(12,2) not null default 0,
  tax_rate     numeric(5,4)  not null default 0,
  tax_amount   numeric(12,2) not null default 0,
  total        numeric(12,2) not null default 0,
  notes        text,
  status       text not null check (status in ('draft','sent','approved','declined')) default 'draft',
  created_at   timestamptz not null default now()
);

create index if not exists estimates_job_id_idx on public.estimates(job_id);
create index if not exists estimates_status_idx on public.estimates(status);

-- ============================================================
-- invoices
-- ============================================================
create table if not exists public.invoices (
  id                       uuid primary key default uuid_generate_v4(),
  job_id                   uuid not null references public.jobs(id) on delete cascade,
  estimate_id              uuid references public.estimates(id) on delete set null,
  title                    text not null,
  line_items               jsonb not null default '[]'::jsonb,
  subtotal                 numeric(12,2) not null default 0,
  tax_rate                 numeric(5,4)  not null default 0,
  tax_amount               numeric(12,2) not null default 0,
  total                    numeric(12,2) not null default 0,
  amount_paid              numeric(12,2) not null default 0,
  notes                    text,
  due_date                 date,
  status                   text not null check (status in ('draft','sent','paid','overdue')) default 'draft',
  stripe_payment_link      text,
  stripe_payment_intent_id text,
  paid_at                  timestamptz,
  created_at               timestamptz not null default now()
);

create index if not exists invoices_job_id_idx on public.invoices(job_id);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists invoices_estimate_id_idx on public.invoices(estimate_id);

-- ============================================================
-- expenses
-- ============================================================
create table if not exists public.expenses (
  id          uuid primary key default uuid_generate_v4(),
  job_id      uuid not null references public.jobs(id) on delete cascade,
  category    text check (category in ('materials','labor','subcontractor','equipment','other')),
  vendor      text,
  amount      numeric(12,2) not null,
  date        date not null default current_date,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists expenses_job_id_idx on public.expenses(job_id);
create index if not exists expenses_date_idx on public.expenses(date);

-- ============================================================
-- RLS — admins full access; clients can read estimates/invoices on
-- their own jobs (expenses are workshop-internal: admin-only).
-- ============================================================
alter table public.estimates enable row level security;
alter table public.invoices  enable row level security;
alter table public.expenses  enable row level security;

drop policy if exists "estimates admin all" on public.estimates;
create policy "estimates admin all"
  on public.estimates for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "estimates client read" on public.estimates;
create policy "estimates client read"
  on public.estimates for select
  using (
    exists (
      select 1 from public.jobs j
      join public.clients c on c.id = j.client_id
      where j.id = estimates.job_id
        and c.profile_id = auth.uid()
    )
  );

drop policy if exists "invoices admin all" on public.invoices;
create policy "invoices admin all"
  on public.invoices for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "invoices client read" on public.invoices;
create policy "invoices client read"
  on public.invoices for select
  using (
    exists (
      select 1 from public.jobs j
      join public.clients c on c.id = j.client_id
      where j.id = invoices.job_id
        and c.profile_id = auth.uid()
    )
  );

drop policy if exists "expenses admin all" on public.expenses;
create policy "expenses admin all"
  on public.expenses for all
  using (public.is_admin())
  with check (public.is_admin());
