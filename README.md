# organization

Personal organizer web app — sticky-note stacks by topic (Work, Personal
Project, House Project, ...), backed by Supabase. Hosted at
[organization.danielfoust.com](https://organization.danielfoust.com).

React + Vite, [@dnd-kit](https://dndkit.com/) for drag-and-drop, Supabase for
auth + Postgres storage.

## How it works

- `src/supabaseClient.js` reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
  from env vars. If they're not set, the app falls back to **demo mode**:
  local seed data persisted to `localStorage` instead of a real backend, so
  the UI is fully clickable without any setup.
- `src/lib/dataClient.js` is the data-access layer both modes implement —
  everything else in the app (`App.jsx`, components) is written against that
  interface and doesn't know which backend it's talking to.
- `supabase/schema.sql` creates the `stacks` and `notes` tables with Row
  Level Security so each authenticated user only ever sees their own rows.

## Local development

```
npm install
npm run dev
```

Runs in demo mode out of the box (no Supabase project needed to poke at the UI).

To connect a real Supabase project instead:

1. Copy `.env.example` to `.env.local` and fill in your project's URL and
   anon key (Project Settings → API in the Supabase dashboard).
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. In Supabase, enable **Email** auth (Authentication → Providers) with the
   magic-link flow (no password).
4. Restart `npm run dev`.

## Deployment

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every
push to `main`. It needs two repository secrets (Settings → Secrets and
variables → Actions):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The Supabase anon key is meant to be public (it ships in the client bundle
either way) — actual access control comes from the Row Level Security
policies in `supabase/schema.sql`, not from keeping the key secret.

`public/CNAME` points the built site at `organization.danielfoust.com`. See
the main [danielfoust.com](https://github.com/dnlfoust/DanielFoust.com) repo
for the DNS setup this depends on.
