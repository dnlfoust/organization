-- Organization app schema
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query).
--
-- Data model:
--   decks: topic columns (e.g. "Work", "Personal", "House Project")
--   notes: sticky notes, each belongs to one deck
--
-- Both tables carry a user_id and are locked down with Row Level Security
-- so each authenticated user only ever sees their own rows. This app is
-- built for a single user (you), but RLS means the anon key that ships in
-- the public JS bundle can't be used to read or write anyone else's data --
-- even though the key itself is public, per-row access is enforced.

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

-- One-time backfill: a card is now a list of line items (each independently
-- flippable with its own details), not one body + one shared details. Any
-- note still on the old shape gets its existing body/details wrapped into a
-- single first item, so nothing already written is lost. Guarded by the
-- `items = '[]'` check, so re-running this is a no-op past the first time.
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

create index if not exists notes_deck_id_idx on notes(deck_id);
create index if not exists decks_user_id_idx on decks(user_id);
create index if not exists notes_user_id_idx on notes(user_id);

alter table decks enable row level security;
alter table notes enable row level security;

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

-- Keep notes.updated_at current on edit.
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
