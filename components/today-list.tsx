"use client";

import { useState } from "react";

import type { ActionItem, TaskCategory, TaskCategoryDefinition } from "@/lib/types";
import { getTaskCategory, taskCategoryStyle, uncategorizedTaskCategory } from "@/lib/task-categories";

type TodayListProps = {
  actions: ActionItem[];
  onSendToReview: (id: string) => void;
  reviewActions: ActionItem[];
  todayKey: string;
  onSchedule: (id: string, date?: string) => Promise<void>;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onEdit: (action: ActionItem) => void;
  onToggleComplete: (id: string) => void;
  categories: TaskCategoryDefinition[];
};

function todayLabel() {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
}

export function TodayList({ actions, reviewActions, todayKey, onSchedule, onSendToReview, onAdd, onDelete, onEdit, onToggleComplete, categories }: TodayListProps) {
  const activeActions = actions.filter((action) => !action.isCompleted);
  const completedActions = actions.filter((action) => action.isCompleted);
  const [collapsedCategories, setCollapsedCategories] = useState<TaskCategory[]>([]);
  const [openTaskMenuId, setOpenTaskMenuId] = useState<string | null>(null);
  const activeGroups = [...categories, uncategorizedTaskCategory]
    .map((category) => ({ category, actions: activeActions.filter((action) => getTaskCategory(categories, action.taskCategory).id === category.id) }))
    .filter((group) => group.actions.length > 0);
  const renderCategory = (action: ActionItem) => {
    const category = getTaskCategory(categories, action.taskCategory);
    return <span className="task-category" style={taskCategoryStyle(category)}><span aria-hidden="true">{category.icon}</span>{category.title}</span>;
  };
  const renderTask = (action: ActionItem, showCategory = true) => {
    const category = getTaskCategory(categories, action.taskCategory);
    const isMenuOpen = openTaskMenuId === action.id;

    return (
    <li className={`todo-item ${action.isImportant ? "is-important" : ""} ${isMenuOpen ? "is-menu-open" : ""}`} style={taskCategoryStyle(category)} key={action.id}>
      <button className={`todo-check ${action.isCompleted ? "is-completed" : ""}`} type="button" onClick={() => onToggleComplete(action.id)} aria-label={`${action.isCompleted ? "Вернуть" : "Выполнить"} «${action.title}»`}>{action.isCompleted ? "✓" : null}</button>
      <div className="todo-copy">
        <strong>{action.title}</strong>
        {showCategory || action.isImportant ? <div className="todo-meta">
          {showCategory ? renderCategory(action) : null}
          {action.isImportant ? <span className="important-badge">Важно</span> : null}
        </div> : null}
      </div>
      <div className="todo-actions">
      <button className="todo-more-button" type="button" onClick={() => setOpenTaskMenuId((current) => current === action.id ? null : action.id)} aria-label={`Действия: ${action.title}`} aria-expanded={isMenuOpen} aria-haspopup="menu">⋯</button>
        {isMenuOpen ? <div className="todo-actions-menu" role="menu" aria-label={`Действия с «${action.title}»`}>
          {!action.isCompleted ? <button type="button" role="menuitem" onClick={() => { onSendToReview(action.id); setOpenTaskMenuId(null); }}>В «Разобрать»</button> : null}
          <button type="button" role="menuitem" onClick={() => { onEdit(action); setOpenTaskMenuId(null); }}>Изменить</button>
          <button className="danger" type="button" role="menuitem" onClick={() => { onDelete(action.id); setOpenTaskMenuId(null); }}>Удалить</button>
        </div> : null}
      </div>
    </li>
    );
  };

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
          <div className="today-category-folders">
            {activeGroups.map(({ category, actions: categoryActions }) => (
              <section className={`today-category-folder ${collapsedCategories.includes(category.id) ? "is-collapsed" : ""}`} style={taskCategoryStyle(category)} key={category.id} aria-label={`${category.title}: ${categoryActions.length} дел`}>
                <button className="today-category-folder-header" type="button" onClick={() => setCollapsedCategories((current) => current.includes(category.id) ? current.filter((item) => item !== category.id) : [...current, category.id])} aria-expanded={!collapsedCategories.includes(category.id)}>
                  <span className="today-category-folder-icon" aria-hidden="true">{category.icon}</span>
                  <div>
                    <h3>{category.title}</h3>
                    <span>{categoryActions.length} {categoryActions.length === 1 ? "дело" : "дел"}</span>
                  </div>
                  <i aria-hidden="true" />
                </button>
                {!collapsedCategories.includes(category.id) ? <ul className="todo-list">
                  {categoryActions.map((action) => renderTask(action, false))}
                </ul> : null}
              </section>
            ))}
          </div>
        ) : (
          <div className="today-empty-state">
            <span>○</span>
            <h3>Свободный день</h3>
            <p>Добавь одно небольшое дело, которое приблизит тебя к важному.</p>
            <button className="button" type="button" onClick={onAdd}>Добавить дело</button>
          </div>
        )}
      </section>

      {[{ title: "Разобрать", items: reviewActions }].map(({ title, items }) => (
        <details className="daily-review" key={title}>
          <summary>{title}<span>{items.length}</span></summary>
          {items.length ? <ul className="daily-review-list">
            {items.map((action) => {
              const isMenuOpen = openTaskMenuId === action.id;

              return <li key={action.id} className={isMenuOpen ? "is-menu-open" : ""}>
              <div className="daily-review-item-header">
                <div className="daily-review-item-title">
                  <strong>{action.title}</strong>
                  {renderCategory(action)}
                </div>
                <div className="todo-actions">
                  <button className="todo-more-button" type="button" onClick={() => setOpenTaskMenuId((current) => current === action.id ? null : action.id)} aria-label={`Действия: ${action.title}`} aria-expanded={isMenuOpen} aria-haspopup="menu">⋯</button>
                  {isMenuOpen ? <div className="todo-actions-menu" role="menu" aria-label={`Действия с «${action.title}»`}>
                    <button type="button" role="menuitem" onClick={() => { onEdit(action); setOpenTaskMenuId(null); }}>Изменить</button>
                    <button className="danger" type="button" role="menuitem" onClick={() => { onDelete(action.id); setOpenTaskMenuId(null); }}>Удалить</button>
                  </div> : null}
                </div>
              </div>
              <div className="daily-review-actions">
                <button className="mini-button" type="button" onClick={() => void onSchedule(action.id, todayKey)}>На сегодня</button>
                <label>На дату<input aria-label={`Назначить дату для «${action.title}»`} type="date" min={todayKey} value="" onChange={(event) => { if (event.target.value) void onSchedule(action.id, event.target.value); }} /></label>
              </div>
            </li>;
            })}
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
                  {renderCategory(action)}
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
