drop policy "Participants view shared list invitations" on public.shared_list_invitations;
create policy "Participants view shared list invitations"
on public.shared_list_invitations for select to authenticated
using (
  inviter_id = (select auth.uid())
  or lower(invited_email) = lower(btrim((select auth.jwt()) ->> 'email'))
);

alter function public.create_shared_list(text) rename to create_shared_list_internal;
alter function public.create_shared_list_internal(text) set schema private;
alter function public.invite_shared_list_member(uuid, text) rename to invite_shared_list_member_internal;
alter function public.invite_shared_list_member_internal(uuid, text) set schema private;
alter function public.respond_shared_list_invitation(uuid, boolean) rename to respond_shared_list_invitation_internal;
alter function public.respond_shared_list_invitation_internal(uuid, boolean) set schema private;
alter function public.cancel_shared_list_invitation(uuid) rename to cancel_shared_list_invitation_internal;
alter function public.cancel_shared_list_invitation_internal(uuid) set schema private;
alter function public.remove_shared_list_member(uuid, uuid) rename to remove_shared_list_member_internal;
alter function public.remove_shared_list_member_internal(uuid, uuid) set schema private;
alter function public.leave_shared_list(uuid) rename to leave_shared_list_internal;
alter function public.leave_shared_list_internal(uuid) set schema private;
alter function public.delete_shared_list(uuid) rename to delete_shared_list_internal;
alter function public.delete_shared_list_internal(uuid) set schema private;

grant usage on schema private to authenticated;

revoke all on function private.create_shared_list_internal(text) from public, anon, service_role;
revoke all on function private.invite_shared_list_member_internal(uuid, text) from public, anon, service_role;
revoke all on function private.respond_shared_list_invitation_internal(uuid, boolean) from public, anon, service_role;
revoke all on function private.cancel_shared_list_invitation_internal(uuid) from public, anon, service_role;
revoke all on function private.remove_shared_list_member_internal(uuid, uuid) from public, anon, service_role;
revoke all on function private.leave_shared_list_internal(uuid) from public, anon, service_role;
revoke all on function private.delete_shared_list_internal(uuid) from public, anon, service_role;

grant execute on function private.create_shared_list_internal(text) to authenticated;
grant execute on function private.invite_shared_list_member_internal(uuid, text) to authenticated;
grant execute on function private.respond_shared_list_invitation_internal(uuid, boolean) to authenticated;
grant execute on function private.cancel_shared_list_invitation_internal(uuid) to authenticated;
grant execute on function private.remove_shared_list_member_internal(uuid, uuid) to authenticated;
grant execute on function private.leave_shared_list_internal(uuid) to authenticated;
grant execute on function private.delete_shared_list_internal(uuid) to authenticated;

create function public.create_shared_list(p_title text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.create_shared_list_internal(p_title); $$;

create function public.invite_shared_list_member(p_list_id uuid, p_email text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.invite_shared_list_member_internal(p_list_id, p_email); $$;

create function public.respond_shared_list_invitation(p_invitation_id uuid, p_accept boolean)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.respond_shared_list_invitation_internal(p_invitation_id, p_accept); $$;

create function public.cancel_shared_list_invitation(p_invitation_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.cancel_shared_list_invitation_internal(p_invitation_id); $$;

create function public.remove_shared_list_member(p_list_id uuid, p_user_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.remove_shared_list_member_internal(p_list_id, p_user_id); $$;

create function public.leave_shared_list(p_list_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.leave_shared_list_internal(p_list_id); $$;

create function public.delete_shared_list(p_list_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.delete_shared_list_internal(p_list_id); $$;

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
