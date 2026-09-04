alter table public.planner_items add column if not exists needs_review boolean not null default false;

create or replace function public.move_backlog_note_to_today(note_id uuid, target_date date)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_note public.backlog_notes%rowtype;
  new_id uuid;
begin
  if auth.uid() is null or target_date is null then
    raise exception 'Authentication and date required';
  end if;
  select * into source_note from public.backlog_notes
    where id = note_id and user_id = auth.uid() for update;
  if not found then raise exception 'Note not found or already moved'; end if;
  insert into public.planner_items(user_id, kind, title, scheduled_for, position)
    values (auth.uid(), 'act', source_note.text, target_date,
      (select coalesce(max(position), -1) + 1 from public.planner_items where user_id = auth.uid()))
    returning id into new_id;
  update public.attachments set planner_item_id = new_id, backlog_note_id = null
    where backlog_note_id = note_id and user_id = auth.uid();
  delete from public.backlog_notes where id = note_id and user_id = auth.uid();
  return new_id;
end;
$$;
revoke all on function public.move_backlog_note_to_today(uuid, date) from public, anon;
grant execute on function public.move_backlog_note_to_today(uuid, date) to authenticated;
