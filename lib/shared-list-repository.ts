import { createClient } from "@/lib/supabase/client";
import type { SharedList, SharedListInvitation, SharedListItem, SharedListMember, SharedListsData } from "@/lib/types";

type SharedListRow = {
  id: string;
  owner_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type SharedListMemberRow = {
  list_id: string;
  user_id: string;
  member_email: string;
  is_active: boolean;
  joined_at: string;
  left_at: string | null;
};

type SharedListInvitationRow = {
  id: string;
  list_id: string;
  inviter_id: string;
  inviter_email: string;
  invited_email: string;
  status: SharedListInvitation["status"];
  created_at: string;
};

type SharedListItemRow = {
  id: string;
  list_id: string;
  created_by: string | null;
  text: string;
  is_completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function toMember(row: SharedListMemberRow): SharedListMember {
  return {
    listId: row.list_id,
    userId: row.user_id,
    email: row.member_email,
    isActive: row.is_active,
    joinedAt: row.joined_at,
    leftAt: row.left_at ?? undefined
  };
}

function toItem(row: SharedListItemRow): SharedListItem {
  return {
    id: row.id,
    listId: row.list_id,
    createdBy: row.created_by ?? undefined,
    text: row.text,
    isCompleted: row.is_completed,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function loadSharedListsData(userId: string): Promise<SharedListsData> {
  const supabase = createClient();
  const [listsResult, membersResult, invitationsResult, itemsResult] = await Promise.all([
    supabase.from("shared_lists").select("*").order("updated_at", { ascending: false }),
    supabase.from("shared_list_members").select("*").order("joined_at"),
    supabase.from("shared_list_invitations").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("shared_list_items").select("*").order("position", { ascending: false }).order("created_at", { ascending: false })
  ]);

  throwIfError(listsResult.error);
  throwIfError(membersResult.error);
  throwIfError(invitationsResult.error);
  throwIfError(itemsResult.error);

  const listRows = (listsResult.data ?? []) as SharedListRow[];
  const memberRows = (membersResult.data ?? []) as SharedListMemberRow[];
  const invitationRows = (invitationsResult.data ?? []) as SharedListInvitationRow[];
  const itemRows = (itemsResult.data ?? []) as SharedListItemRow[];
  const listTitles = new Map(listRows.map((list) => [list.id, list.title]));
  const invitations = invitationRows.map((row): SharedListInvitation => ({
    id: row.id,
    listId: row.list_id,
    listTitle: listTitles.get(row.list_id) ?? "Общий список",
    inviterId: row.inviter_id,
    inviterEmail: row.inviter_email,
    invitedEmail: row.invited_email,
    status: row.status,
    createdAt: row.created_at
  }));
  const memberListIds = new Set(memberRows.filter((member) => member.user_id === userId && member.is_active).map((member) => member.list_id));

  const lists = listRows
    .filter((list) => memberListIds.has(list.id))
    .map((row): SharedList => ({
      id: row.id,
      ownerId: row.owner_id,
      title: row.title,
      members: memberRows.filter((member) => member.list_id === row.id).map(toMember),
      items: itemRows.filter((item) => item.list_id === row.id).map(toItem),
      pendingInvitations: invitations.filter((invitation) => invitation.listId === row.id && invitation.inviterId === userId),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

  return {
    lists,
    invitations: invitations.filter((invitation) => invitation.inviterId !== userId)
  };
}

export async function createSharedList(title: string) {
  const { data, error } = await createClient().rpc("create_shared_list", { p_title: title.trim() });
  throwIfError(error);
  return data as string;
}

export async function renameSharedList(listId: string, title: string) {
  const { error } = await createClient().from("shared_lists").update({ title: title.trim() }).eq("id", listId);
  throwIfError(error);
}

export async function inviteSharedListMember(listId: string, email: string) {
  const { error } = await createClient().rpc("invite_shared_list_member", { p_list_id: listId, p_email: email.trim().toLowerCase() });
  throwIfError(error);
}

export async function respondSharedListInvitation(invitationId: string, accept: boolean) {
  const { error } = await createClient().rpc("respond_shared_list_invitation", { p_invitation_id: invitationId, p_accept: accept });
  throwIfError(error);
}

export async function cancelSharedListInvitation(invitationId: string) {
  const { error } = await createClient().rpc("cancel_shared_list_invitation", { p_invitation_id: invitationId });
  throwIfError(error);
}

export async function removeSharedListMember(listId: string, userId: string) {
  const { error } = await createClient().rpc("remove_shared_list_member", { p_list_id: listId, p_user_id: userId });
  throwIfError(error);
}

export async function leaveSharedList(listId: string) {
  const { error } = await createClient().rpc("leave_shared_list", { p_list_id: listId });
  throwIfError(error);
}

export async function deleteSharedList(listId: string) {
  const { error } = await createClient().rpc("delete_shared_list", { p_list_id: listId });
  throwIfError(error);
}

export async function createSharedListItem(listId: string, userId: string, text: string, position: number) {
  const id = crypto.randomUUID();
  const { data, error } = await createClient().from("shared_list_items").insert({
    id,
    list_id: listId,
    created_by: userId,
    text: text.trim(),
    is_completed: false,
    position
  }).select("*").single();
  throwIfError(error);
  return toItem(data as SharedListItemRow);
}

export async function updateSharedListItem(item: SharedListItem) {
  const { data, error } = await createClient().from("shared_list_items").update({
    text: item.text.trim(),
    is_completed: item.isCompleted,
    position: item.position
  }).eq("id", item.id).select("*").single();
  throwIfError(error);
  return toItem(data as SharedListItemRow);
}

export async function deleteSharedListItem(id: string) {
  const { error } = await createClient().from("shared_list_items").delete().eq("id", id);
  throwIfError(error);
}

export async function reorderSharedListItems(items: SharedListItem[]) {
  await Promise.all(items.map((item) => updateSharedListItem(item)));
}
