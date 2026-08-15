# organization

Personal organizer web app — sticky-note decks by topic (Work, Personal
Project, House Project, ...), backed by Supabase. Hosted at
[organization.danielfoust.com](https://organization.danielfoust.com).

React + Vite, [@dnd-kit](https://dndkit.com/) for drag-and-drop,
[Tiptap](https://tiptap.dev/) for rich-text notes, Supabase for auth +
Postgres storage.

## How it works

- `src/supabaseClient.js` reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
  from env vars. If they're not set, the app falls back to **demo mode**:
  local seed data persisted to `localStorage` instead of a real backend, so
  the UI is fully clickable without any setup.
- `src/lib/dataClient.js` is the data-access layer both modes implement —
  everything else in the app (`App.jsx`, components) is written against that
  interface and doesn't know which backend it's talking to.
- `supabase/schema.sql` creates the `decks` and `notes` tables with Row
  Level Security so each authenticated user only ever sees their own rows.
- Each note ("card") holds a list of **line items** in its `items` jsonb
  column: `[{ id, text, details, checked, position }]`. The front of the
  card is that list — checkbox, plain text, a → arrow. Clicking the arrow
  on a specific line flips the whole card over (CSS 3D transform); the back
  shows that line's text as a read-only title plus its own Tiptap editor
  (bold/italic/underline/strikethrough/lists/checklists) for extended
  details, saved separately per line item, not shared across the card.
- Older `body`/`details` text columns still exist on `notes` for anything
  created before this model, and `schema.sql` has a one-time backfill that
  wraps that old content into a single item so nothing is lost. Safe to
  re-run against an existing database.

## Local development

```
npm install
npm run dev
```

Runs in demo mode out of the box (no Supabase project needed to poke at the UI).

To connect a real Supabase project instead:

1. Copy `.env.example` to `.env.local` and fill in your project's URL and
   publishable key (Project Settings → Data API for the URL, Project
   Settings → API Keys for the key).
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. There's no public sign-up form — this app expects you to create your one
   account directly: Authentication → Users → **Add user** in the Supabase
   dashboard. Set an email and password, and check **Auto Confirm User** so
   it doesn't wait on an email confirmation link.
4. Restart `npm run dev` and sign in with that email/password.

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
