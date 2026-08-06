"use client";

import { useState } from "react";

import { getLocalDateKey, getWeekDays } from "@/lib/schedule";
import type { ActionItem } from "@/lib/types";

type WeekCalendarProps = {
  actions: ActionItem[];
  onAddForDate: (date: string) => void;
  onDelete: (id: string) => void;
  onEdit: (action: ActionItem) => void;
  onToggleComplete: (id: string) => void;
};

const weekdayFormatter = new Intl.DateTimeFormat("ru-RU", { weekday: "long" });
const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
const rangeFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });

export function WeekCalendar({ actions, onAddForDate, onDelete, onEdit, onToggleComplete }: WeekCalendarProps) {
  const today = getLocalDateKey();
  const days = getWeekDays();
  const rangeLabel = `${rangeFormatter.format(days[0].date)} — ${rangeFormatter.format(days[days.length - 1].date)}`;
  const [collapsedDays, setCollapsedDays] = useState(() => days.filter((day) => day.key !== today).map((day) => day.key));

  const toggleDay = (date: string) => {
    setCollapsedDays((current) => current.includes(date) ? current.filter((item) => item !== date) : [...current, date]);
  };

  return (
    <section className="week-view">
      <header className="week-header">
        <div>
          <div className="section-kicker">Ближайшие 7 дней</div>
          <h1>Неделя</h1>
          <p suppressHydrationWarning>{rangeLabel}</p>
        </div>
      </header>

      <div className="week-calendar">
        {days.map((day) => {
          const dayActions = actions.filter((action) => (action.scheduledFor || today) === day.key);
          const isToday = day.key === today;
          const isCollapsed = collapsedDays.includes(day.key);

          return (
            <section className={`week-day ${isToday ? "is-today" : ""} ${isCollapsed ? "is-collapsed" : ""}`} key={day.key}>
              <header className="week-day-header">
                <button className="week-day-toggle" type="button" onClick={() => toggleDay(day.key)} aria-expanded={!isCollapsed}>
                  <span>{weekdayFormatter.format(day.date)}</span>
                  <h2>{dateFormatter.format(day.date)}</h2>
                  <small>{dayActions.length ? `${dayActions.length} ${dayActions.length === 1 ? "дело" : "дел"}` : "Свободно"}</small>
                  <i aria-hidden="true">⌄</i>
                </button>
                <button className="week-add-button" type="button" onClick={() => onAddForDate(day.key)} aria-label={`Добавить дело на ${dateFormatter.format(day.date)}`}>+</button>
              </header>

              {!isCollapsed && dayActions.length ? (
                <ul className="week-task-list">
                  {dayActions.map((action) => (
                    <li className={`week-task ${action.isCompleted ? "is-completed" : ""} ${action.isImportant ? "is-important" : ""}`} key={action.id}>
                      <button className={`todo-check ${action.isCompleted ? "is-completed" : ""}`} type="button" onClick={() => onToggleComplete(action.id)} aria-label={action.isCompleted ? `Вернуть «${action.title}» в дела` : `Отметить «${action.title}» выполненным`}>{action.isCompleted ? "✓" : null}</button>
                      <div className="week-task-copy">
                        <strong>{action.title}</strong>
                        {action.isImportant ? <span className="important-badge">Важно</span> : null}
                      </div>
                      <div className="todo-actions">
                        <button className="todo-action-button" type="button" onClick={() => onEdit(action)} aria-label={`Изменить «${action.title}»`} title="Изменить">✎</button>
                        <button className="todo-action-button danger" type="button" onClick={() => onDelete(action.id)} aria-label={`Удалить «${action.title}»`} title="Удалить">×</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : !isCollapsed ? (
                <p className="week-empty">Свободно</p>
              ) : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}
