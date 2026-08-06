alter table public.recurring_tasks
  add column if not exists consequences jsonb not null default '{"expected":"","ifDone":"","ifSkipped":"","risks":""}'::jsonb,
  add column if not exists answers jsonb not null default '{"necessity":0,"perspective":0,"alignment":0,"urgency":0,"effort":0}'::jsonb,
  add column if not exists status text not null default 'new' check (status in ('new', 'reviewed', 'active', 'archived'));
