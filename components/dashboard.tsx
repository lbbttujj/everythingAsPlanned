"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ActionForm } from "@/components/action-form";
import { ActionTable } from "@/components/action-table";
import { BacklogBoard } from "@/components/backlog-board";
import { GoalForm } from "@/components/goal-form";
import { TodayList } from "@/components/today-list";
import { WeekCalendar } from "@/components/week-calendar";
import { moveBacklogNoteToToday } from "@/lib/planner-repository";
import { createEmptyGoalAssessment, calculateGoalAssessment, isGoalAssessmentComplete } from "@/lib/goal-assessment";
import { deleteAction, deleteBacklogGroup, deleteBacklogNote, deleteRecurringTask, loadPlannerData, migrateLegacyLocalData, saveAction, saveBacklogGroup, saveBacklogNote, saveRecurringTask, uploadActionAttachments, uploadBacklogNoteAttachments } from "@/lib/planner-repository";
import { calculateActScore, createActionFromDraft } from "@/lib/scoring";
import { getLocalDateKey } from "@/lib/schedule";
import { recurrenceDates } from "@/lib/recurrence";
import { createClient } from "@/lib/supabase/client";
import type { ActionDraft, ActionItem, ActDraft, BacklogGroup, GoalAnswerSet, GoalDraft, Recurrence, RecurringTask } from "@/lib/types";

type SortKey = "score" | "title" | "values" | "status" | "manual";
type SortDirection = "asc" | "desc";
type AppSection = "today" | "week" | "backlog" | "goals";

const defaultActDraft: ActDraft = {
  kind: "act",
  title: "",
  details: "",
  values: [],
  consequences: {
    expected: "",
    ifDone: "",
    ifSkipped: "",
    risks: ""
  },
  answers: {
    necessity: 5,
    perspective: 5,
    alignment: 5,
    urgency: 4,
    effort: 3
  },
  status: "new",
  isImportant: false,
  recurrence: null,
  scheduledFor: ""
};

const defaultGoalDraft: GoalDraft = {
  kind: "goal",
  title: "",
  details: "",
  values: ["growth", "freedom"],
  status: "new",
  goalAssessment: createEmptyGoalAssessment()
};

const seedGoalAnswers: GoalAnswerSet = {
  "identity-1": 4, "identity-2": 4, "identity-3": 4, "identity-4": 3,
  "values-1": 4, "values-2": 4, "values-3": 3, "values-4": 3,
  "benefit-1": 4, "benefit-2": 4, "benefit-3": 3, "benefit-4": 4,
  "process-1": 3, "process-2": 3, "process-3": 3, "process-4": 3,
  "cost-1": 3, "cost-2": 3, "cost-3": 2, "cost-4": 4,
  "realism-1": 4, "realism-2": 3, "realism-3": 4, "realism-4": 4
};

const seedGoalDraft: GoalDraft = {
  ...defaultGoalDraft,
  title: "Понять, куда двигаться в ближайший год",
  details: "Собрать ясное направление, которое поддерживает мои ценности и превращается в конкретные шаги.",
  values: ["growth", "freedom", "peace"],
  status: "reviewed",
  goalAssessment: { ...createEmptyGoalAssessment(), answers: seedGoalAnswers, finalAnswer: "yes" }
};

const seedActDraft: ActDraft = {
  ...defaultActDraft,
  title: "Записать первый шаг по выбранному направлению",
  details: "Выделить 30 минут и описать один проверяемый шаг на эту неделю.",
  values: [],
  consequences: {
    expected: "Появится ясность и конкретное действие вместо размышлений.",
    ifDone: "Будет понятен следующий шаг и снизится неопределённость.",
    ifSkipped: "Большое направление останется только идеей.",
    risks: "Можно потратить больше времени на формулировки, чем планировалось."
  },
  answers: { necessity: 8, perspective: 8, alignment: 9, urgency: 7, effort: 2 },
  status: "active"
};

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeActions(actions: ActionItem[]) {
  return [...actions]
    .map((action, index) => ({
      ...action,
      kind: action.kind ?? "act",
      score: action.kind ? action.score : Math.round((action.score / 80) * 100),
      order: Number.isFinite(action.order) ? action.order : index
    }))
    .sort((left, right) => left.order - right.order || left.createdAt.localeCompare(right.createdAt))
    .map((action, index) => ({ ...action, order: index }));
}

function buildActionFromDraft(draft: ActionDraft, existing: ActionItem | null, order: number): ActionItem {
  const now = new Date().toISOString();

  if (draft.kind === "goal") {
    const calculated = calculateGoalAssessment(draft.goalAssessment.answers, draft.goalAssessment.finalAnswer);

    return {
      id: existing?.id ?? createId(),
      kind: "goal",
      title: draft.title.trim(),
      details: draft.details.trim(),
      values: [...draft.values],
      consequences: existing?.consequences ?? { expected: "", ifDone: "", ifSkipped: "", risks: "" },
      answers: existing?.answers ?? { necessity: 0, perspective: 0, alignment: 0, urgency: 0, effort: 0 },
      goalAssessment: {
        answers: draft.goalAssessment.answers,
        finalAnswer: draft.goalAssessment.finalAnswer,
        score: calculated.score,
        blockScores: calculated.blockScores,
        warnings: calculated.warnings
      },
      score: calculated.score,
      status: draft.status,
      isImportant: existing?.isImportant ?? false,
      isCompleted: existing?.isCompleted,
      order,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
  }

  return {
    id: existing?.id ?? createId(),
    kind: "act",
    title: draft.title.trim(),
    details: draft.details.trim(),
    values: [...draft.values],
    consequences: { ...draft.consequences },
    answers: { ...draft.answers },
    score: calculateActScore(draft),
    status: draft.status,
    isImportant: draft.isImportant,
    needsReview: existing?.needsReview && draft.scheduledFor === existing.scheduledFor,
    rolloverCount: (existing?.rolloverCount ?? 0) + (existing?.scheduledFor && draft.scheduledFor && draft.scheduledFor > existing.scheduledFor ? 1 : 0),
    recurrence: draft.recurrence,
    recurringTaskId: existing?.recurringTaskId ?? null,
    isCompleted: existing?.isCompleted ?? false,
    scheduledFor: draft.scheduledFor || (existing ? existing.scheduledFor : getLocalDateKey()),
    order,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
}

function cloneDraft(draft: ActionDraft): ActionDraft {
  if (draft.kind === "goal") {
    return {
      ...draft,
      values: [...draft.values],
      goalAssessment: {
        ...draft.goalAssessment,
        answers: { ...draft.goalAssessment.answers },
        blockScores: { ...draft.goalAssessment.blockScores },
        warnings: [...draft.goalAssessment.warnings]
      }
    };
  }

  return { ...draft, values: [...draft.values], consequences: { ...draft.consequences }, answers: { ...draft.answers } };
}

function draftFromAction(action: ActionItem): ActionDraft {
  if (action.kind === "goal") {
    return {
      kind: "goal",
      title: action.title,
      details: action.details,
      values: [...action.values],
      status: action.status,
      goalAssessment: action.goalAssessment ?? createEmptyGoalAssessment()
    };
  }

  return {
    kind: "act",
    title: action.title,
    details: action.details,
    values: [...action.values],
    consequences: { ...action.consequences },
    answers: { ...action.answers },
    status: action.status,
    isImportant: action.isImportant ?? false,
    recurrence: action.recurrence ?? null,
    scheduledFor: action.scheduledFor ?? ""
  };
}

function seedActions() {
  return [buildActionFromDraft(seedGoalDraft, null, 0), createActionFromDraft(seedActDraft, () => "seed-act", "2026-07-31T00:00:00.000Z", 1)];
}

function createRecurringTask(action: ActionItem, recurrence: Recurrence, id = createId()): RecurringTask {
  return {
    id,
    title: action.title,
    details: action.details,
    values: action.values,
    consequences: action.consequences,
    answers: action.answers,
    status: action.status,
    isImportant: action.isImportant ?? false,
    recurrence,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt
  };
}

function sortActions(actions: ActionItem[], sortKey: SortKey, direction: SortDirection) {
  const ordered = normalizeActions(actions);

  if (sortKey === "manual") return ordered;

  const multiplier = direction === "asc" ? 1 : -1;
  return [...ordered].sort((left, right) => {
    if (sortKey === "title") return multiplier * left.title.localeCompare(right.title, "ru");
    if (sortKey === "values") return multiplier * (left.values.length - right.values.length);
    if (sortKey === "status") return multiplier * left.status.localeCompare(right.status, "ru");
    return multiplier * (left.score - right.score) || left.order - right.order;
  });
}

function reorderAction(actions: ActionItem[], draggedId: string, targetId: string, sortKey: SortKey, direction: SortDirection) {
  const ordered = sortActions(actions, sortKey, direction);
  const dragged = ordered.find((action) => action.id === draggedId);
  const target = ordered.find((action) => action.id === targetId);

  if (!dragged || !target || dragged.kind !== target.kind) return ordered;

  const group = ordered.filter((action) => action.kind === dragged.kind);
  const draggedIndex = group.findIndex((action) => action.id === draggedId);
  const targetIndex = group.findIndex((action) => action.id === targetId);
  const nextGroup = [...group];
  const [draggedAction] = nextGroup.splice(draggedIndex, 1);
  nextGroup.splice(targetIndex, 0, draggedAction);

  let groupIndex = 0;
  return ordered.map((action) => action.kind === dragged.kind ? { ...nextGroup[groupIndex++], order: action.order } : action);
}

function collectBacklogSubtreeIds(groups: BacklogGroup[], rootId: string) {
  const ids = new Set([rootId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const group of groups) {
      if (group.parentId && ids.has(group.parentId) && !ids.has(group.id)) {
        ids.add(group.id);
        changed = true;
      }
    }
  }

  return ids;
}

function getDataErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Не удалось загрузить данные.";

  if (message.includes("Could not find the table")) {
    return "База Supabase ещё не инициализирована. Примени SQL-миграцию из supabase/migrations/20260805214420_planner_auth_schema.sql.";
  }

  return message;
}

type DashboardProps = {
  userId: string;
  email: string;
};

export function Dashboard({ userId, email }: DashboardProps) {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [backlogGroups, setBacklogGroups] = useState<BacklogGroup[]>([]);
  const [draft, setDraft] = useState<ActionDraft>(cloneDraft(defaultGoalDraft));
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [isModalPresented, setIsModalPresented] = useState(false);
  const modalCloseTimer = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AppSection>("today");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [currentDate, setCurrentDate] = useState(() => getLocalDateKey());
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingRecurringTaskId, setEditingRecurringTaskId] = useState<string | null>(null);
  const [editingRecurringSeriesId, setEditingRecurringSeriesId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        let data = await loadPlannerData();
        const migrated = await migrateLegacyLocalData(userId);
        if (migrated) data = await loadPlannerData();
        setActions(normalizeActions(data.actions));
        setBacklogGroups(data.backlogGroups);
      } catch (error) {
        setErrorMessage(getDataErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [userId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextDate = getLocalDateKey();
      setCurrentDate((date) => date === nextDate ? date : nextDate);
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const visibleActions = useMemo(() => sortActions(actions, sortKey, sortDirection), [actions, sortKey, sortDirection]);
  const visibleGoals = useMemo(() => visibleActions.filter((action) => action.kind === "goal"), [visibleActions]);
  const todayKey = currentDate;
  const actActions = useMemo(() => sortActions(actions.filter((action) => action.kind === "act"), "manual", "asc").sort((left, right) => Number(Boolean(right.isImportant)) - Number(Boolean(left.isImportant)) || left.order - right.order), [actions]);
  const todayActions = useMemo(() => actActions.filter((action) => !action.needsReview && action.scheduledFor === todayKey), [actActions, todayKey]);
  const reviewActions = actActions.filter((action) => !action.isCompleted && (action.needsReview || (action.scheduledFor && action.scheduledFor < todayKey && !action.recurrence && !action.recurringTaskId)));
  const undatedActions = actActions.filter((action) => !action.needsReview && !action.scheduledFor);

  const closeActionModal = () => {
    if (isModalClosing) return;
    setIsModalClosing(true);
    setIsModalPresented(false);
    if (modalCloseTimer.current) window.clearTimeout(modalCloseTimer.current);
    modalCloseTimer.current = window.setTimeout(() => {
      setIsModalOpen(false);
      setIsModalClosing(false);
      modalCloseTimer.current = null;
    }, 260);
  };

  const handleSort = (nextKey: SortKey) => {
    if (nextKey === "manual") {
      setSortKey("manual");
      return;
    }

    if (sortKey === nextKey) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "score" ? "desc" : "asc");
  };

  const handleSubmit = async () => {
    if (!draft.title.trim()) return;
    if (draft.kind === "goal" && !isGoalAssessmentComplete(draft.goalAssessment.answers, draft.goalAssessment.finalAnswer)) return;

    const normalized = normalizeActions(actions);
    const existing = editingId ? normalized.find((action) => action.id === editingId) ?? null : null;
    const order = existing?.order ?? normalized.length;
    const next = buildActionFromDraft(draft, existing, order);

    try {
      const recurrence = next.kind === "act" && next.recurrence
        ? { ...next.recurrence, seriesId: editingRecurringTaskId ?? next.recurringTaskId ?? next.recurrence.seriesId ?? createId() }
        : next.recurrence;

      if (editingRecurringTaskId && next.kind === "act" && recurrence) {
        const updatedTask = createRecurringTask(next, recurrence, editingRecurringTaskId);
        const futureActions = normalized.filter((action) => (action.recurringTaskId === editingRecurringTaskId || action.recurrence?.seriesId === editingRecurringSeriesId) && !action.isCompleted && (action.scheduledFor ?? currentDate) >= currentDate);
        const replacements = recurrenceDates(recurrence, currentDate).map((scheduledFor, index) => ({
          ...next,
          id: createId(),
          recurrence,
          recurringTaskId: editingRecurringTaskId,
          scheduledFor,
          order: normalized.length + index,
          isCompleted: false
        }));

        await saveRecurringTask(updatedTask, userId);
        await Promise.all(futureActions.map((action) => deleteAction(action.id)));
        await Promise.all(replacements.map((action) => saveAction(action, userId)));
      } else {
        const recurringTask = !existing && next.kind === "act" && recurrence ? createRecurringTask(next, recurrence, recurrence.seriesId) : null;
        const recurringDates = !existing && next.kind === "act" && recurrence ? recurrenceDates(recurrence, next.scheduledFor ?? currentDate) : [];
        const scheduledActions = recurringDates.length
          ? recurringDates.map((scheduledFor, index) => ({ ...next, id: index === 0 ? next.id : createId(), recurrence, recurringTaskId: recurringTask?.id ?? null, scheduledFor, order: normalized.length + index }))
          : [{ ...next, recurrence }];
        if (recurringTask) await saveRecurringTask(recurringTask, userId);
        await Promise.all(scheduledActions.map((action) => saveAction(action, userId)));
      }
      if (attachmentFiles.length) await uploadActionAttachments(next.id, attachmentFiles, userId);
      const data = await loadPlannerData();
      setActions(normalizeActions(data.actions));
      setBacklogGroups(data.backlogGroups);
      setDraft(cloneDraft(defaultGoalDraft));
      setAttachmentFiles([]);
      setEditingId(null);
      setEditingRecurringTaskId(null);
      setEditingRecurringSeriesId(null);
      closeActionModal();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось сохранить запись.");
    }
  };

  const handleEdit = (action: ActionItem) => {
    setIsModalPresented(false);
    setEditingId(action.id);
    setEditingRecurringTaskId(null);
    setEditingRecurringSeriesId(null);
    setDraft(draftFromAction(action));
    setAttachmentFiles([]);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAction(id);
      setActions((current) => normalizeActions(current.filter((action) => action.id !== id)));
      if (editingId === id) handleCancel();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось удалить запись.");
    }
  };

  const handleReorder = async (draggedId: string, targetId: string) => {
    const next = reorderAction(actions, draggedId, targetId, sortKey, sortDirection);
    try {
      await Promise.all(next.map((action) => saveAction(action, userId)));
      setActions(next);
      setSortKey("manual");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось изменить порядок.");
    }
  };

  const handleToggleComplete = async (id: string) => {
    const action = actions.find((item) => item.id === id);
    if (!action) return;
    const next = { ...action, isCompleted: !action.isCompleted, updatedAt: new Date().toISOString() };
    try {
      await saveAction(next, userId);
      setActions((current) => current.map((item) => item.id === id ? next : item));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось обновить дело.");
    }
  };

  const handleSchedule = async (id: string, scheduledFor?: string) => {
    const action = actions.find((item) => item.id === id);
    if (!action || (scheduledFor && scheduledFor < currentDate)) return;
    const next = {
      ...action,
      scheduledFor,
      needsReview: false,
      rolloverCount: (action.rolloverCount ?? 0) + (action.scheduledFor && scheduledFor && scheduledFor > action.scheduledFor ? 1 : 0),
      updatedAt: new Date().toISOString(),
    };
    try {
      await saveAction(next, userId);
      setActions((current) => current.map((item) => item.id === id ? next : item));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось назначить дату.");
    }
  };

  const handleSendToReview = async (id: string) => {
    const action = actions.find((item) => item.id === id);
    if (!action || action.isCompleted) return;
    const next = { ...action, needsReview: true, updatedAt: new Date().toISOString() };
    try {
      await saveAction(next, userId);
      setActions((current) => current.map((item) => item.id === id ? next : item));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось отправить дело в разбор.");
    }
  };

  const handleMoveNoteToToday = async (noteId: string) => {
    try {
      await moveBacklogNoteToToday(noteId, getLocalDateKey());
      const data = await loadPlannerData();
      setActions(normalizeActions(data.actions));
      setBacklogGroups(data.backlogGroups);
      setActiveSection("today");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось перенести запись.");
    }
  };

  const handleCreateBacklogGroup = async (title: string, parentId: string | null, icon: string) => {
    const now = new Date().toISOString();
    const siblingCount = backlogGroups.filter((group) => group.parentId === parentId).length;
    const group: BacklogGroup = { id: createId(), title: title.trim(), parentId, icon, notes: [], order: siblingCount, createdAt: now };
    try {
      await saveBacklogGroup(group, userId);
      setBacklogGroups((current) => [...current, group]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось создать группу.");
    }
  };

  const handleUpdateBacklogGroup = async (groupId: string, changes: Partial<Pick<BacklogGroup, "title" | "parentId" | "icon">>) => {
    const group = backlogGroups.find((item) => item.id === groupId);
    if (!group) return;
    const parentId = changes.parentId === undefined ? group.parentId : changes.parentId;
    const next = {
      ...group,
      ...changes,
      parentId,
      order: parentId === group.parentId ? group.order : backlogGroups.filter((item) => item.parentId === parentId && item.id !== groupId).length
    };
    try {
      await saveBacklogGroup(next, userId);
      setBacklogGroups((current) => current.map((item) => item.id === groupId ? next : item));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось изменить группу.");
    }
  };

  const handleAddBacklogNote = async (groupId: string, text: string, files: File[]) => {
    const now = new Date().toISOString();
    const note = { id: createId(), text: text.trim(), createdAt: now };
    try {
      await saveBacklogNote(groupId, note, userId);
      if (files.length) await uploadBacklogNoteAttachments(note.id, files, userId);
      const data = await loadPlannerData();
      setActions(normalizeActions(data.actions));
      setBacklogGroups(data.backlogGroups);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось добавить заметку.");
    }
  };

  const handleDeleteBacklogGroup = async (groupId: string) => {
    const subtreeIds = collectBacklogSubtreeIds(backlogGroups, groupId);
    const noteIds = backlogGroups.filter((group) => subtreeIds.has(group.id)).flatMap((group) => group.notes.map((note) => note.id));
    try {
      await deleteBacklogGroup(groupId, noteIds);
      setBacklogGroups((current) => current.filter((group) => !subtreeIds.has(group.id)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось удалить группу.");
    }
  };

  const handleUpdateBacklogNote = async (groupId: string, noteId: string, text: string) => {
    const note = backlogGroups.find((group) => group.id === groupId)?.notes.find((item) => item.id === noteId);
    if (!note || !text.trim()) return;
    const next = { ...note, text: text.trim() };
    try {
      await saveBacklogNote(groupId, next, userId);
      setBacklogGroups((current) => current.map((group) => group.id === groupId ? { ...group, notes: group.notes.map((item) => item.id === noteId ? next : item) } : group));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось изменить запись.");
    }
  };

  const handleDeleteBacklogNote = async (groupId: string, noteId: string) => {
    try {
      await deleteBacklogNote(noteId);
      setBacklogGroups((current) => current.map((group) => group.id === groupId ? { ...group, notes: group.notes.filter((note) => note.id !== noteId) } : group));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось удалить заметку.");
    }
  };

  const handleReorderBacklogGroups = async (draggedGroupId: string, targetGroupId: string) => {
    const dragged = backlogGroups.find((group) => group.id === draggedGroupId);
    const target = backlogGroups.find((group) => group.id === targetGroupId);
    if (!dragged || !target || dragged.parentId !== target.parentId) return;
    const ordered = backlogGroups.filter((group) => group.parentId === dragged.parentId).sort((left, right) => left.order - right.order);
      const draggedIndex = ordered.findIndex((group) => group.id === draggedGroupId);
      const targetIndex = ordered.findIndex((group) => group.id === targetGroupId);

      if (draggedIndex < 0 || targetIndex < 0) return;

      const next = [...ordered];
      const [draggedGroup] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, draggedGroup);
      const reordered = next.map((group, index) => ({ ...group, order: index }));
    try {
      await Promise.all(reordered.map((group) => saveBacklogGroup(group, userId)));
      setBacklogGroups((current) => current.map((group) => reordered.find((item) => item.id === group.id) ?? group));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось изменить порядок групп.");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingRecurringTaskId(null);
    setEditingRecurringSeriesId(null);
    closeActionModal();
  };

  const handleAddClick = (kind: "goal" | "act", scheduledFor = getLocalDateKey()) => {
    if (modalCloseTimer.current) window.clearTimeout(modalCloseTimer.current);
    setIsModalClosing(false);
    setIsModalPresented(false);
    setEditingId(null);
    setEditingRecurringTaskId(null);
    setEditingRecurringSeriesId(null);
    if (kind === "goal") {
      setDraft(cloneDraft(defaultGoalDraft));
    } else {
      const actDraft = cloneDraft(defaultActDraft);
      if (actDraft.kind === "act") {
        setDraft({ ...actDraft, scheduledFor });
      }
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!isModalOpen) return;
    const presentationTimer = window.setTimeout(() => setIsModalPresented(true), 48);

    return () => {
      window.clearTimeout(presentationTimer);
    };
  }, [isModalOpen]);

  const handleSignOut = async () => {
    await createClient().auth.signOut();
  };

  if (isLoading) {
    return <main className="auth-shell"><p className="auth-status">Загружаем твой ежедневник…</p></main>;
  }

  return (
    <main className="daily-app">
      <div className="daily-shell">
        <button className="account-sign-out" type="button" onClick={handleSignOut} title={`Выйти: ${email}`}>Выйти</button>
        {errorMessage ? <p className="data-error" role="alert">{errorMessage}</p> : null}
        <div className="screen-transition" key={activeSection}>
          {activeSection === "today" ? (
            <TodayList actions={todayActions} reviewActions={reviewActions} undatedActions={undatedActions} todayKey={todayKey} onSchedule={handleSchedule} onSendToReview={handleSendToReview} onAdd={() => handleAddClick("act", todayKey)} onDelete={handleDelete} onEdit={handleEdit} onToggleComplete={handleToggleComplete} />
          ) : activeSection === "week" ? (
            <WeekCalendar actions={actActions.filter((action) => !action.needsReview)} onSendToReview={handleSendToReview} onAddForDate={(date) => handleAddClick("act", date)} onDelete={handleDelete} onEdit={handleEdit} onToggleComplete={handleToggleComplete} onManageRecurring={() => setIsRecurringModalOpen(true)} />
          ) : activeSection === "backlog" ? (
            <BacklogBoard groups={backlogGroups} onMoveNoteToToday={handleMoveNoteToToday} onAddNote={handleAddBacklogNote} onCreateGroup={handleCreateBacklogGroup} onDeleteGroup={handleDeleteBacklogGroup} onDeleteNote={handleDeleteBacklogNote} onUpdateGroup={handleUpdateBacklogGroup} onUpdateNote={handleUpdateBacklogNote} onReorderGroups={handleReorderBacklogGroups} userId={userId} email={email} />
          ) : (
            <section className="goals-view">
              <header className="goals-header">
                <div>
                  <div className="section-kicker">Длинный горизонт</div>
                  <h1>Цели</h1>
                  <p>Направления, которым стоит уделять время и внимание.</p>
                </div>
                <button className="add-goal-button" type="button" onClick={() => handleAddClick("goal")}>
                  <span className="add-goal-icon">+</span>
                  <span>Добавить цель</span>
                </button>
              </header>

              <ActionTable actions={visibleGoals} sections="goals" onDelete={handleDelete} onEdit={handleEdit} onReorder={handleReorder} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
            </section>
          )}
        </div>

        <nav className="bottom-nav" aria-label="Основные разделы">
          <button className={`bottom-nav-item ${activeSection === "today" ? "is-active" : ""}`} type="button" onClick={() => setActiveSection("today")} aria-current={activeSection === "today" ? "page" : undefined}>
            <span>Сегодня</span>
          </button>
          <button className={`bottom-nav-item ${activeSection === "week" ? "is-active" : ""}`} type="button" onClick={() => setActiveSection("week")} aria-current={activeSection === "week" ? "page" : undefined}>
            <span>Неделя</span>
          </button>
          <button className="bottom-nav-add" type="button" onClick={() => handleAddClick("act", todayKey)} aria-label="Добавить дело">
            <span aria-hidden="true">+</span>
          </button>
          <button className={`bottom-nav-item ${activeSection === "backlog" ? "is-active" : ""}`} type="button" onClick={() => setActiveSection("backlog")} aria-current={activeSection === "backlog" ? "page" : undefined}>
            <span>Мысли</span>
          </button>
          <button className={`bottom-nav-item ${activeSection === "goals" ? "is-active" : ""}`} type="button" onClick={() => setActiveSection("goals")} aria-current={activeSection === "goals" ? "page" : undefined}>
            <span>Цели</span>
          </button>
        </nav>

        {isModalOpen ? (
          <div className={`modal-backdrop ${draft.kind === "act" ? "is-action-modal" : ""} ${isModalPresented ? "is-presented" : ""} ${isModalClosing ? "is-closing" : ""}`} role="presentation" onMouseDown={handleCancel}>
            <div className={draft.kind === "act" ? "action-modal-viewport" : undefined}>
              <div className={`modal-dialog ${draft.kind === "act" ? "action-modal-sheet" : ""} ${isModalClosing ? "is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="item-modal-title" onMouseDown={(event) => event.stopPropagation()}>
                <div className="modal-topline">
                  <span className="section-kicker">{draft.kind === "goal" ? "Долгосрочное направление" : "Ближайшее действие"}</span>
                  <button className="modal-close" type="button" onClick={handleCancel} aria-label="Закрыть окно">×</button>
                </div>
                <div id="item-modal-title" className="sr-only">{editingId ? "Редактировать запись" : "Добавить запись"}</div>
                {draft.kind === "goal" ? (
                  <GoalForm draft={draft} isEditing={editingId !== null} onCancel={handleCancel} onDraftChange={setDraft} onSubmit={handleSubmit} files={attachmentFiles} onFilesChange={setAttachmentFiles} />
                ) : (
                  <ActionForm draft={draft} isEditing={editingId !== null} onCancel={handleCancel} onDraftChange={setDraft} onSubmit={handleSubmit} submitLabel={editingId ? "Сохранить дело" : "Добавить дело"} files={attachmentFiles} onFilesChange={setAttachmentFiles} />
                )}
              </div>
            </div>
          </div>
        ) : null}
        {isRecurringModalOpen ? <RecurringManager actions={actions} onClose={() => setIsRecurringModalOpen(false)} onEditSeries={(seriesId) => { const action = actions.find((item) => item.recurrence?.seriesId === seriesId); if (action) { setIsRecurringModalOpen(false); setEditingRecurringTaskId(action.recurringTaskId ?? createId()); setEditingRecurringSeriesId(seriesId); setEditingId(action.id); setDraft(draftFromAction(action)); setAttachmentFiles([]); setIsModalOpen(true); } }} onDeleteSeries={async (seriesId) => { const seriesActions = actions.filter((action) => action.recurrence?.seriesId === seriesId); await Promise.all(seriesActions.map((action) => deleteAction(action.id))); const recurringTaskId = seriesActions[0]?.recurringTaskId; if (recurringTaskId) await deleteRecurringTask(recurringTaskId); setActions((current) => current.filter((action) => action.recurrence?.seriesId !== seriesId)); }} /> : null}
      </div>
    </main>
  );
}

function RecurringManager({ actions, onClose, onEditSeries, onDeleteSeries }: { actions: ActionItem[]; onClose: () => void; onEditSeries: (seriesId: string) => void; onDeleteSeries: (seriesId: string) => void }) {
  const series = Array.from(new Map(actions.filter((action) => action.recurrence?.seriesId).map((action) => [action.recurrence!.seriesId!, action])).values());
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="modal-dialog recurring-manager" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><h2>Регулярные дела</h2>{series.length ? series.map((action) => <div className="recurring-manager-row" key={action.recurrence!.seriesId}><span>{action.title}</span><div className="row-actions"><button className="mini-button" type="button" onClick={() => onEditSeries(action.recurrence!.seriesId!)}>Изменить</button><button className="mini-button danger" type="button" onClick={() => onDeleteSeries(action.recurrence!.seriesId!)}>Удалить серию</button></div></div>) : <p>Регулярных дел пока нет.</p>}<button className="button secondary" type="button" onClick={onClose}>Закрыть</button></section></div>;
}
