"use client";

import type { ActionItem } from "@/lib/types";

type TodayListProps = {
  actions: ActionItem[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onEdit: (action: ActionItem) => void;
  onToggleComplete: (id: string) => void;
};

function todayLabel() {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
}

export function TodayList({ actions, onAdd, onDelete, onEdit, onToggleComplete }: TodayListProps) {
  const activeActions = actions.filter((action) => !action.isCompleted);
  const completedActions = actions.filter((action) => action.isCompleted);

  return (
    <section className="today-view">
      <header className="today-header">
        <div>
          <div className="section-kicker">Фокус дня</div>
          <h1>Сегодня</h1>
          <p suppressHydrationWarning>{todayLabel()}</p>
        </div>
        <button className="today-add-button" type="button" onClick={onAdd}>
          <span>+</span>
          Добавить дело
        </button>
      </header>

      <section className="today-summary" aria-label="Сводка по делам">
        <div>
          <span>В фокусе</span>
          <strong>{activeActions.length}</strong>
        </div>
        <div>
          <span>Готово</span>
          <strong>{completedActions.length}</strong>
        </div>
        <p>{activeActions.length ? "Выбери одно дело и начни с него." : "На сегодня всё сделано. Можно выдохнуть."}</p>
      </section>

      <section className="today-list-panel">
        <div className="today-list-heading">
          <h2>Текущие дела</h2>
          <span>{activeActions.length} {activeActions.length === 1 ? "дело" : "дел"}</span>
        </div>

        {activeActions.length ? (
          <ul className="todo-list">
            {activeActions.map((action) => (
              <li className="todo-item" key={action.id}>
                <button className="todo-check" type="button" onClick={() => onToggleComplete(action.id)} aria-label={`Отметить «${action.title}» выполненным`} />
                <div className="todo-copy">
                  <strong>{action.title}</strong>
                </div>
                <div className="todo-actions">
                  <button className="todo-action-button" type="button" onClick={() => onEdit(action)} aria-label={`Изменить «${action.title}»`} title="Изменить">✎</button>
                  <button className="todo-action-button danger" type="button" onClick={() => onDelete(action.id)} aria-label={`Удалить «${action.title}»`} title="Удалить">×</button>
                </div>
              </li>
            ))}
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

      {completedActions.length ? (
        <section className="completed-list" aria-label="Выполненные дела">
          <div className="today-list-heading">
            <h2>Готово</h2>
            <span>{completedActions.length}</span>
          </div>
          <ul className="todo-list is-completed">
            {completedActions.map((action) => (
              <li className="todo-item" key={action.id}>
                <button className="todo-check is-completed" type="button" onClick={() => onToggleComplete(action.id)} aria-label={`Вернуть «${action.title}» в текущие дела`}>✓</button>
                <div className="todo-copy">
                  <strong>{action.title}</strong>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
