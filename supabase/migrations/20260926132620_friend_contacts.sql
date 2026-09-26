create table if not exists public.friend_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_user_id uuid not null references auth.users(id) on delete cascade,
  friend_email text not null check (char_length(btrim(friend_email)) between 3 and 320),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_contacts_not_self_check check (user_id <> friend_user_id)
);

create table if not exists public.friend_invitations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_email text not null check (char_length(btrim(sender_email)) between 3 and 320),
  recipient_email text not null check (char_length(btrim(recipient_email)) between 3 and 320),
  recipient_name text not null check (char_length(btrim(recipient_name)) between 1 and 80),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_invitations_not_self_check check (lower(btrim(sender_email)) <> lower(btrim(recipient_email)))
);

create unique index if not exists friend_contacts_user_email_idx
  on public.friend_contacts (user_id, lower(friend_email));

create index if not exists friend_invitations_sender_status_idx
  on public.friend_invitations (sender_id, status, created_at desc);

create index if not exists friend_invitations_recipient_pending_idx
  on public.friend_invitations (lower(recipient_email), created_at desc)
  where status = 'pending';

create unique index if not exists friend_invitations_unique_pending_pair_idx
  on public.friend_invitations (
    least(lower(sender_email), lower(recipient_email)),
    greatest(lower(sender_email), lower(recipient_email))
  ) where status = 'pending';

drop trigger if exists friend_contacts_set_updated_at on public.friend_contacts;
create trigger friend_contacts_set_updated_at
before update on public.friend_contacts
for each row execute function public.set_updated_at();

drop trigger if exists friend_invitations_set_updated_at on public.friend_invitations;
create trigger friend_invitations_set_updated_at
before update on public.friend_invitations
for each row execute function public.set_updated_at();

alter table public.friend_contacts enable row level security;
alter table public.friend_invitations enable row level security;

grant select on public.friend_contacts to authenticated;
grant select on public.friend_invitations to authenticated;

create policy "Users view their own friend contacts"
on public.friend_contacts for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Friend invitation participants view invitations"
on public.friend_invitations for select to authenticated
using (
  sender_id = (select auth.uid())
  or lower(recipient_email) = lower(btrim((select auth.jwt()) ->> 'email'))
);

create or replace function private.create_friend_invitation_internal(p_email text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text := lower(btrim((select auth.jwt()) ->> 'email'));
  target_email text := lower(btrim(p_email));
  target_name text := btrim(p_name);
  invitation_id uuid;
begin
  if current_user_id is null or coalesce(current_email, '') = '' then
    raise exception 'Требуется авторизация.' using errcode = '42501';
  end if;

  if coalesce(target_name, '') = '' or char_length(target_name) > 80 then
    raise exception 'Укажи имя друга до 80 символов.' using errcode = '22023';
  end if;

  if coalesce(target_email, '') = '' or position('@' in target_email) <= 1 or char_length(target_email) > 320 then
    raise exception 'Укажи корректный e-mail друга.' using errcode = '22023';
  end if;

  if target_email = current_email then
    raise exception 'Нельзя добавить в друзья самого себя.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.friend_contacts
    where user_id = current_user_id
      and lower(friend_email) = target_email
  ) then
    raise exception 'Этот человек уже есть в друзьях.' using errcode = '23505';
  end if;

  insert into public.friend_invitations (sender_id, sender_email, recipient_email, recipient_name)
  values (current_user_id, current_email, target_email, target_name)
  returning id into invitation_id;

  return invitation_id;
exception
  when unique_violation then
    raise exception 'Запрос дружбы уже ожидает ответа.' using errcode = '23505';
end;
$$;

create or replace function private.respond_friend_invitation_internal(p_invitation_id uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text := lower(btrim((select auth.jwt()) ->> 'email'));
  invitation public.friend_invitations%rowtype;
begin
  if current_user_id is null or coalesce(current_email, '') = '' then
    raise exception 'Требуется авторизация.' using errcode = '42501';
  end if;

  select * into invitation
  from public.friend_invitations
  where id = p_invitation_id
  for update;

  if not found or invitation.status <> 'pending' or lower(invitation.recipient_email) <> current_email then
    raise exception 'Активный запрос дружбы не найден.' using errcode = '42501';
  end if;

  update public.friend_invitations
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = invitation.id;

  if p_accept then
    insert into public.friend_contacts (user_id, friend_user_id, friend_email, display_name)
    values (invitation.sender_id, current_user_id, current_email, invitation.recipient_name)
    on conflict do nothing;

    insert into public.friend_contacts (user_id, friend_user_id, friend_email, display_name)
    values (current_user_id, invitation.sender_id, invitation.sender_email, invitation.sender_email)
    on conflict do nothing;
  end if;

  return invitation.id;
end;
$$;

create or replace function private.cancel_friend_invitation_internal(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.friend_invitations
  set status = 'cancelled', responded_at = now()
  where id = p_invitation_id
    and sender_id = (select auth.uid())
    and status = 'pending';

  if not found then
    raise exception 'Активный запрос дружбы не найден.' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.remove_friend_internal(p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  contact public.friend_contacts%rowtype;
begin
  if current_user_id is null then
    raise exception 'Требуется авторизация.' using errcode = '42501';
  end if;

  select * into contact
  from public.friend_contacts
  where id = p_contact_id
    and user_id = current_user_id
  for update;

  if not found then
    raise exception 'Друг не найден.' using errcode = '42501';
  end if;

  delete from public.friend_contacts
  where (user_id = current_user_id and friend_user_id = contact.friend_user_id)
     or (user_id = contact.friend_user_id and friend_user_id = current_user_id);
end;
$$;

revoke all on function private.create_friend_invitation_internal(text, text) from public, anon, authenticated, service_role;
revoke all on function private.respond_friend_invitation_internal(uuid, boolean) from public, anon, authenticated, service_role;
revoke all on function private.cancel_friend_invitation_internal(uuid) from public, anon, authenticated, service_role;
revoke all on function private.remove_friend_internal(uuid) from public, anon, authenticated, service_role;

grant execute on function private.create_friend_invitation_internal(text, text) to authenticated;
grant execute on function private.respond_friend_invitation_internal(uuid, boolean) to authenticated;
grant execute on function private.cancel_friend_invitation_internal(uuid) to authenticated;
grant execute on function private.remove_friend_internal(uuid) to authenticated;

create or replace function public.create_friend_invitation(p_email text, p_name text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.create_friend_invitation_internal(p_email, p_name); $$;

create or replace function public.respond_friend_invitation(p_invitation_id uuid, p_accept boolean)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.respond_friend_invitation_internal(p_invitation_id, p_accept); $$;

create or replace function public.cancel_friend_invitation(p_invitation_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.cancel_friend_invitation_internal(p_invitation_id); $$;

create or replace function public.remove_friend(p_contact_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.remove_friend_internal(p_contact_id); $$;

revoke all on function public.create_friend_invitation(text, text) from public, anon;
revoke all on function public.respond_friend_invitation(uuid, boolean) from public, anon;
revoke all on function public.cancel_friend_invitation(uuid) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;

grant execute on function public.create_friend_invitation(text, text) to authenticated;
grant execute on function public.respond_friend_invitation(uuid, boolean) to authenticated;
grant execute on function public.cancel_friend_invitation(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
