-- Roachwood — change orders.
--
-- Scope-change documents on a job. Same shape as estimates (line items
-- + tax + totals) but with their own status flow and a co_number for
-- per-job sequencing on the PDF (CO-1, CO-2, CO-3 …).
--
-- Status lifecycle:
--   draft     — being written up
--   sent      — emailed/printed to the client
--   approved  — client approved; total is added to jobs.estimated_value
--   declined  — client declined the change
--
-- Client-side approval flips approved_at + stamps approved_by; a
-- trigger then bumps the parent job's estimated_value by the change
-- order's total exactly once (idempotent — guarded by checking the
-- previous status so re-running an UPDATE doesn't double-count).

create table public.change_orders (
  id              uuid primary key default uuid_generate_v4(),
  job_id          uuid not null references public.jobs(id) on delete cascade,
  co_number       integer not null,
  title           text not null,
  description     text,
  status          text not null check (status in
                    ('draft', 'sent', 'approved', 'declined'))
                    default 'draft',
  line_items      jsonb not null default '[]'::jsonb,
  subtotal        numeric(12, 2) not null default 0,
  tax_rate        numeric(5, 2) not null default 0,
  tax_amount      numeric(12, 2) not null default 0,
  total           numeric(12, 2) not null default 0,
  notes           text,
  approved_by     uuid references public.profiles(id) on delete set null,
  approved_at     timestamptz,
  declined_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (job_id, co_number)
);

create index change_orders_job_id_idx on public.change_orders(job_id);
create index change_orders_status_idx on public.change_orders(status);

create trigger change_orders_touch_updated_at
  before update on public.change_orders
  for each row execute procedure public.touch_updated_at();

-- Auto-assign per-job CO numbers on insert. Counts existing rows for
-- the job and adds 1. Race-safe enough for Roachwood's volume; the
-- (job_id, co_number) unique index will throw on the rare double-
-- insert and the action retries.
create or replace function public.assign_change_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.co_number is null or new.co_number = 0 then
    select coalesce(max(co_number), 0) + 1
      into new.co_number
      from public.change_orders
     where job_id = new.job_id;
  end if;
  return new;
end;
$$;

create trigger change_orders_assign_number
  before insert on public.change_orders
  for each row execute procedure public.assign_change_order_number();

-- When a CO transitions to approved, bump the parent job's estimated
-- value by total. When it transitions OUT of approved (e.g., reverted
-- to draft, declined post-approval), back the value out. Status pairs
-- (draft→sent, sent→declined, etc.) that don't touch approval don't
-- modify the job.
create or replace function public.change_order_apply_to_job()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'UPDATE') then
    if new.status = 'approved' and old.status <> 'approved' then
      update public.jobs
         set estimated_value = coalesce(estimated_value, 0) + new.total
       where id = new.job_id;
    elsif old.status = 'approved' and new.status <> 'approved' then
      update public.jobs
         set estimated_value = coalesce(estimated_value, 0) - old.total
       where id = new.job_id;
    end if;
  elsif (tg_op = 'INSERT' and new.status = 'approved') then
    update public.jobs
       set estimated_value = coalesce(estimated_value, 0) + new.total
     where id = new.job_id;
  end if;
  return new;
end;
$$;

create trigger change_orders_apply_to_job
  after insert or update on public.change_orders
  for each row execute procedure public.change_order_apply_to_job();

-- ============================================================
-- RLS
-- ============================================================
alter table public.change_orders enable row level security;

drop policy if exists "change_orders admin all" on public.change_orders;
create policy "change_orders admin all"
  on public.change_orders for all
  using (public.is_admin())
  with check (public.is_admin());

-- Clients can read change orders that have been sent (or are
-- approved/declined) on their own jobs. Drafts stay internal.
drop policy if exists "change_orders client read" on public.change_orders;
create policy "change_orders client read"
  on public.change_orders for select
  using (
    status in ('sent', 'approved', 'declined')
    and exists (
      select 1
        from public.jobs j
        join public.clients c on c.id = j.client_id
       where j.id = change_orders.job_id
         and c.profile_id = auth.uid()
    )
  );

-- Clients can update their OWN pending change order to approved or
-- declined. The trigger handles the job-value math.
drop policy if exists "change_orders client decide" on public.change_orders;
create policy "change_orders client decide"
  on public.change_orders for update
  using (
    status = 'sent'
    and exists (
      select 1
        from public.jobs j
        join public.clients c on c.id = j.client_id
       where j.id = change_orders.job_id
         and c.profile_id = auth.uid()
    )
  )
  with check (
    status in ('approved', 'declined')
    and exists (
      select 1
        from public.jobs j
        join public.clients c on c.id = j.client_id
       where j.id = change_orders.job_id
         and c.profile_id = auth.uid()
    )
  );
