grant usage on schema private to authenticated;
grant execute on function private.is_shared_list_member(uuid) to authenticated;
grant execute on function private.has_pending_shared_list_invitation(uuid) to authenticated;
