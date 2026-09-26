alter table public.planner_items
  add column if not exists task_category text not null default 'personal';

alter table public.recurring_tasks
  add column if not exists task_category text not null default 'personal';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'planner_items_task_category_check'
      and conrelid = 'public.planner_items'::regclass
  ) then
    alter table public.planner_items
      add constraint planner_items_task_category_check
      check (task_category in ('home', 'shared', 'personal', 'work', 'health'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recurring_tasks_task_category_check'
      and conrelid = 'public.recurring_tasks'::regclass
  ) then
    alter table public.recurring_tasks
      add constraint recurring_tasks_task_category_check
      check (task_category in ('home', 'shared', 'personal', 'work', 'health'));
  end if;
end $$;
