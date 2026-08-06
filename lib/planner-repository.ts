import { createClient } from "@/lib/supabase/client";
import type { ActionItem, Attachment, BacklogGroup, BacklogNote, RecurringTask } from "@/lib/types";

type PlannerItemRow = {
  id: string;
  kind: ActionItem["kind"];
  title: string;
  details: string;
  values: ActionItem["values"];
  consequences: ActionItem["consequences"];
  answers: ActionItem["answers"];
  goal_assessment: ActionItem["goalAssessment"] | null;
  score: number;
  status: ActionItem["status"];
  is_important: boolean;
  rollover_count: number;
  recurrence: ActionItem["recurrence"];
  recurring_task_id: string | null;
  is_completed: boolean;
  scheduled_for: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

type BacklogGroupRow = {
  id: string;
  title: string;
  position: number;
  created_at: string;
};

type BacklogNoteRow = {
  id: string;
  group_id: string;
  text: string;
  created_at: string;
};

type AttachmentRow = {
  id: string;
  planner_item_id: string | null;
  backlog_note_id: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

function toAttachment(row: AttachmentRow): Attachment {
  return { id: row.id, storagePath: row.storage_path, fileName: row.file_name, mimeType: row.mime_type, sizeBytes: row.size_bytes, createdAt: row.created_at };
}

function toAction(row: PlannerItemRow, attachments: AttachmentRow[]): ActionItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    details: row.details,
    values: row.values ?? [],
    consequences: row.consequences,
    answers: row.answers,
    goalAssessment: row.goal_assessment ?? undefined,
    score: row.score,
    status: row.status,
    isImportant: row.is_important,
    rolloverCount: row.rollover_count,
    recurrence: row.recurrence,
    recurringTaskId: row.recurring_task_id,
    isCompleted: row.is_completed,
    scheduledFor: row.scheduled_for ?? undefined,
    order: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attachments: attachments.filter((attachment) => attachment.planner_item_id === row.id).map(toAttachment)
  };
}

function toActionRow(item: ActionItem, userId: string) {
  return {
    id: item.id,
    user_id: userId,
    kind: item.kind,
    title: item.title,
    details: item.details,
    values: item.values,
    consequences: item.consequences,
    answers: item.answers,
    goal_assessment: item.goalAssessment ?? null,
    score: item.score,
    status: item.status,
    is_important: item.isImportant ?? false,
    rollover_count: item.rolloverCount ?? 0,
    recurrence: item.recurrence ?? null,
    recurring_task_id: item.recurringTaskId ?? null,
    is_completed: item.isCompleted ?? false,
    scheduled_for: item.scheduledFor ?? null,
    position: item.order,
    created_at: item.createdAt,
    updated_at: item.updatedAt
  };
}

function toBacklogGroup(row: BacklogGroupRow, notes: BacklogNoteRow[], attachments: AttachmentRow[]): BacklogGroup {
  return {
    id: row.id,
    title: row.title,
    order: row.position,
    createdAt: row.created_at,
    notes: notes
      .filter((note) => note.group_id === row.id)
      .map((note) => ({ id: note.id, text: note.text, createdAt: note.created_at, attachments: attachments.filter((attachment) => attachment.backlog_note_id === note.id).map(toAttachment) }))
  };
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function loadPlannerData() {
  const supabase = createClient();
  const [itemsResult, groupsResult, notesResult, attachmentsResult] = await Promise.all([
    supabase.from("planner_items").select("*").order("position"),
    supabase.from("backlog_groups").select("*").order("position"),
    supabase.from("backlog_notes").select("*").order("created_at"),
    supabase.from("attachments").select("*").order("created_at")
  ]);

  throwIfError(itemsResult.error);
  throwIfError(groupsResult.error);
  throwIfError(notesResult.error);
  throwIfError(attachmentsResult.error);

  const notes = (notesResult.data ?? []) as BacklogNoteRow[];
  const attachments = (attachmentsResult.data ?? []) as AttachmentRow[];
  return {
    actions: ((itemsResult.data ?? []) as PlannerItemRow[]).map((item) => toAction(item, attachments)),
    backlogGroups: ((groupsResult.data ?? []) as BacklogGroupRow[]).map((group) => toBacklogGroup(group, notes, attachments))
  };
}

export async function saveAction(item: ActionItem, userId: string) {
  const { error } = await createClient().from("planner_items").upsert(toActionRow(item, userId));
  throwIfError(error);
}

function toRecurringTaskRow(task: RecurringTask, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    details: task.details,
    values: task.values,
    consequences: task.consequences,
    answers: task.answers,
    status: task.status,
    is_important: task.isImportant,
    recurrence: task.recurrence,
    created_at: task.createdAt,
    updated_at: task.updatedAt
  };
}

export async function saveRecurringTask(task: RecurringTask, userId: string) {
  const { error } = await createClient().from("recurring_tasks").upsert(toRecurringTaskRow(task, userId));
  throwIfError(error);
}

export async function deleteRecurringTask(id: string) {
  const { error } = await createClient().from("recurring_tasks").delete().eq("id", id);
  throwIfError(error);
}

export async function deleteAction(id: string) {
  await removeAttachmentObjects("planner_item_id", id);
  const { error } = await createClient().from("planner_items").delete().eq("id", id);
  throwIfError(error);
}

export async function saveBacklogGroup(group: BacklogGroup, userId: string) {
  const { error } = await createClient().from("backlog_groups").upsert({
    id: group.id,
    user_id: userId,
    title: group.title,
    position: group.order,
    created_at: group.createdAt
  });
  throwIfError(error);
}

export async function deleteBacklogGroup(id: string) {
  const supabase = createClient();
  const { data: notes, error: notesError } = await supabase.from("backlog_notes").select("id").eq("group_id", id);
  throwIfError(notesError);
  await Promise.all((notes ?? []).map((note: { id: string }) => removeAttachmentObjects("backlog_note_id", note.id)));
  const { error } = await supabase.from("backlog_groups").delete().eq("id", id);
  throwIfError(error);
}

export async function saveBacklogNote(groupId: string, note: BacklogNote, userId: string) {
  const { error } = await createClient().from("backlog_notes").upsert({
    id: note.id,
    user_id: userId,
    group_id: groupId,
    text: note.text,
    created_at: note.createdAt
  });
  throwIfError(error);
}

export async function deleteBacklogNote(id: string) {
  await removeAttachmentObjects("backlog_note_id", id);
  const { error } = await createClient().from("backlog_notes").delete().eq("id", id);
  throwIfError(error);
}

function createAttachmentId() {
  return crypto.randomUUID();
}

async function uploadAttachments(files: File[], userId: string, parent: { plannerItemId?: string; backlogNoteId?: string }) {
  for (const file of files) {
    if (file.size > 6 * 1024 * 1024) throw new Error(`Файл «${file.name}» больше 6 МБ.`);

    const id = createAttachmentId();
    const parentId = parent.plannerItemId ?? parent.backlogNoteId!;
    const path = `${userId}/${parentId}/${id}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage.from("planner-attachments").upload(path, file, { contentType: file.type || "application/octet-stream" });
    throwIfError(uploadError);

    const { error: insertError } = await supabase.from("attachments").insert({
      id,
      user_id: userId,
      planner_item_id: parent.plannerItemId ?? null,
      backlog_note_id: parent.backlogNoteId ?? null,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size
    });
    if (insertError) {
      await supabase.storage.from("planner-attachments").remove([path]);
      throwIfError(insertError);
    }
  }
}

async function removeAttachmentObjects(column: "planner_item_id" | "backlog_note_id", parentId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("attachments").select("storage_path").eq(column, parentId);
  throwIfError(error);
  const paths = (data ?? []).map((attachment: { storage_path: string }) => attachment.storage_path);
  if (paths.length) {
    const { error: removeError } = await supabase.storage.from("planner-attachments").remove(paths);
    throwIfError(removeError);
  }
}

export function uploadActionAttachments(actionId: string, files: File[], userId: string) {
  return uploadAttachments(files, userId, { plannerItemId: actionId });
}

export function uploadBacklogNoteAttachments(noteId: string, files: File[], userId: string) {
  return uploadAttachments(files, userId, { backlogNoteId: noteId });
}

export async function migrateLegacyLocalData(userId: string) {
  if (typeof window === "undefined") return false;

  const actionsRaw = window.localStorage.getItem("planner.actions.v3");
  const backlogRaw = window.localStorage.getItem("planner.backlog.v1");
  if (!actionsRaw && !backlogRaw) return false;

  try {
    const legacyActions = actionsRaw ? JSON.parse(actionsRaw) as ActionItem[] : [];
    const legacyGroups = backlogRaw ? JSON.parse(backlogRaw) as BacklogGroup[] : [];

    for (const action of legacyActions) await saveAction(action, userId);
    for (const group of legacyGroups) {
      await saveBacklogGroup(group, userId);
      for (const note of group.notes ?? []) await saveBacklogNote(group.id, note, userId);
    }

    window.localStorage.removeItem("planner.actions.v3");
    window.localStorage.removeItem("planner.backlog.v1");
    return true;
  } catch (error) {
    return false;
  }
}
