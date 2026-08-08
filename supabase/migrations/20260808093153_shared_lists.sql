create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.shared_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shared_list_members (
  list_id uuid not null references public.shared_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_email text not null check (char_length(btrim(member_email)) between 3 and 320),
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (list_id, user_id)
);

create table public.shared_list_invitations (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shared_lists(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  inviter_email text not null check (char_length(btrim(inviter_email)) between 3 and 320),
  invited_email text not null check (char_length(btrim(invited_email)) between 3 and 320),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz
);

create table public.shared_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shared_lists(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  text text not null check (char_length(btrim(text)) between 1 and 1000),
  is_completed boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shared_lists_owner_idx on public.shared_lists (owner_id);
create index shared_list_members_user_idx on public.shared_list_members (user_id, list_id) where is_active;
create index shared_list_invitations_list_idx on public.shared_list_invitations (list_id, created_at desc);
create index shared_list_invitations_inviter_idx on public.shared_list_invitations (inviter_id);
create index shared_list_invitations_email_pending_idx on public.shared_list_invitations (lower(invited_email), created_at desc) where status = 'pending';
create unique index shared_list_invitations_unique_pending_idx on public.shared_list_invitations (list_id, lower(invited_email)) where status = 'pending';
create index shared_list_items_list_position_idx on public.shared_list_items (list_id, position, created_at);
create index shared_list_items_created_by_idx on public.shared_list_items (created_by);

create trigger shared_lists_set_updated_at
before update on public.shared_lists
for each row execute function public.set_updated_at();

create trigger shared_list_invitations_set_updated_at
before update on public.shared_list_invitations
for each row execute function public.set_updated_at();

create trigger shared_list_items_set_updated_at
before update on public.shared_list_items
for each row execute function public.set_updated_at();

create or replace function private.is_shared_list_member(target_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.shared_list_members
    where list_id = target_list_id
      and user_id = (select auth.uid())
      and is_active
  );
$$;

create or replace function private.has_pending_shared_list_invitation(target_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(lower(btrim(auth.jwt() ->> 'email')), '') is not null and exists (
    select 1
    from public.shared_list_invitations
    where list_id = target_list_id
      and lower(invited_email) = lower(btrim(auth.jwt() ->> 'email'))
      and status = 'pending'
  );
$$;

revoke all on function private.is_shared_list_member(uuid) from public, anon, authenticated, service_role;
revoke all on function private.has_pending_shared_list_invitation(uuid) from public, anon, authenticated, service_role;

alter table public.shared_lists enable row level security;
alter table public.shared_list_members enable row level security;
alter table public.shared_list_invitations enable row level security;
alter table public.shared_list_items enable row level security;

grant select on public.shared_lists to authenticated;
grant update (title) on public.shared_lists to authenticated;
grant select on public.shared_list_members to authenticated;
grant select on public.shared_list_invitations to authenticated;
grant select, delete on public.shared_list_items to authenticated;
grant insert (id, list_id, created_by, text, is_completed, position) on public.shared_list_items to authenticated;
grant update (text, is_completed, position) on public.shared_list_items to authenticated;

create policy "Members and invitees view shared lists"
on public.shared_lists for select to authenticated
using (
  owner_id = (select auth.uid())
  or (select private.is_shared_list_member(id))
  or (select private.has_pending_shared_list_invitation(id))
);

create policy "Owners rename shared lists"
on public.shared_lists for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "Members view shared list members"
on public.shared_list_members for select to authenticated
using ((select private.is_shared_list_member(list_id)));

create policy "Participants view shared list invitations"
on public.shared_list_invitations for select to authenticated
using (
  inviter_id = (select auth.uid())
  or lower(invited_email) = lower(btrim(auth.jwt() ->> 'email'))
);

create policy "Members view shared list items"
on public.shared_list_items for select to authenticated
using ((select private.is_shared_list_member(list_id)));

create policy "Members create shared list items"
on public.shared_list_items for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.is_shared_list_member(list_id))
);

create policy "Members update shared list items"
on public.shared_list_items for update to authenticated
using ((select private.is_shared_list_member(list_id)))
with check ((select private.is_shared_list_member(list_id)));

create policy "Members delete shared list items"
on public.shared_list_items for delete to authenticated
using ((select private.is_shared_list_member(list_id)));

create or replace function public.create_shared_list(p_title text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text := lower(btrim(auth.jwt() ->> 'email'));
  normalized_title text := btrim(p_title);
  created_list_id uuid;
begin
  if caller_id is null or caller_email is null or caller_email = '' then
    raise exception 'Требуется подтверждённый аккаунт.' using errcode = '42501';
  end if;
  if char_length(normalized_title) not between 1 and 120 then
    raise exception 'Название должно содержать от 1 до 120 символов.' using errcode = '22023';
  end if;

  insert into public.shared_lists (owner_id, title)
  values (caller_id, normalized_title)
  returning id into created_list_id;

  insert into public.shared_list_members (list_id, user_id, member_email)
  values (created_list_id, caller_id, caller_email);

  return created_list_id;
end;
$$;

create or replace function public.invite_shared_list_member(p_list_id uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text := lower(btrim(auth.jwt() ->> 'email'));
  normalized_email text := lower(btrim(p_email));
  invitation_id uuid;
begin
  if caller_id is null or caller_email is null or caller_email = '' then
    raise exception 'Требуется подтверждённый аккаунт.' using errcode = '42501';
  end if;
  if normalized_email is null or char_length(normalized_email) not between 3 and 320 or position('@' in normalized_email) < 2 then
    raise exception 'Укажи корректный e-mail.' using errcode = '22023';
  end if;
  if normalized_email = caller_email then
    raise exception 'Нельзя пригласить самого себя.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.shared_lists
    where id = p_list_id and owner_id = caller_id
  ) then
    raise exception 'Приглашать участников может только владелец.' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.shared_list_members
    where list_id = p_list_id and lower(member_email) = normalized_email and is_active
  ) then
    raise exception 'Этот пользователь уже участвует в списке.' using errcode = '23505';
  end if;

  insert into public.shared_list_invitations (list_id, inviter_id, inviter_email, invited_email)
  values (p_list_id, caller_id, caller_email, normalized_email)
  returning id into invitation_id;

  return invitation_id;
exception
  when unique_violation then
    raise exception 'Для этого e-mail уже есть активное приглашение.' using errcode = '23505';
end;
$$;

create or replace function public.respond_shared_list_invitation(p_invitation_id uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text := lower(btrim(auth.jwt() ->> 'email'));
  invitation public.shared_list_invitations%rowtype;
begin
  if caller_id is null or caller_email is null or caller_email = '' then
    raise exception 'Требуется подтверждённый аккаунт.' using errcode = '42501';
  end if;

  select * into invitation
  from public.shared_list_invitations
  where id = p_invitation_id
  for update;

  if not found or invitation.status <> 'pending' or lower(invitation.invited_email) <> caller_email then
    raise exception 'Приглашение недоступно или уже обработано.' using errcode = '42501';
  end if;

  if p_accept then
    insert into public.shared_list_members (list_id, user_id, member_email, is_active, joined_at, left_at)
    values (invitation.list_id, caller_id, caller_email, true, now(), null)
    on conflict (list_id, user_id) do update
      set member_email = excluded.member_email,
          is_active = true,
          joined_at = now(),
          left_at = null;

    update public.shared_list_invitations
    set status = 'accepted', responded_at = now()
    where id = invitation.id;
  else
    update public.shared_list_invitations
    set status = 'declined', responded_at = now()
    where id = invitation.id;
  end if;

  return invitation.list_id;
end;
$$;

create or replace function public.cancel_shared_list_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Требуется авторизация.' using errcode = '42501';
  end if;

  update public.shared_list_invitations as invitation
  set status = 'cancelled', responded_at = now()
  from public.shared_lists as list
  where invitation.id = p_invitation_id
    and invitation.list_id = list.id
    and list.owner_id = caller_id
    and invitation.status = 'pending';

  if not found then
    raise exception 'Активное приглашение не найдено.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.remove_shared_list_member(p_list_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Требуется авторизация.' using errcode = '42501';
  end if;
  if p_user_id = caller_id then
    raise exception 'Владелец не может исключить самого себя.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.shared_lists
    where id = p_list_id and owner_id = caller_id
  ) then
    raise exception 'Управлять участниками может только владелец.' using errcode = '42501';
  end if;

  update public.shared_list_members
  set is_active = false, left_at = now()
  where list_id = p_list_id and user_id = p_user_id and is_active;

  if not found then
    raise exception 'Активный участник не найден.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.leave_shared_list(p_list_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Требуется авторизация.' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.shared_lists
    where id = p_list_id and owner_id = caller_id
  ) then
    raise exception 'Владелец не может выйти — удали список целиком.' using errcode = '22023';
  end if;

  update public.shared_list_members
  set is_active = false, left_at = now()
  where list_id = p_list_id and user_id = caller_id and is_active;

  if not found then
    raise exception 'Активное участие не найдено.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.delete_shared_list(p_list_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Требуется авторизация.' using errcode = '42501';
  end if;

  delete from public.shared_lists
  where id = p_list_id and owner_id = caller_id;

  if not found then
    raise exception 'Удалить список может только владелец.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.create_shared_list(text) from public, anon;
revoke all on function public.invite_shared_list_member(uuid, text) from public, anon;
revoke all on function public.respond_shared_list_invitation(uuid, boolean) from public, anon;
revoke all on function public.cancel_shared_list_invitation(uuid) from public, anon;
revoke all on function public.remove_shared_list_member(uuid, uuid) from public, anon;
revoke all on function public.leave_shared_list(uuid) from public, anon;
revoke all on function public.delete_shared_list(uuid) from public, anon;

grant execute on function public.create_shared_list(text) to authenticated;
grant execute on function public.invite_shared_list_member(uuid, text) to authenticated;
grant execute on function public.respond_shared_list_invitation(uuid, boolean) to authenticated;
grant execute on function public.cancel_shared_list_invitation(uuid) to authenticated;
grant execute on function public.remove_shared_list_member(uuid, uuid) to authenticated;
grant execute on function public.leave_shared_list(uuid) to authenticated;
grant execute on function public.delete_shared_list(uuid) to authenticated;
