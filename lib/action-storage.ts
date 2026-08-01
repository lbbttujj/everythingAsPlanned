import type { ActionItem } from "./types";

const STORAGE_KEY = "planner.actions.v3";

function normalizeActions(actions: ActionItem[]) {
  return [...actions]
    .map((action, index) => {
      const legacyAction = action as ActionItem & { kind?: ActionItem["kind"] };
      const isLegacy = !legacyAction.kind;

      return {
        ...action,
        kind: legacyAction.kind ?? "act",
        consequences: action.consequences ?? { expected: "", ifDone: "", ifSkipped: "", risks: "" },
        score: isLegacy ? Math.round((action.score / 80) * 100) : action.score,
        order: Number.isFinite(action.order) ? action.order : index
      };
    })
    .sort((left, right) => left.order - right.order || left.createdAt.localeCompare(right.createdAt))
    .map((action, index) => ({
      ...action,
      order: index
    }));
}

export function loadActions(): ActionItem[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ActionItem[];
    return Array.isArray(parsed) ? normalizeActions(parsed) : [];
  } catch {
    return null;
  }
}

export function saveActions(actions: ActionItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
}
