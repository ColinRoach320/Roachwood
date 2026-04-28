-- Roachwood — team roles.
--
-- Adds two new roles to profiles:
--   super_admin — full access including team management + billing
--   staff       — read-only across jobs/clients, can post updates +
--                  photos. (Per-page enforcement is FUTURE work; this
--                  migration only adds the role to the schema so the
--                  team UI can assign it.)
--
-- is_admin() expands to include super_admin so existing RLS policies
-- automatically extend access to super admins. A separate
-- is_super_admin() helper exists for super-admin-only operations
-- (team management, billing visibility).
--
-- Seeds timroach@gmail.com and colinpatrickroach@gmail.com to
-- super_admin if they have profile rows. Idempotent.

-- Drop the old constraint and re-add with the expanded set.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'super_admin', 'staff', 'client'));

-- is_admin() — true for both admin and super_admin so existing RLS
-- policies continue to grant full access to admins of any flavor.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
  );
$$;

-- is_super_admin() — for team-management gates that admin shouldn't see.
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

-- Seed Tim + Colin to super_admin. Joins through auth.users to find
-- the profile row by email — works whether the profile was auto-
-- created via the on_auth_user_created trigger or seeded manually.
update public.profiles p
   set role = 'super_admin'
  from auth.users u
 where p.id = u.id
   and u.email in ('timroach@gmail.com', 'colinpatrickroach@gmail.com');
