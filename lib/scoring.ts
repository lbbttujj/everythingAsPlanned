import type { ActDraft, ActionItem } from "./types";

export function calculateActScore(draft: Pick<ActDraft, "answers">) {
  const { necessity, perspective, alignment, urgency, effort } = draft.answers;
  const weightedScore = necessity * 3 + perspective * 3 + alignment * 2 + urgency * 2 + (10 - effort) * 2;
  return Math.round((weightedScore / 120) * 100);
}

export const calculateActionScore = calculateActScore;

export function scoreBand(score: number) {
  if (score >= 80) return "high";
  if (score >= 65) return "medium";
  return "low";
}

export function createActionFromDraft(
  draft: ActDraft,
  idFactory: () => string,
  createdAt = new Date().toISOString(),
  order = 0
): ActionItem {
  return {
    id: idFactory(),
    kind: "act",
    title: draft.title.trim(),
    details: draft.details.trim(),
    values: [...draft.values],
    consequences: { ...draft.consequences },
    answers: { ...draft.answers },
    score: calculateActScore(draft),
    status: draft.status,
    scheduledFor: draft.scheduledFor,
    order,
    createdAt,
    updatedAt: createdAt
  };
}
