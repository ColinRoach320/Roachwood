-- Roachwood — track when a client was sent a portal invite.
--
-- Used by /admin/clients/[id] to swap the button between
-- "Send portal invite" and "Resend portal invite" + show the last
-- send date. Set by the sendPortalInvite server action immediately
-- after Resend accepts the message.

alter table public.clients
  add column if not exists portal_invited_at timestamptz;
