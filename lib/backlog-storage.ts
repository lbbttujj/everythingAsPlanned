import type { BacklogGroup } from "./types";

const STORAGE_KEY = "planner.backlog.v1";

function normalizeGroups(groups: BacklogGroup[]) {
  return groups
    .filter((group) => typeof group?.id === "string" && typeof group?.title === "string")
    .map((group, index) => ({
      ...group,
      order: Number.isFinite(group.order) ? group.order : index,
      notes: Array.isArray(group.notes)
        ? group.notes.filter((note) => typeof note?.id === "string" && typeof note?.text === "string")
        : []
    }))
    .sort((left, right) => left.order - right.order)
    .map((group, index) => ({ ...group, order: index }));
}

export function loadBacklog(): BacklogGroup[] | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as BacklogGroup[];
    return Array.isArray(parsed) ? normalizeGroups(parsed) : [];
  } catch {
    return null;
  }
}

export function saveBacklog(groups: BacklogGroup[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}
