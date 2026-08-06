create table if not exists public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  details text not null default '',
  values jsonb not null default '[]'::jsonb,
  is_important boolean not null default false,
  recurrence jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.planner_items
  add column if not exists recurring_task_id uuid references public.recurring_tasks(id) on delete cascade;

create index if not exists planner_items_recurring_task_idx on public.planner_items (recurring_task_id);
alter table public.recurring_tasks enable row level security;
grant select, insert, update, delete on public.recurring_tasks to authenticated;
create policy "Users manage their own recurring tasks"
on public.recurring_tasks for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create trigger recurring_tasks_set_updated_at
before update on public.recurring_tasks
for each row execute function public.set_updated_at();
