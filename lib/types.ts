export type LifeValueId =
  | "health"
  | "family"
  | "freedom"
  | "growth"
  | "money"
  | "creativity"
  | "impact"
  | "peace";

export type ActionKind = "goal" | "act";
export type ActionStatus = "new" | "reviewed" | "active" | "archived";

export type AnswerSet = {
  necessity: number;
  perspective: number;
  alignment: number;
  urgency: number;
  effort: number;
};

export type ConsequenceSet = {
  expected: string;
  ifDone: string;
  ifSkipped: string;
  risks: string;
};

export type GoalBlockId = "identity" | "values" | "benefit" | "process" | "cost" | "realism";
export type GoalQuestionId = `${GoalBlockId}-${1 | 2 | 3 | 4}`;
export type GoalFinalAnswer = "yes" | "rather-yes" | "unsure" | "rather-no" | "no";
export type GoalAnswerSet = Partial<Record<GoalQuestionId, number>>;

export type GoalAssessment = {
  answers: GoalAnswerSet;
  finalAnswer: GoalFinalAnswer | null;
  score: number;
  blockScores: Record<GoalBlockId, number>;
  warnings: string[];
};

export type ActionItem = {
  id: string;
  kind: ActionKind;
  title: string;
  details: string;
  values: LifeValueId[];
  consequences: ConsequenceSet;
  answers: AnswerSet;
  goalAssessment?: GoalAssessment;
  score: number;
  status: ActionStatus;
  isCompleted?: boolean;
  scheduledFor?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type ActDraft = {
  kind: "act";
  title: string;
  details: string;
  values: LifeValueId[];
  consequences: ConsequenceSet;
  answers: AnswerSet;
  status: ActionStatus;
  scheduledFor: string;
};

export type GoalDraft = {
  kind: "goal";
  title: string;
  details: string;
  values: LifeValueId[];
  status: ActionStatus;
  goalAssessment: GoalAssessment;
};

export type ActionDraft = ActDraft | GoalDraft;

export type BacklogNote = {
  id: string;
  text: string;
  createdAt: string;
};

export type BacklogGroup = {
  id: string;
  title: string;
  notes: BacklogNote[];
  order: number;
  createdAt: string;
};
