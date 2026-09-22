-- Organization app schema
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query).
--
-- Data model:
--   decks: topic columns (e.g. "Work", "Personal", "House Project")
--   notes: sticky notes, each belongs to one deck
--   items: line items on a note's front, each independently flippable to
--     its own details on the back
--
-- All three tables carry a user_id and are locked down with Row Level
-- Security so each authenticated user only ever sees their own rows. This
-- app is built for a single user (you), but RLS means the anon key that
-- ships in the public JS bundle can't be used to read or write anyone
-- else's data — even though the key itself is public, per-row access is
-- enforced.

create table if not exists decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  color text not null default '#fef08a',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null references decks(id) on delete cascade,
  body text not null default '',
  details text not null default '',
  items jsonb not null default '[]'::jsonb,
  title text not null default '',
  archived boolean not null default false,
  archived_at timestamptz,
  color text not null default '#fef08a',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe to re-run: adds columns to a notes table created before they existed.
-- No-op on a fresh install (the create table above already has them).
alter table notes add column if not exists details text not null default '';
alter table notes add column if not exists items jsonb not null default '[]'::jsonb;
alter table notes add column if not exists title text not null default '';
alter table notes add column if not exists archived boolean not null default false;
alter table notes add column if not exists archived_at timestamptz;

-- One-time backfill: a card is a list of line items (each independently
-- flippable with its own details), not one body + one shared details. Any
-- note still on the very first shape gets its existing body/details
-- wrapped into a single first item here, before the items-table migration
-- below reads notes.items — so nothing written under the old shape is
-- lost. Guarded by the `items = '[]'` check, so re-running this is a no-op
-- past the first time.
update notes
set items = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'text', coalesce(body, ''),
    'details', coalesce(details, ''),
    'checked', false,
    'position', 0
  )
)
where items = '[]'::jsonb;

-- `items` used to live only as a jsonb array on notes (see the `items`
-- column above, which stays put — deprecated, unused by the app from here
-- on, kept only so nothing already written is lost). Each item is now its
-- own row, which is what lets created_at/archived_at be real, queryable
-- timestamps instead of fields buried in JSON — e.g. for an agent later
-- summarizing "what got done between date X and Y" with a plain
-- `where archived_at between X and Y`, rather than unpacking JSON arrays.
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references notes(id) on delete cascade,
  text text not null default '',
  details text not null default '',
  checked boolean not null default false,
  archived boolean not null default false,
  archived_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One-time migration: copy items out of the notes.items jsonb column
-- (backfilled above if needed) into real rows. Historical items get
-- created_at from their note (the exact original per-item time isn't
-- recoverable) and a null archived_at even if already archived (also not
-- recoverable) — anything created or archived after this point gets real
-- per-item timestamps automatically via the trigger further down.
-- Guarded by "not exists" so re-running this whole script is a no-op past
-- the first time.
insert into items (id, user_id, note_id, text, details, checked, archived, position, created_at)
select
  case when (item->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       then (item->>'id')::uuid
       else gen_random_uuid()
  end,
  notes.user_id,
  notes.id,
  coalesce(item->>'text', ''),
  coalesce(item->>'details', ''),
  coalesce((item->>'checked')::boolean, false),
  coalesce((item->>'archived')::boolean, false),
  coalesce((item->>'position')::integer, 0),
  notes.created_at
from notes, jsonb_array_elements(notes.items) as item
where not exists (select 1 from items where items.note_id = notes.id);

create index if not exists notes_deck_id_idx on notes(deck_id);
create index if not exists decks_user_id_idx on decks(user_id);
create index if not exists notes_user_id_idx on notes(user_id);
create index if not exists items_note_id_idx on items(note_id);
create index if not exists items_user_id_idx on items(user_id);

alter table decks enable row level security;
alter table notes enable row level security;
alter table items enable row level security;

-- create policy has no "if not exists", so drop-then-recreate to keep this
-- script safe to re-run.
drop policy if exists "Users manage their own decks" on decks;
create policy "Users manage their own decks"
  on decks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own notes" on notes;
create policy "Users manage their own notes"
  on notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own items" on items;
create policy "Users manage their own items"
  on items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep notes/items updated_at current on edit.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- create trigger also has no "if not exists" — same drop-then-recreate.
drop trigger if exists notes_set_updated_at on notes;
create trigger notes_set_updated_at
  before update on notes
  for each row
  execute function set_updated_at();

drop trigger if exists items_set_updated_at on items;
create trigger items_set_updated_at
  before update on items
  for each row
  execute function set_updated_at();

-- Stamp archived_at the moment `archived` flips to true, and clear it if
-- ever flipped back to false, so restoring something doesn't leave a
-- stale timestamp behind. This is what makes "when did I finish this"
-- queryable without trusting the client to set it correctly.
create or replace function set_archived_at()
returns trigger as $$
begin
  if new.archived and not old.archived then
    new.archived_at = now();
  elsif not new.archived and old.archived then
    new.archived_at = null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists notes_set_archived_at on notes;
create trigger notes_set_archived_at
  before update on notes
  for each row
  execute function set_archived_at();

drop trigger if exists items_set_archived_at on items;
create trigger items_set_archived_at
  before update on items
  for each row
  execute function set_archived_at();
