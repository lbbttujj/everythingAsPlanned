import type { GoalAnswerSet, GoalAssessment, GoalBlockId, GoalFinalAnswer, GoalQuestionId } from "./types";

export const goalBlocks: Array<{
  id: GoalBlockId;
  title: string;
  description: string;
  warning: string;
  questions: Array<{ id: GoalQuestionId; text: string }>;
}> = [
  {
    id: "identity",
    title: "Моя ли это цель",
    description: "Проверяем, действительно ли цель принадлежит тебе.",
    warning: "Похоже, в этой цели может быть много внешнего давления или желания соответствовать чужим ожиданиям.",
    questions: [
      { id: "identity-1", text: "Я хотел бы достичь этой цели, даже если бы никто об этом не узнал." },
      { id: "identity-2", text: "Эта цель появилась из моего желания, а не из давления окружающих." },
      { id: "identity-3", text: "Я могу объяснить, зачем она нужна лично мне." },
      { id: "identity-4", text: "Я не пытаюсь с её помощью просто доказать свою ценность другим." }
    ]
  },
  {
    id: "values",
    title: "Соответствие ценностям",
    description: "Сверяем цель с тем, каким человеком ты хочешь быть.",
    warning: "Цель может конфликтовать с более важными для тебя сферами жизни.",
    questions: [
      { id: "values-1", text: "Эта цель соответствует тому, каким человеком я хочу быть." },
      { id: "values-2", text: "Она не требует регулярно поступать против себя." },
      { id: "values-3", text: "Она поддерживает важные для меня сферы жизни." },
      { id: "values-4", text: "Достижение цели не разрушит то, что для меня важнее неё." }
    ]
  },
  {
    id: "benefit",
    title: "Долгосрочная польза",
    description: "Смотрим, что останется после первоначального воодушевления.",
    warning: "Цель может дать краткосрочное удовлетворение, но не иметь заметной пользы в будущем.",
    questions: [
      { id: "benefit-1", text: "Эта цель улучшит мою жизнь не только на короткое время." },
      { id: "benefit-2", text: "Она даст мне полезные навыки, опыт, связи или возможности." },
      { id: "benefit-3", text: "Через несколько лет я, вероятно, буду рад, что начал двигаться к ней." },
      { id: "benefit-4", text: "Даже частичное достижение этой цели принесёт пользу." }
    ]
  },
  {
    id: "process",
    title: "Интерес к процессу",
    description: "Оцениваем не только красивый результат, но и обычные дни на пути.",
    warning: "Тебе может нравиться образ результата, но не повседневный путь к нему.",
    questions: [
      { id: "process-1", text: "Мне интересен не только результат, но и сам путь." },
      { id: "process-2", text: "Я готов регулярно выполнять действия, необходимые для достижения цели." },
      { id: "process-3", text: "Я могу представить обычный день на пути к этой цели, и такая жизнь меня устраивает." },
      { id: "process-4", text: "После первых трудностей я, скорее всего, всё ещё буду хотеть продолжать." }
    ]
  },
  {
    id: "cost",
    title: "Приемлемость цены",
    description: "Понимаем, сколько времени, сил и других возможностей потребует цель.",
    warning: "Возможная цена цели сейчас кажется выше её пользы.",
    questions: [
      { id: "cost-1", text: "Я понимаю, сколько времени и сил потребует эта цель." },
      { id: "cost-2", text: "Цена цели кажется мне приемлемой." },
      { id: "cost-3", text: "Ради неё я готов отказаться от некоторых других возможностей." },
      { id: "cost-4", text: "Эта цель не создаёт неприемлемого риска для моего здоровья, отношений или стабильности." }
    ]
  },
  {
    id: "realism",
    title: "Реалистичность",
    description: "Проверяем, можно ли превратить намерение в первый проверяемый шаг.",
    warning: "Цель пока слишком абстрактна. Попробуй определить первый шаг и критерий результата.",
    questions: [
      { id: "realism-1", text: "Я понимаю, какой первый шаг могу сделать." },
      { id: "realism-2", text: "У меня есть или могут появиться необходимые ресурсы." },
      { id: "realism-3", text: "Цель достаточно конкретна, чтобы отслеживать прогресс." },
      { id: "realism-4", text: "Я могу проверить эту цель небольшим экспериментом, не меняя сразу всю жизнь." }
    ]
  }
];

export const goalFinalOptions: Array<{ value: GoalFinalAnswer; label: string; points: number }> = [
  { value: "yes", label: "Да", points: 4 },
  { value: "rather-yes", label: "Скорее да", points: 3 },
  { value: "unsure", label: "Не уверен", points: 2 },
  { value: "rather-no", label: "Скорее нет", points: 1 },
  { value: "no", label: "Нет", points: 0 }
];

export const goalScale = [
  { value: 0, label: "Совсем нет" },
  { value: 1, label: "Скорее нет" },
  { value: 2, label: "Не уверен" },
  { value: 3, label: "Скорее да" },
  { value: 4, label: "Полностью да" }
];

export function createEmptyGoalAssessment(): GoalAssessment {
  return {
    answers: {},
    finalAnswer: null,
    score: 0,
    blockScores: {
      identity: 0,
      values: 0,
      benefit: 0,
      process: 0,
      cost: 0,
      realism: 0
    },
    warnings: []
  };
}

export function calculateGoalAssessment(answers: GoalAnswerSet, finalAnswer: GoalFinalAnswer | null) {
  const blockScores = {} as Record<GoalBlockId, number>;
  let total = 0;

  for (const block of goalBlocks) {
    const blockTotal = block.questions.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0);
    total += blockTotal;
    blockScores[block.id] = Math.round((blockTotal / 16) * 100);
  }

  const baseScore = Math.round((total / 96) * 100);
  const penalty = finalAnswer === "rather-no" || finalAnswer === "no" ? 10 : 0;
  const score = Math.max(0, baseScore - penalty);
  const warnings = goalBlocks.filter((block) => blockScores[block.id] < 50).map((block) => block.warning);

  return { score, baseScore, blockScores, warnings, total };
}

export function goalScoreLabel(score: number) {
  if (score >= 80) return "Цель хорошо подходит тебе";
  if (score >= 65) return "Перспективная цель";
  if (score >= 45) return "Неоднозначная цель";
  return "Цель, вероятно, тебе не подходит";
}

export function goalRecommendation(score: number) {
  if (score >= 80) return "Переходить к плану действий.";
  if (score >= 65) return "Изменить сроки, масштаб, способ достижения или условия.";
  if (score >= 45) return "Не принимать большое решение. Сначала провести небольшой эксперимент.";
  return "Определить настоящую потребность и найти другой способ её удовлетворить.";
}

export function isGoalAssessmentComplete(answers: GoalAnswerSet, finalAnswer: GoalFinalAnswer | null) {
  return goalBlocks.every((block) => block.questions.every((question) => answers[question.id] !== undefined)) && finalAnswer !== null;
}
