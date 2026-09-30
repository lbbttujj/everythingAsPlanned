alter table public.planner_items
  add column if not exists is_ongoing boolean not null default false;

alter table public.planner_items
  add constraint planner_items_ongoing_act_only
  check (not is_ongoing or (kind = 'act' and recurrence is null));
