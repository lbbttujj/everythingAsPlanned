alter table public.planner_items
  add column if not exists recurrence jsonb;
