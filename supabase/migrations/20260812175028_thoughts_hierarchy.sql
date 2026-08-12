alter table public.backlog_groups
  add column if not exists parent_id uuid,
  add column if not exists icon text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'backlog_groups_parent_id_fkey'
      and conrelid = 'public.backlog_groups'::regclass
  ) then
    alter table public.backlog_groups
      add constraint backlog_groups_parent_id_fkey
      foreign key (parent_id)
      references public.backlog_groups(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'backlog_groups_parent_not_self_check'
      and conrelid = 'public.backlog_groups'::regclass
  ) then
    alter table public.backlog_groups
      add constraint backlog_groups_parent_not_self_check
      check (parent_id is null or parent_id <> id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'backlog_groups_icon_length_check'
      and conrelid = 'public.backlog_groups'::regclass
  ) then
    alter table public.backlog_groups
      add constraint backlog_groups_icon_length_check
      check (icon is null or char_length(icon) between 1 and 16);
  end if;
end
$$;

create index if not exists backlog_groups_user_parent_position_idx
  on public.backlog_groups (user_id, parent_id, position);

create index if not exists backlog_groups_parent_position_idx
  on public.backlog_groups (parent_id, position);

create or replace function public.validate_backlog_group_parent()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  parent_user_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'A thoughts group cannot contain itself.';
  end if;

  select user_id
  into parent_user_id
  from public.backlog_groups
  where id = new.parent_id;

  if parent_user_id is null or parent_user_id <> new.user_id then
    raise exception 'The parent group must belong to the same user.';
  end if;

  if exists (
    with recursive ancestors as (
      select id, parent_id
      from public.backlog_groups
      where id = new.parent_id

      union all

      select parent.id, parent.parent_id
      from public.backlog_groups parent
      join ancestors child on child.parent_id = parent.id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'A thoughts group cannot be moved into its descendant.';
  end if;

  return new;
end;
$$;

drop trigger if exists backlog_groups_validate_parent on public.backlog_groups;
create trigger backlog_groups_validate_parent
before insert or update of parent_id, user_id
on public.backlog_groups
for each row execute function public.validate_backlog_group_parent();

revoke all on function public.validate_backlog_group_parent() from public, anon, authenticated;

grant select, insert, update, delete on public.backlog_groups to authenticated;
