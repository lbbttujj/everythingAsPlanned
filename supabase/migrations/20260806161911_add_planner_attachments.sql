insert into storage.buckets (id, name, public, file_size_limit)
values ('planner-attachments', 'planner-attachments', false, 6291456)
on conflict (id) do nothing;

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planner_item_id uuid references public.planner_items(id) on delete cascade,
  backlog_note_id uuid references public.backlog_notes(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes >= 0),
  created_at timestamptz not null default now(),
  check (num_nonnulls(planner_item_id, backlog_note_id) = 1)
);

create index if not exists attachments_user_planner_item_idx on public.attachments (user_id, planner_item_id);
create index if not exists attachments_user_backlog_note_idx on public.attachments (user_id, backlog_note_id);

alter table public.attachments enable row level security;
grant select, insert, delete on public.attachments to authenticated;

create policy "Users manage their own attachments"
on public.attachments for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their planner attachment objects"
on storage.objects for all to authenticated
using (bucket_id = 'planner-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'planner-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
