"use client";

import { useMemo, useState } from "react";

import { getLocalDateKey, getWeekDays } from "@/lib/schedule";
import type { ActionItem } from "@/lib/types";

type WeekCalendarProps = {
  actions: ActionItem[];
  onAddForDate: (date: string) => void;
  onDelete: (id: string) => void;
  onEdit: (action: ActionItem) => void;
  onToggleComplete: (id: string) => void;
  onManageRecurring: () => void;
};

const weekdayFormatter = new Intl.DateTimeFormat("ru-RU", { weekday: "long" });
const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
const rangeFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
const monthFormatter = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
const monthWeekdayFormatter = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });

function shiftDate(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function shiftMonth(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getMonthDays(referenceDate: Date) {
  const firstDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 12);
  const start = shiftDate(firstDay, -((firstDay.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => shiftDate(start, index));
}

export function WeekCalendar({ actions, onAddForDate, onDelete, onEdit, onToggleComplete, onManageRecurring }: WeekCalendarProps) {
  const today = getLocalDateKey();
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const days = useMemo(() => getWeekDays(referenceDate), [referenceDate]);
  const rangeLabel = `${rangeFormatter.format(days[0].date)} — ${rangeFormatter.format(days[days.length - 1].date)}`;
  const [collapsedDays, setCollapsedDays] = useState(() => days.filter((day) => day.key !== today).map((day) => day.key));
  const monthDays = useMemo(() => getMonthDays(referenceDate), [referenceDate]);
  const monthWeekdays = useMemo(() => monthDays.slice(0, 7).map((day) => monthWeekdayFormatter.format(day)), [monthDays]);

  const moveWeek = (offset: number) => {
    const nextReference = shiftDate(referenceDate, offset * 7);
    const nextDays = getWeekDays(nextReference);
    setReferenceDate(nextReference);
    setCollapsedDays(nextDays.filter((day) => day.key !== today).map((day) => day.key));
  };

  const moveMonth = (offset: number) => {
    setReferenceDate((current) => shiftMonth(current, offset));
  };

  const openWeekForDate = (date: Date) => {
    const selectedDate = getLocalDateKey(date);
    setReferenceDate(date);
    setCollapsedDays(getWeekDays(date).filter((day) => day.key !== selectedDate).map((day) => day.key));
  };

  const toggleDay = (date: string) => {
    setCollapsedDays((current) => current.includes(date) ? current.filter((item) => item !== date) : [...current, date]);
  };

  const actionsForDate = (date: string) => actions.filter((action) => (action.scheduledFor || today) === date);

  return (
    <section className="week-view">
      <header className="week-header">
        <div>
          <div className="section-kicker">Ближайшие 7 дней</div>
          <h1>Неделя</h1>
          <p suppressHydrationWarning>{rangeLabel}</p>
        </div>
        <div className="week-header-actions">
          <button className="mini-button" type="button" onClick={() => setIsMonthOpen((current) => !current)} aria-expanded={isMonthOpen}>Просмотр месяца</button>
          <button className="mini-button" type="button" onClick={onManageRecurring}>Регулярные</button>
        </div>
      </header>

      <div className="week-navigation" aria-label="Навигация по неделям">
        <button className="week-navigation-button" type="button" onClick={() => moveWeek(-1)} aria-label="Предыдущая неделя">‹</button>
        <button className="week-navigation-today" type="button" onClick={() => { setReferenceDate(new Date()); setCollapsedDays(getWeekDays().filter((day) => day.key !== today).map((day) => day.key)); }}>Сегодня</button>
        <button className="week-navigation-button" type="button" onClick={() => moveWeek(1)} aria-label="Следующая неделя">›</button>
      </div>

      {isMonthOpen ? (
        <section className="month-overview" aria-label="Календарь месяца">
          <div className="month-overview-header">
            <div className="month-title-control">
              <button className="month-navigation-button" type="button" onClick={() => moveMonth(-1)} aria-label="Предыдущий месяц">‹</button>
              <h2>{monthFormatter.format(referenceDate)}</h2>
              <button className="month-navigation-button" type="button" onClick={() => moveMonth(1)} aria-label="Следующий месяц">›</button>
            </div>
            <span>Краткий обзор дел</span>
          </div>
          <div className="month-grid" role="grid">
            {monthWeekdays.map((weekday) => <span className="month-weekday" key={weekday}>{weekday.slice(0, 2)}</span>)}
            {monthDays.map((date) => {
              const key = getLocalDateKey(date);
              const dayActions = actionsForDate(key);
              const isCurrentMonth = date.getMonth() === referenceDate.getMonth();
              const incomplete = dayActions.filter((action) => !action.isCompleted).length;
              const important = dayActions.some((action) => action.isImportant && !action.isCompleted);

              return (
                <button className={`month-day ${isCurrentMonth ? "" : "is-outside"} ${key === today ? "is-today" : ""} ${important ? "has-important" : ""}`} type="button" key={key} onClick={() => openWeekForDate(date)} title={dayActions.length ? `${dayActions.map((action) => action.title).join(" · ")}. Нажми, чтобы открыть неделю.` : "Нажми, чтобы открыть неделю."} aria-label={`Открыть неделю с датой ${dateFormatter.format(date)}`}>
                  <span>{date.getDate()}</span>
                  {dayActions.length ? <small>{incomplete ? `${incomplete} дел.` : "готово"}</small> : null}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="week-calendar">
        {days.map((day) => {
          const dayActions = actionsForDate(day.key);
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
