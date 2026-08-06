alter table public.planner_items
  add column if not exists rollover_count integer not null default 0 check (rollover_count >= 0);
