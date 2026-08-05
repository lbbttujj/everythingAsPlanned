
create table if not exists public.planner_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('goal', 'act')),
  title text not null check (char_length(trim(title)) > 0),
  details text not null default '',
  values jsonb not null default '[]'::jsonb,
  consequences jsonb not null default '{"expected":"","ifDone":"","ifSkipped":"","risks":""}'::jsonb,
  answers jsonb not null default '{"necessity":0,"perspective":0,"alignment":0,"urgency":0,"effort":0}'::jsonb,
  goal_assessment jsonb,
  score integer not null default 0 check (score between 0 and 100),
  status text not null default 'new' check (status in ('new', 'reviewed', 'active', 'archived')),
  is_completed boolean not null default false,
  scheduled_for date,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.backlog_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.backlog_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.backlog_groups(id) on delete cascade,
  text text not null check (char_length(trim(text)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planner_items_user_kind_position_idx
  on public.planner_items (user_id, kind, position);
create index if not exists planner_items_user_scheduled_for_idx
  on public.planner_items (user_id, scheduled_for);
create index if not exists backlog_groups_user_position_idx
  on public.backlog_groups (user_id, position);
create index if not exists backlog_notes_user_group_created_at_idx
  on public.backlog_notes (user_id, group_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger planner_items_set_updated_at
before update on public.planner_items
for each row execute function public.set_updated_at();

create or replace trigger backlog_groups_set_updated_at
before update on public.backlog_groups
for each row execute function public.set_updated_at();

create or replace trigger backlog_notes_set_updated_at
before update on public.backlog_notes
for each row execute function public.set_updated_at();

alter table public.planner_items enable row level security;
alter table public.backlog_groups enable row level security;
alter table public.backlog_notes enable row level security;

grant select, insert, update, delete on public.planner_items to authenticated;
grant select, insert, update, delete on public.backlog_groups to authenticated;
grant select, insert, update, delete on public.backlog_notes to authenticated;

create policy "Users manage their own planner items"
on public.planner_items for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their own backlog groups"
on public.backlog_groups for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their own backlog notes"
on public.backlog_notes for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
