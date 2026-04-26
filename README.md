# Roachwood

Marketing site, admin portal, and client portal for **Roachwood** — a fine-carpentry / contractor business.

Built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase** (Auth, Postgres + RLS, Storage).

---

## Stack

| Layer    | Choice                                          |
| -------- | ----------------------------------------------- |
| Web      | Next.js 15 App Router, React 19, TypeScript     |
| Styling  | Tailwind CSS, custom charcoal/gold theme        |
| Auth     | Supabase Auth (email/password)                  |
| Database | Supabase Postgres with Row-Level Security       |
| Files    | Supabase Storage (planned: `documents` bucket)  |
| Icons    | `lucide-react`                                  |
| Fonts    | Inter (sans) + Playfair Display (display serif) |

## Routes

```
/                    Marketing — home
/services            Marketing — services
/contact             Marketing — contact form
/login               Sign-in (clients + staff)
/admin               Staff dashboard (role: admin)
  /admin/jobs        Job pipeline
  /admin/clients     Client directory
/portal              Client home
  /portal/jobs/[id]  Project detail + approvals
```

Route groups:

- `app/(marketing)/` — public site (header + footer chrome)
- `app/admin/` — staff portal, gated by `profile.role === 'admin'`
- `app/portal/` — client portal, gated by authenticated user

## Brand

Dark charcoal (`#131315` → `#0b0b0c`) with gold accent (`#c9a961`). Defined in [tailwind.config.ts](./tailwind.config.ts) and [app/globals.css](./app/globals.css). Reusable utility classes: `.rw-card`, `.rw-input`, `.rw-eyebrow`, `.rw-display`, `.rw-link`, `.rw-hairline`.

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

`.env.local` is **already present** with the Supabase project credentials. The template lives in [.env.local.example](./.env.local.example).

> ⚠️ The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. Never commit it; never expose it to the browser.

### 3. Apply the database migration

Open Supabase Studio → SQL Editor → paste [supabase/migrations/0001_init.sql](./supabase/migrations/0001_init.sql) → run.

This creates: `profiles`, `clients`, `jobs`, `job_updates`, `approvals`, `documents`, plus RLS policies and a trigger that creates a `profile` row on signup.

### 4. Promote yourself to admin

After signing up at `/login`, run in SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

### 5. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

---

## Data model

```
auth.users ──┐
             ▼
         profiles (role: admin | client)
             ▲
             │ profile_id
         clients ─────► jobs ─────► job_updates
                            │
                            ├─────► approvals
                            └─────► documents
```

## RLS policy summary

| Table         | Admin             | Client                                            |
| ------------- | ----------------- | ------------------------------------------------- |
| `profiles`    | full access       | read own row                                      |
| `clients`     | full access       | read own row (where `profile_id = auth.uid()`)    |
| `jobs`        | full access       | read jobs of their client                         |
| `job_updates` | full access       | read where `visible_to_client = true`             |
| `approvals`   | full access       | read theirs; update their own pending approvals   |
| `documents`   | full access       | read where `visible_to_client = true`             |

The `is_admin()` SQL function (security definer) is used in policies.

---

## Project layout

```
app/
  (marketing)/         public site
  admin/               staff portal
  portal/              client portal
  login/               shared auth
components/
  brand/               Logo
  marketing/           Header, Footer
  portal-shell/        Sidebar, Topbar (shared by admin + portal)
  ui/                  Button, Card, Input, Label, Badge
lib/
  supabase/            browser, server, middleware clients
  types.ts             DB types
  utils.ts             cn(), formatCurrency(), formatDate()
supabase/
  migrations/0001_init.sql
middleware.ts          Supabase session refresh + role-gating
```

## Scripts

```bash
npm run dev          # next dev
npm run build        # next build
npm run start        # next start
npm run lint         # next lint
npm run typecheck    # tsc --noEmit
```

## TODO (not yet implemented)

- Forms for creating/editing jobs, clients, updates, approvals (admin)
- Document upload (Supabase Storage)
- Contact form submission handler (`/api/contact`)
- Email notifications (e.g., via Resend) for new approvals
- Generated DB types (`supabase gen types typescript`)
