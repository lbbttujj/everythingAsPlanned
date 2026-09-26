create table if not exists public.task_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 40),
  icon text not null default '◌' check (char_length(icon) between 1 and 8),
  color text not null default '#6f7ce8' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  legacy_key text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists task_categories_user_title_idx
  on public.task_categories (user_id, lower(title));

create unique index if not exists task_categories_user_legacy_key_idx
  on public.task_categories (user_id, legacy_key)
  where legacy_key is not null;

drop trigger if exists task_categories_set_updated_at on public.task_categories;
create trigger task_categories_set_updated_at
before update on public.task_categories
for each row execute function public.set_updated_at();

alter table public.task_categories enable row level security;
grant select, insert, update, delete on public.task_categories to authenticated;

create policy "Users manage their task categories"
on public.task_categories for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

insert into public.task_categories (user_id, title, icon, color, legacy_key, position)
select users.id, categories.title, categories.icon, categories.color, categories.legacy_key, categories.position
from auth.users as users
cross join (
  values
    ('Быт', '⌂', '#698be3', 'home', 0),
    ('Наши дела', '◌', '#4ca097', 'shared', 1),
    ('Мои дела', '●', '#8365d4', 'personal', 2),
    ('Работа', '▣', '#cd8b42', 'work', 3),
    ('Здоровье', '✦', '#469967', 'health', 4)
) as categories(title, icon, color, legacy_key, position)
on conflict (user_id, legacy_key) where legacy_key is not null do nothing;

alter table public.planner_items add column if not exists task_category_id uuid references public.task_categories(id) on delete set null;
alter table public.recurring_tasks add column if not exists task_category_id uuid references public.task_categories(id) on delete set null;

update public.planner_items as item
set task_category_id = category.id
from public.task_categories as category
where category.user_id = item.user_id
  and category.legacy_key = item.task_category;

update public.recurring_tasks as task
set task_category_id = category.id
from public.task_categories as category
where category.user_id = task.user_id
  and category.legacy_key = task.task_category;

alter table public.planner_items drop constraint if exists planner_items_task_category_check;
alter table public.recurring_tasks drop constraint if exists recurring_tasks_task_category_check;
alter table public.planner_items drop column if exists task_category;
alter table public.recurring_tasks drop column if exists task_category;
alter table public.planner_items rename column task_category_id to task_category;
alter table public.recurring_tasks rename column task_category_id to task_category;

