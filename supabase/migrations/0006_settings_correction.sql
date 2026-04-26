-- Roachwood — corrects the seeded site_settings row to the real phone
-- number and email. Idempotent — safe to re-run.

update public.site_settings
   set phone = '(586) 344-0982',
       email = 'info@roachwood.co'
 where id = 1;
