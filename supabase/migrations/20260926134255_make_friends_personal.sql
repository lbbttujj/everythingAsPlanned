alter table public.friend_contacts
  alter column friend_user_id drop not null;

create or replace function private.create_friend_contact_internal(p_email text, p_name text)
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
  contact_id uuid;
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

  insert into public.friend_contacts (user_id, friend_user_id, friend_email, display_name)
  values (current_user_id, null, target_email, target_name)
  returning id into contact_id;

  return contact_id;
exception
  when unique_violation then
    raise exception 'Этот человек уже есть в друзьях.' using errcode = '23505';
end;
$$;

create or replace function private.remove_friend_internal(p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.friend_contacts
  where id = p_contact_id
    and user_id = (select auth.uid());

  if not found then
    raise exception 'Друг не найден.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.create_friend_contact_internal(text, text) from public, anon, authenticated, service_role;
grant execute on function private.create_friend_contact_internal(text, text) to authenticated;

create or replace function public.create_friend_contact(p_email text, p_name text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.create_friend_contact_internal(p_email, p_name); $$;

revoke all on function public.create_friend_contact(text, text) from public, anon;
grant execute on function public.create_friend_contact(text, text) to authenticated;
