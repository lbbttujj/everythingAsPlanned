import { createClient } from "@/lib/supabase/client";
import type { ActionItem, BacklogGroup, BacklogNote } from "@/lib/types";

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

function toAction(row: PlannerItemRow): ActionItem {
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
    isCompleted: row.is_completed,
    scheduledFor: row.scheduled_for ?? undefined,
    order: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at
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
    is_completed: item.isCompleted ?? false,
    scheduled_for: item.scheduledFor ?? null,
    position: item.order,
    created_at: item.createdAt,
    updated_at: item.updatedAt
  };
}

function toBacklogGroup(row: BacklogGroupRow, notes: BacklogNoteRow[]): BacklogGroup {
  return {
    id: row.id,
    title: row.title,
    order: row.position,
    createdAt: row.created_at,
    notes: notes
      .filter((note) => note.group_id === row.id)
      .map((note) => ({ id: note.id, text: note.text, createdAt: note.created_at }))
  };
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function loadPlannerData() {
  const supabase = createClient();
  const [itemsResult, groupsResult, notesResult] = await Promise.all([
    supabase.from("planner_items").select("*").order("position"),
    supabase.from("backlog_groups").select("*").order("position"),
    supabase.from("backlog_notes").select("*").order("created_at")
  ]);

  throwIfError(itemsResult.error);
  throwIfError(groupsResult.error);
  throwIfError(notesResult.error);

  const notes = (notesResult.data ?? []) as BacklogNoteRow[];
  return {
    actions: ((itemsResult.data ?? []) as PlannerItemRow[]).map(toAction),
    backlogGroups: ((groupsResult.data ?? []) as BacklogGroupRow[]).map((group) => toBacklogGroup(group, notes))
  };
}

export async function saveAction(item: ActionItem, userId: string) {
  const { error } = await createClient().from("planner_items").upsert(toActionRow(item, userId));
  throwIfError(error);
}

export async function deleteAction(id: string) {
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
  const { error } = await createClient().from("backlog_groups").delete().eq("id", id);
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
  const { error } = await createClient().from("backlog_notes").delete().eq("id", id);
  throwIfError(error);
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
