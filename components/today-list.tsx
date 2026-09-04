"use client";

import type { ActionItem } from "@/lib/types";

type TodayListProps = {
  actions: ActionItem[];
  onSendToReview: (id: string) => void;
  reviewActions: ActionItem[];
  undatedActions: ActionItem[];
  todayKey: string;
  onSchedule: (id: string, date?: string) => Promise<void>;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onEdit: (action: ActionItem) => void;
  onToggleComplete: (id: string) => void;
};

function todayLabel() {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
}

export function TodayList({ actions, reviewActions, undatedActions, todayKey, onSchedule, onSendToReview, onAdd, onDelete, onEdit, onToggleComplete }: TodayListProps) {
  const activeActions = actions.filter((action) => !action.isCompleted);
  const completedActions = actions.filter((action) => action.isCompleted);
  const renderTask = (action: ActionItem) => (
    <li className={`todo-item ${action.isImportant ? "is-important" : ""}`} key={action.id}>
      <button className={`todo-check ${action.isCompleted ? "is-completed" : ""}`} type="button" onClick={() => onToggleComplete(action.id)} aria-label={`${action.isCompleted ? "Вернуть" : "Выполнить"} «${action.title}»`}>{action.isCompleted ? "✓" : null}</button>
      <div className="todo-copy">
        <strong>{action.title}</strong>
        {action.isImportant ? <span className="important-badge">Важно</span> : null}
      </div>
      <div className="todo-actions">
        {!action.isCompleted ? <button className="todo-action-button" type="button" onClick={() => onSendToReview(action.id)} aria-label={`В Разобрать: ${action.title}`} title="В Разобрать">↩</button> : null}
        <button className="todo-action-button" type="button" onClick={() => onEdit(action)} aria-label={`Изменить «${action.title}»`} title="Изменить">✎</button>
        <button className="todo-action-button danger" type="button" onClick={() => onDelete(action.id)} aria-label={`Удалить «${action.title}»`} title="Удалить">×</button>
      </div>
    </li>
  );

  return (
    <section className="today-view">
      <header className="today-header">
        <div>
          <h1>Сегодня</h1>
          <p suppressHydrationWarning>{todayLabel()}</p>
        </div>
      </header>

      <button className="today-quick-add" type="button" onClick={onAdd}>
        <span className="today-quick-add-icon" aria-hidden="true">+</span>
        <span>Добавь одно небольшое дело…</span>
      </button>

      <section className="today-list-panel">
        <div className="today-list-heading">
          <h2>Текущие дела</h2>
          <span>{activeActions.length} {activeActions.length === 1 ? "дело" : "дел"}</span>
        </div>

        {activeActions.length ? (
          <ul className="todo-list">
            {activeActions.map(renderTask)}
          </ul>
        ) : (
          <div className="today-empty-state">
            <span>○</span>
            <h3>Свободный день</h3>
            <p>Добавь одно небольшое дело, которое приблизит тебя к важному.</p>
            <button className="button" type="button" onClick={onAdd}>Добавить дело</button>
          </div>
        )}
      </section>

      <details className="daily-review" aria-label="Без даты">
        <summary>Без даты<span>{undatedActions.filter((action) => !action.isCompleted).length}</span></summary>
        {undatedActions.length ? <>
          <ul className="todo-list">{undatedActions.filter((action) => !action.isCompleted).map(renderTask)}</ul>
          <ul className="todo-list is-completed">{undatedActions.filter((action) => action.isCompleted).map(renderTask)}</ul>
        </> : <p>Здесь пока нет дел.</p>}
      </details>

      {[{ title: "Разобрать", items: reviewActions }].map(({ title, items }) => (
        <details className="daily-review" key={title}>
          <summary>{title}<span>{items.length}</span></summary>
          {items.length ? <ul className="daily-review-list">
            {items.map((action) => <li key={action.id}>
              <strong>{action.title}</strong>
              <div className="daily-review-actions">
                <button className="mini-button" type="button" onClick={() => void onSchedule(action.id, todayKey)}>На сегодня</button>
                <label>На дату<input aria-label={`Назначить дату для «${action.title}»`} type="date" min={todayKey} value="" onChange={(event) => { if (event.target.value) void onSchedule(action.id, event.target.value); }} /></label>
                {title === "Разобрать" ? <button className="mini-button" type="button" onClick={() => void onSchedule(action.id)}>Без даты</button> : null}
                {title === "Без даты" ? <button className="mini-button" type="button" onClick={() => onSendToReview(action.id)}>В Разобрать</button> : null}
                <button className="mini-button" type="button" onClick={() => onDelete(action.id)}>Удалить</button>
              </div>
            </li>)}
          </ul> : <p>Здесь пока нет дел.</p>}
        </details>
      ))}

      {completedActions.length ? (
        <section className="completed-list" aria-label="Выполненные дела">
          <div className="today-list-heading">
            <h2>Готово</h2>
            <span>{completedActions.length}</span>
          </div>
          <ul className="todo-list is-completed">
            {completedActions.map((action) => (
              <li className={`todo-item ${action.isImportant ? "is-important" : ""}`} key={action.id}>
                <button className="todo-check is-completed" type="button" onClick={() => onToggleComplete(action.id)} aria-label={`Вернуть «${action.title}» в текущие дела`}>✓</button>
                <div className="todo-copy">
                  <strong>{action.title}</strong>
                  {action.isImportant ? <span className="important-badge">Важно</span> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
