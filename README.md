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
- `supabase/schema.sql` creates the `decks`, `notes`, and `items` tables
  with Row Level Security so each authenticated user only ever sees their
  own rows.
- Each note ("card") has a `title` column shown at the top of the front,
  above the line items, and its **line items** live in their own `items`
  table (foreign-keyed to the note via `note_id`), not a jsonb column:
  `{ id, noteId, text, details, checked, archived, archivedAt, position,
  createdAt, updatedAt }`. The front of the card is the title and that
  list — checkbox, plain text, a → arrow. Clicking the arrow on a specific
  line flips the whole card over (CSS 3D transform); the back shows that
  line's text as a read-only title plus its own Tiptap editor
  (bold/italic/underline/strikethrough/lists/checklists) for extended
  details, saved separately per line item, not shared across the card.
- Items get their own table (rather than living in a jsonb array on
  `notes`, as they originally did) specifically so `created_at` and
  `archived_at` are real, queryable timestamps per line — the intent is to
  eventually let an AI agent summarize "what got done between date X and
  Y" with a plain `where archived_at between X and Y` over the `items`
  table, instead of unpacking JSON. A Postgres trigger
  (`set_archived_at()`) stamps `archived_at` the moment `archived` flips
  to true on either `notes` or `items`, and clears it if flipped back, so
  the timestamp is enforced server-side rather than trusted from the
  client.
- Older `body`/`details`/`items` (jsonb) columns still exist on `notes`
  for anything created before this model — deprecated and unused by the
  app, kept only so nothing already written is lost. `schema.sql` has a
  one-time migration that backfills old body/details content into the
  jsonb `items` column (if not already done) and then copies every note's
  jsonb items into real rows in the `items` table, preserving the original
  item id where possible. Both steps are guarded to be no-ops on
  a re-run, so `schema.sql` stays safe to run again against an existing
  database.
- Both notes and individual line items carry `archived`/`archivedAt`.
  Archiving a card (the "Archive" button next to "Delete card") hides it
  from the active view without deleting it; archiving a line is done from
  its flipped-over back ("Archive line", next to the details editor)
  rather than from the front row, to keep each row down to just the → and
  × buttons. An "Archived (N)" toggle appears — for cards, below "+ Add
  note"; for lines, below "+ Add line" — to see and restore (↺) or
  permanently delete (×) them later.
- Both cards and decks can be resized by dragging the small ⤡ handle in
  their bottom-right corner, with a ↺ reset button appearing once a custom
  size is set (double-clicking the handle also resets). A card's width is
  capped to its deck's width so it can't push sibling cards around; a
  deck's width/height have generous but real caps. Widening a deck also
  widens the cards inside it (they stretch to fill the column), which is
  the main lever for readability. All of this is client-side only (React
  state), not persisted — a reload resets everything to default.

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
