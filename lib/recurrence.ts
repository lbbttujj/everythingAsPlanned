import type { Recurrence } from "@/lib/types";

export function nextRecurrenceDate(recurrence: Recurrence, fromDate: string) {
  const start = new Date(`${fromDate}T12:00:00`);

  for (let offset = 1; offset <= 400; offset += 1) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + offset);
    const matches = recurrence.frequency === "weekly"
      ? recurrence.days.includes(candidate.getDay() || 7)
      : recurrence.days.includes(candidate.getDate());

    if (matches) return candidate.toISOString().slice(0, 10);
  }

  return fromDate;
}

export function recurrenceDates(recurrence: Recurrence, startDate: string) {
  const dates: string[] = [];
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${recurrence.endDate}T12:00:00`);

  for (let candidate = new Date(start); candidate <= end; candidate.setDate(candidate.getDate() + 1)) {
    const matches = recurrence.frequency === "weekly"
      ? recurrence.days.includes(candidate.getDay() || 7)
      : recurrence.days.includes(candidate.getDate());
    if (matches) dates.push(candidate.toISOString().slice(0, 10));
  }

  return dates;
}
