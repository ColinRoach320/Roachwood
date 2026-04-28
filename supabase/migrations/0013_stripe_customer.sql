-- Roachwood — link Supabase profiles to Stripe customers.
--
-- We attach the Stripe customer id to the profile (not the client row)
-- because payments are tied to the logged-in account, and a future
-- multi-client owner under one login should still pay from one card
-- on file.
--
-- The id is created lazily on the first /portal/payments page visit
-- (see lib/stripe-customer.ts ensureStripeCustomer). Idempotent.

alter table public.profiles
  add column if not exists stripe_customer_id text;

create index if not exists profiles_stripe_customer_id_idx
  on public.profiles(stripe_customer_id);
