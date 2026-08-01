import type { LifeValueId } from "./types";

export const valueLabels: Record<LifeValueId, { title: string; hint: string }> = {
  health: { title: "Здоровье", hint: "энергия, тело, сон" },
  family: { title: "Семья", hint: "близкие, дом, связь" },
  freedom: { title: "Свобода", hint: "время, выбор, автономия" },
  growth: { title: "Рост", hint: "навыки, развитие, обучение" },
  money: { title: "Деньги", hint: "доход, стабильность, ресурс" },
  creativity: { title: "Творчество", hint: "самовыражение, идеи" },
  impact: { title: "Вклад", hint: "польза людям и миру" },
  peace: { title: "Спокойствие", hint: "ясность, тишина, баланс" }
};

export const valueOrder: LifeValueId[] = [
  "health",
  "family",
  "freedom",
  "growth",
  "money",
  "creativity",
  "impact",
  "peace"
];
