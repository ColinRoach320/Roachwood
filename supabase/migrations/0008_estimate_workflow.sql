-- Roachwood — estimate-first workflow
--
-- The act of creating an estimate now creates the client + a job for
-- them, so Colin's client database grows as a side-effect of his normal
-- estimating work. Status vocabulary changes to match:
--
--   estimates: draft | sent | won | lost | no_response
--   jobs:      adds 'lead' and 'active' alongside the existing values
--
-- When an estimate is marked "won", the linked job flips to "active";
-- "lost" / "no_response" leave the job in whatever state it's in
-- (typically "lead") so Colin can still market to the client later.

-- ============================================================
-- estimates: data migration first, THEN constraint swap
-- (any existing row in approved/declined would otherwise fail the
-- new check)
-- ============================================================
update public.estimates set status = 'won'  where status = 'approved';
update public.estimates set status = 'lost' where status = 'declined';

alter table public.estimates drop constraint if exists estimates_status_check;
alter table public.estimates
  add constraint estimates_status_check
  check (status in ('draft','sent','won','lost','no_response'));

-- ============================================================
-- jobs: additive — keep existing values, add the two new buckets
-- ============================================================
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs
  add constraint jobs_status_check
  check (status in (
    'lead',
    'active',
    'quoted',
    'approved',
    'in_progress',
    'on_hold',
    'completed',
    'cancelled'
  ));
