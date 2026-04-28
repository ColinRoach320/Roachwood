-- Roachwood — let clients approve/decline their own sent estimates
-- from the portal. Mirrors the change_orders client-decide policy.
--
-- Status flow on the client side:
--   sent → won   (client clicks Approve)
--   sent → lost  (client clicks Decline)

drop policy if exists "estimates client decide" on public.estimates;
create policy "estimates client decide"
  on public.estimates for update
  using (
    status = 'sent'
    and exists (
      select 1
        from public.jobs j
        join public.clients c on c.id = j.client_id
       where j.id = estimates.job_id
         and c.profile_id = auth.uid()
    )
  )
  with check (
    status in ('won', 'lost')
    and exists (
      select 1
        from public.jobs j
        join public.clients c on c.id = j.client_id
       where j.id = estimates.job_id
         and c.profile_id = auth.uid()
    )
  );
