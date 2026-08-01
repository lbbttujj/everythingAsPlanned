"use client";

import { useEffect, useMemo, useState } from "react";

import { ActionForm } from "@/components/action-form";
import { ActionTable } from "@/components/action-table";
import { GoalForm } from "@/components/goal-form";
import { createEmptyGoalAssessment, calculateGoalAssessment, isGoalAssessmentComplete } from "@/lib/goal-assessment";
import { loadActions, saveActions } from "@/lib/action-storage";
import { calculateActScore, createActionFromDraft } from "@/lib/scoring";
import type { ActionDraft, ActionItem, ActDraft, GoalDraft } from "@/lib/types";

type SortKey = "score" | "title" | "values" | "status" | "manual";
type SortDirection = "asc" | "desc";

const defaultActDraft: ActDraft = {
  kind: "act",
  title: "",
  details: "",
  values: ["health", "peace"],
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
  status: "new"
};

const defaultGoalDraft: GoalDraft = {
  kind: "goal",
  title: "",
  details: "",
  values: ["growth", "freedom"],
  status: "new",
  goalAssessment: createEmptyGoalAssessment()
};

const seedDrafts: ActDraft[] = [
  {
    ...defaultActDraft,
    title: "Сделать портфолио-лендинг",
    details: "Вынести сильные кейсы и показать, как я думаю и принимаю решения.",
    values: ["growth", "impact", "freedom"],
    answers: { necessity: 7, perspective: 9, alignment: 8, urgency: 6, effort: 5 },
    status: "reviewed"
  },
  {
    ...defaultActDraft,
    title: "Сделать вечер без экрана",
    details: "Вернуть энергию и снизить шум, чтобы яснее увидеть приоритеты.",
    values: ["health", "peace", "family"],
    answers: { necessity: 8, perspective: 7, alignment: 9, urgency: 8, effort: 2 },
    status: "active"
  }
];

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
    status: action.status
  };
}

function seedActions() {
  return seedDrafts.map((draft, index) => createActionFromDraft(draft, () => `seed-${index + 1}`, "2026-07-31T00:00:00.000Z", index));
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

export function Dashboard() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [draft, setDraft] = useState<ActionDraft>(cloneDraft(defaultGoalDraft));
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = loadActions();
    const initialActions = stored && stored.length > 0 ? normalizeActions(stored) : seedActions();

    setActions(initialActions);
    setIsReady(true);

    if (!stored || stored.length === 0) saveActions(initialActions);
  }, []);

  useEffect(() => {
    if (isReady) saveActions(actions);
  }, [actions, isReady]);

  const visibleActions = useMemo(() => sortActions(actions, sortKey, sortDirection), [actions, sortKey, sortDirection]);

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

  const handleSubmit = () => {
    if (!draft.title.trim()) return;
    if (draft.kind === "goal" && !isGoalAssessmentComplete(draft.goalAssessment.answers, draft.goalAssessment.finalAnswer)) return;

    setActions((current) => {
      const normalized = normalizeActions(current);
      const existing = editingId ? normalized.find((action) => action.id === editingId) ?? null : null;
      const order = existing?.order ?? normalized.length;
      const next = buildActionFromDraft(draft, existing, order);

      return normalizeActions(existing ? normalized.map((action) => action.id === existing.id ? next : action) : [...normalized, next]);
    });

    setDraft(cloneDraft(defaultGoalDraft));
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (action: ActionItem) => {
    setEditingId(action.id);
    setDraft(draftFromAction(action));
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setActions((current) => normalizeActions(current.filter((action) => action.id !== id)));
    if (editingId === id) handleCancel();
  };

  const handleReorder = (draggedId: string, targetId: string) => {
    setActions((current) => reorderAction(current, draggedId, targetId, sortKey, sortDirection));
    setSortKey("manual");
  };

  const handleCancel = () => {
    setEditingId(null);
    setDraft(cloneDraft(defaultGoalDraft));
    setIsModalOpen(false);
  };

  const handleAddClick = (kind: "goal" | "act") => {
    setEditingId(null);
    setDraft(cloneDraft(kind === "goal" ? defaultGoalDraft : defaultActDraft));
    setIsModalOpen(true);
  };

  return (
    <main className="page">
      <div className="shell">
        <header className="page-header">
          <div>
            <div className="section-kicker">Личная ценностная карта</div>
            <h1 className="page-title">Цели и поступки</h1>
            <p className="page-description">Сначала понять большое направление, затем выбрать ближайшее действие.</p>
          </div>
          <div className="add-actions">
            <button className="add-goal-button" type="button" onClick={() => handleAddClick("goal")}>
              <span className="add-goal-icon">+</span>
              <span>Добавить цель</span>
            </button>
            <button className="add-act-button" type="button" onClick={() => handleAddClick("act")}>
              <span className="add-act-icon">↗</span>
              <span>Добавить поступок</span>
            </button>
          </div>
        </header>

        <section className="toolbar toolbar-shell">
          <span className="toolbar-label">Нажми на заголовок колонки, чтобы изменить сортировку</span>
          <span className="toolbar-note">Перетаскивание строки включает ручной порядок</span>
        </section>

        <ActionTable actions={visibleActions} onDelete={handleDelete} onEdit={handleEdit} onReorder={handleReorder} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />

        {isModalOpen ? (
          <div className="modal-backdrop" role="presentation" onMouseDown={handleCancel}>
            <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="item-modal-title" onMouseDown={(event) => event.stopPropagation()}>
              <div className="modal-topline">
                <span className="section-kicker">{draft.kind === "goal" ? "Долгосрочное направление" : "Ближайшее действие"}</span>
                <button className="modal-close" type="button" onClick={handleCancel} aria-label="Закрыть окно">×</button>
              </div>
              <div id="item-modal-title" className="sr-only">{editingId ? "Редактировать запись" : "Добавить запись"}</div>
              {draft.kind === "goal" ? (
                <GoalForm draft={draft} isEditing={editingId !== null} onCancel={handleCancel} onDraftChange={setDraft} onSubmit={handleSubmit} />
              ) : (
                <ActionForm draft={draft} isEditing={editingId !== null} onCancel={handleCancel} onDraftChange={setDraft} onSubmit={handleSubmit} scorePreview={calculateActScore({ answers: draft.answers })} submitLabel={editingId ? "Сохранить изменения" : "Добавить поступок"} />
              )}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
