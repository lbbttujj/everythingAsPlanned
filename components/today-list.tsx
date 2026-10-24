"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";

import { TaskCategoryArtwork } from "@/components/task-category-artwork";
import { TaskAttachments } from "@/components/task-attachments";
import type { ActionItem, TaskCategory, TaskCategoryDefinition } from "@/lib/types";
import { getTaskCategory, taskCategoryStyle, uncategorizedTaskCategory } from "@/lib/task-categories";

type TodayListProps = {
  actions: ActionItem[];
  onSendToReview: (id: string) => void;
  reviewActions: ActionItem[];
  todayKey: string;
  onSchedule: (id: string, date?: string) => Promise<void>;
  onAdd: (categoryId?: string) => void;
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
  const [expandedCategories, setExpandedCategories] = useState<TaskCategory[]>([]);
  const [openTaskMenuId, setOpenTaskMenuId] = useState<string | null>(null);
  const groupLayoutId = useId();
  const reduceMotion = useReducedMotion();
  const activeGroups = [...categories, uncategorizedTaskCategory]
    .map((category) => ({ category, actions: activeActions.filter((action) => getTaskCategory(categories, action.taskCategory).id === category.id) }))
    .filter((group) => group.category.id !== "" || group.actions.length > 0);
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
        <strong className="task-title" title={action.title}>{action.title}</strong>
        {showCategory || action.isImportant || action.attachments?.length ? <div className="todo-meta">
          {showCategory ? renderCategory(action) : null}
          {action.isImportant ? <span className="important-badge">Важно</span> : null}
          <TaskAttachments attachments={action.attachments} taskTitle={action.title} />
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
    <MotionConfig reducedMotion="user" transition={{ layout: { type: "spring", duration: 0.42, bounce: 0.08 } }}>
    <LayoutGroup id={groupLayoutId}>
    <motion.section layout="position" className="today-view">
      <header className="today-header">
        <div>
          <h1>Сегодня</h1>
          <p suppressHydrationWarning>{todayLabel()}</p>
        </div>
      </header>

      <button className="today-quick-add" type="button" onClick={() => onAdd()}>
        <span className="today-quick-add-icon" aria-hidden="true">+</span>
        <span>Добавь одно небольшое дело…</span>
      </button>

      <motion.section layout="position" className="today-list-panel">
        <div className="today-list-heading">
          <h2>Текущие дела</h2>
          <span>{activeActions.length} {activeActions.length === 1 ? "дело" : "дел"}</span>
        </div>

        {activeGroups.length ? (
          <motion.div layout className="today-category-folders">
            {activeGroups.map(({ category, actions: categoryActions }) => {
              const isExpanded = expandedCategories.includes(category.id);
              const contentId = `${groupLayoutId}-group-${encodeURIComponent(category.id || "uncategorized")}`;

              return (
              <motion.section layout className={`today-category-folder ${isExpanded ? "is-expanded" : "is-collapsed"}`} style={{ ...taskCategoryStyle(category), borderRadius: 20 }} key={category.id} aria-label={`${category.title}: ${categoryActions.length} дел`}>
                <motion.button layout="position" className="today-category-folder-header" type="button" onClick={() => {
                  setOpenTaskMenuId(null);
                  setExpandedCategories((current) => current.includes(category.id) ? current.filter((item) => item !== category.id) : [...current, category.id]);
                }} aria-expanded={isExpanded} aria-controls={contentId}>
                  <motion.span layout="position" className="today-category-folder-artwork" aria-hidden="true">
                    <TaskCategoryArtwork icon={category.icon} />
                  </motion.span>
                  <motion.div layout="position" className="today-category-folder-copy">
                    <h3>{category.title}</h3>
                    <span>{categoryActions.length} {categoryActions.length === 1 ? "дело" : "дел"}</span>
                  </motion.div>
                  <motion.span layout="position" className="today-category-folder-toggle" aria-hidden="true"><i /></motion.span>
                </motion.button>
                <div id={contentId} inert={!isExpanded}>
                <AnimatePresence initial={false}>
                  {isExpanded ? <motion.div key="tasks" className="today-category-folder-content" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeInOut" }}>
                    {categoryActions.length ? <motion.ul layout="position" className="todo-list" aria-label={`Дела группы «${category.title}»`}>
                      {categoryActions.map((action) => renderTask(action, false))}
                    </motion.ul> : <p className="today-category-empty">В этой группе пока нет дел.</p>}
                    <button className="today-category-add" type="button" onClick={() => onAdd(category.id)} aria-label={`Добавить дело в группу «${category.title}»`}><span aria-hidden="true">+</span> Добавить дело</button>
                  </motion.div> : null}
                </AnimatePresence>
                </div>
              </motion.section>
              );
            })}
          </motion.div>
        ) : (
          <div className="today-empty-state">
            <span>○</span>
            <h3>Свободный день</h3>
            <p>Добавь одно небольшое дело, которое приблизит тебя к важному.</p>
            <button className="button" type="button" onClick={() => onAdd()}>Добавить дело</button>
          </div>
        )}
      </motion.section>

      {[{ title: "Разобрать", items: reviewActions }].map(({ title, items }) => (
        <motion.details layout="position" className="daily-review" key={title}>
          <summary>{title}<span>{items.length}</span></summary>
          {items.length ? <ul className="daily-review-list">
            {items.map((action) => {
              const isMenuOpen = openTaskMenuId === action.id;

              return <li key={action.id} className={isMenuOpen ? "is-menu-open" : ""}>
              <div className="daily-review-item-header">
                <div className="daily-review-item-title">
                  <strong className="task-title" title={action.title}>{action.title}</strong>
                  {renderCategory(action)}
                  <TaskAttachments attachments={action.attachments} taskTitle={action.title} />
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
        </motion.details>
      ))}

      {completedActions.length ? (
        <motion.section layout="position" className="completed-list" aria-label="Выполненные дела">
          <div className="today-list-heading">
            <h2>Готово</h2>
            <span>{completedActions.length}</span>
          </div>
          <ul className="todo-list is-completed">
            {completedActions.map((action) => (
              <li className={`todo-item ${action.isImportant ? "is-important" : ""}`} key={action.id}>
                <button className="todo-check is-completed" type="button" onClick={() => onToggleComplete(action.id)} aria-label={`Вернуть «${action.title}» в текущие дела`}>✓</button>
                <div className="todo-copy">
                  <strong className="task-title" title={action.title}>{action.title}</strong>
                  {renderCategory(action)}
                  {action.isImportant ? <span className="important-badge">Важно</span> : null}
                  <TaskAttachments attachments={action.attachments} taskTitle={action.title} />
                </div>
              </li>
            ))}
          </ul>
        </motion.section>
      ) : null}
    </motion.section>
    </LayoutGroup>
    </MotionConfig>
  );
}
