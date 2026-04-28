-- Roachwood — partial payment draws on invoices.
--
-- A draw is one slice of an invoice — e.g. "30% deposit", "Framing
-- complete", "Final walkthrough". Each carries its own Stripe payment
-- link, status, paid timestamp, and amount_paid. Construction standard
-- pattern but Colin can use any number of draws and any split.
--
-- amount is the source of truth (that's what Stripe charges). The form
-- shows a derived percentage (amount / invoice.total * 100) but doesn't
-- store it — keeps the data model honest and prevents drift.
--
-- An after-trigger on invoice_draws keeps invoices.amount_paid + status
-- in sync, so "auto-flip to fully paid when every draw is paid" works
-- whether the payment came in via Stripe webhook or a manual mark.

create table public.invoice_draws (
  id              uuid primary key default uuid_generate_v4(),
  invoice_id      uuid not null references public.invoices(id) on delete cascade,
  position        smallint not null,
  label           text not null,
  amount          numeric(12, 2) not null check (amount >= 0),
  due_date        date,
  status          text not null
                    check (status in ('pending', 'sent', 'paid'))
                    default 'pending',
  stripe_payment_link text,
  stripe_payment_intent_id text,
  amount_paid     numeric(12, 2) not null default 0,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (invoice_id, position)
);

create index invoice_draws_invoice_id_idx on public.invoice_draws(invoice_id);
create index invoice_draws_status_idx on public.invoice_draws(status);

create trigger invoice_draws_touch_updated_at
  before update on public.invoice_draws
  for each row execute procedure public.touch_updated_at();

-- Recompute invoice.amount_paid + invoice.status from the draws after
-- any change. If no draws exist (single-payment invoice), do nothing —
-- the single-payment code path manages those fields itself.
create or replace function public.invoice_recalc_paid_from_draws()
returns trigger
language plpgsql
as $$
declare
  v_invoice_id uuid;
  v_paid numeric(12, 2);
  v_total numeric(12, 2);
  v_draws_count int;
  v_unpaid_count int;
begin
  v_invoice_id := coalesce(new.invoice_id, old.invoice_id);

  select coalesce(sum(amount_paid), 0),
         count(*),
         count(*) filter (where status <> 'paid')
    into v_paid, v_draws_count, v_unpaid_count
    from public.invoice_draws
   where invoice_id = v_invoice_id;

  if v_draws_count = 0 then
    return coalesce(new, old);
  end if;

  select total into v_total
    from public.invoices where id = v_invoice_id;

  update public.invoices
     set amount_paid = v_paid,
         status = case
           when v_unpaid_count = 0 and v_paid >= v_total - 0.005 then 'paid'
           else status
         end,
         paid_at = case
           when v_unpaid_count = 0 and v_paid >= v_total - 0.005 then now()
           else paid_at
         end
   where id = v_invoice_id;

  return coalesce(new, old);
end;
$$;

create trigger invoice_draws_recalc_paid
  after insert or update or delete on public.invoice_draws
  for each row execute procedure public.invoice_recalc_paid_from_draws();

-- ============================================================
-- RLS — same shape as invoices: admin all + client read on own jobs.
-- ============================================================
alter table public.invoice_draws enable row level security;

drop policy if exists "invoice_draws admin all" on public.invoice_draws;
create policy "invoice_draws admin all"
  on public.invoice_draws for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "invoice_draws client read" on public.invoice_draws;
create policy "invoice_draws client read"
  on public.invoice_draws for select
  using (
    exists (
      select 1
        from public.invoices i
        join public.jobs j on j.id = i.job_id
        join public.clients c on c.id = j.client_id
       where i.id = invoice_draws.invoice_id
         and c.profile_id = auth.uid()
    )
  );
