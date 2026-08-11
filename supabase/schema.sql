-- Organization app schema
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query).
--
-- Data model:
--   stacks: topic columns (e.g. "Work", "Personal", "House Project")
--   notes:  sticky notes, each belongs to one stack
--
-- Both tables carry a user_id and are locked down with Row Level Security
-- so each authenticated user only ever sees their own rows. This app is
-- built for a single user (you), but RLS means the anon key that ships in
-- the public JS bundle can't be used to read or write anyone else's data --
-- even though the key itself is public, per-row access is enforced.

create table if not exists stacks (
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
  stack_id uuid not null references stacks(id) on delete cascade,
  body text not null default '',
  color text not null default '#fef08a',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_stack_id_idx on notes(stack_id);
create index if not exists stacks_user_id_idx on stacks(user_id);
create index if not exists notes_user_id_idx on notes(user_id);

alter table stacks enable row level security;
alter table notes enable row level security;

create policy "Users manage their own stacks"
  on stacks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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

create trigger notes_set_updated_at
  before update on notes
  for each row
  execute function set_updated_at();
