-- Roachwood — subcontractors + payment tracking.
--
-- Trades, contact info, W-9 status, and a payments ledger Colin can
-- use to track who's been paid what — and whether they cross the
-- $600 threshold that triggers a 1099 at year-end.

create table public.subcontractors (
  id            uuid primary key default uuid_generate_v4(),
  company_name  text,
  contact_name  text not null,
  email         text,
  phone         text,
  trade         text not null check (trade in (
                  'electrical', 'plumbing', 'hvac', 'framing',
                  'drywall', 'painting', 'flooring', 'roofing',
                  'concrete', 'landscaping', 'cleaning', 'other'
                )),
  rate_type     text check (rate_type in ('hourly', 'daily', 'project')) default 'hourly',
  rate          numeric(12, 2),
  tax_id        text,                       -- EIN or SSN (sensitive)
  w9_on_file    boolean not null default false,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index subcontractors_trade_idx on public.subcontractors(trade);
create index subcontractors_w9_idx on public.subcontractors(w9_on_file);

create trigger subcontractors_touch_updated_at
  before update on public.subcontractors
  for each row execute procedure public.touch_updated_at();

-- Payments ledger. job_id is optional because Colin sometimes pays
-- subs for prep / off-job work. Cascade-delete on subcontractor so
-- removing a sub clears their history; set-null on job so deleting a
-- job preserves the payment record (it still happened).
create table public.subcontractor_payments (
  id              uuid primary key default uuid_generate_v4(),
  subcontractor_id uuid not null references public.subcontractors(id) on delete cascade,
  job_id          uuid references public.jobs(id) on delete set null,
  amount          numeric(12, 2) not null check (amount > 0),
  date            date not null default current_date,
  description     text,
  created_at      timestamptz not null default now()
);

create index subcontractor_payments_sub_idx on public.subcontractor_payments(subcontractor_id);
create index subcontractor_payments_job_idx on public.subcontractor_payments(job_id);
create index subcontractor_payments_date_idx on public.subcontractor_payments(date);

-- ============================================================
-- RLS — admin-only. Subs aren't clients; they don't see anything.
-- ============================================================
alter table public.subcontractors enable row level security;
alter table public.subcontractor_payments enable row level security;

drop policy if exists "subcontractors admin all" on public.subcontractors;
create policy "subcontractors admin all"
  on public.subcontractors for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "subcontractor_payments admin all" on public.subcontractor_payments;
create policy "subcontractor_payments admin all"
  on public.subcontractor_payments for all
  using (public.is_admin())
  with check (public.is_admin());
