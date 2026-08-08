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
export type Recurrence = { frequency: "weekly" | "monthly"; days: number[]; endDate: string; endMode: "always" | "until"; seriesId?: string };
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
  isImportant?: boolean;
  rolloverCount?: number;
  recurrence?: Recurrence | null;
  recurringTaskId?: string | null;
  isCompleted?: boolean;
  scheduledFor?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  attachments?: Attachment[];
};

export type RecurringTask = {
  id: string;
  title: string;
  details: string;
  values: LifeValueId[];
  consequences: ConsequenceSet;
  answers: AnswerSet;
  status: ActionStatus;
  isImportant: boolean;
  recurrence: Recurrence;
  createdAt: string;
  updatedAt: string;
};

export type Attachment = {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type ActDraft = {
  kind: "act";
  title: string;
  details: string;
  values: LifeValueId[];
  consequences: ConsequenceSet;
  answers: AnswerSet;
  status: ActionStatus;
  isImportant: boolean;
  recurrence: Recurrence | null;
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
  attachments?: Attachment[];
};

export type BacklogGroup = {
  id: string;
  title: string;
  notes: BacklogNote[];
  order: number;
  createdAt: string;
};

export type SharedListMember = {
  listId: string;
  userId: string;
  email: string;
  isActive: boolean;
  joinedAt: string;
  leftAt?: string;
};

export type SharedListItem = {
  id: string;
  listId: string;
  createdBy?: string;
  text: string;
  isCompleted: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type SharedListInvitation = {
  id: string;
  listId: string;
  listTitle: string;
  inviterId: string;
  inviterEmail: string;
  invitedEmail: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createdAt: string;
};

export type SharedList = {
  id: string;
  ownerId: string;
  title: string;
  members: SharedListMember[];
  items: SharedListItem[];
  pendingInvitations: SharedListInvitation[];
  createdAt: string;
  updatedAt: string;
};

export type SharedListsData = {
  lists: SharedList[];
  invitations: SharedListInvitation[];
};
