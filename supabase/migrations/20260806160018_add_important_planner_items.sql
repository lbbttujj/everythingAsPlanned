alter table public.planner_items
  add column if not exists is_important boolean not null default false;

create index if not exists planner_items_user_important_scheduled_position_idx
  on public.planner_items (user_id, is_important desc, scheduled_for, position);
