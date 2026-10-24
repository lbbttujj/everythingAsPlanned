"use client";

import { type CSSProperties, type ReactNode, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { closestCenter, DndContext, DragOverlay, KeyboardSensor, MouseSensor, pointerWithin, TouchSensor, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";

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
  onReorderCategories: (draggedId: string, targetId: string) => void;
  isReorderingCategories: boolean;
};

function todayLabel() {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
}

const categoryCollisionDetection: CollisionDetection = (args) => args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);

type TodayCategoryFolderProps = {
  category: TaskCategoryDefinition;
  actions: ActionItem[];
  isExpanded: boolean;
  contentId: string;
  onToggle: () => void;
  onAdd: (categoryId: string) => void;
  renderTask: (action: ActionItem, showCategory: boolean) => ReactNode;
  reduceMotion: boolean | null;
  dragHandleProps?: ReturnType<typeof useSortable>;
  lastDragAt?: React.RefObject<number>;
};

function TodayCategoryFolder({ category, actions, isExpanded, contentId, onToggle, onAdd, renderTask, reduceMotion, dragHandleProps, lastDragAt }: TodayCategoryFolderProps) {
  return <motion.section layout className={`today-category-folder ${isExpanded ? "is-expanded" : "is-collapsed"} ${dragHandleProps?.isDragging ? "is-dragging" : ""}`} style={{ ...taskCategoryStyle(category), borderRadius: 20 }} aria-label={`${category.title}: ${actions.length} дел`}>
    <motion.button layout="position" className="today-category-folder-header" type="button" onClick={() => { if (!lastDragAt || Date.now() - lastDragAt.current > 500) onToggle(); }} aria-expanded={isExpanded} aria-controls={contentId} {...dragHandleProps?.attributes} {...dragHandleProps?.listeners} aria-label={dragHandleProps ? `${category.title}. Удерживайте для перемещения` : undefined}>
      <motion.span layout="position" className="today-category-folder-artwork" aria-hidden="true"><TaskCategoryArtwork icon={category.icon} /></motion.span>
      <motion.div layout="position" className="today-category-folder-copy"><h3>{category.title}</h3><span>{actions.length} {actions.length === 1 ? "дело" : "дел"}</span></motion.div>
      <motion.span layout="position" className="today-category-folder-toggle" aria-hidden="true"><i /></motion.span>
    </motion.button>
    <div id={contentId} inert={!isExpanded}>
      <AnimatePresence initial={false}>
        {isExpanded ? <motion.div key="tasks" className="today-category-folder-content" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeInOut" }}>
          {actions.length ? <motion.ul layout="position" className="todo-list" aria-label={`Дела группы «${category.title}»`}>{actions.map((action) => renderTask(action, false))}</motion.ul> : <p className="today-category-empty">В этой группе пока нет дел.</p>}
          <button className="today-category-add" type="button" onClick={() => onAdd(category.id)} aria-label={`Добавить дело в группу «${category.title}»`}><span aria-hidden="true">+</span> Добавить дело</button>
        </motion.div> : null}
      </AnimatePresence>
    </div>
  </motion.section>;
}

function SortableTodayCategory({ category, isExpanded, disabled, children }: { category: TaskCategoryDefinition; isExpanded: boolean; disabled: boolean; children: (sortable: ReturnType<typeof useSortable>) => ReactNode }) {
  const sortable = useSortable({ id: category.id, disabled: disabled || isExpanded });
  return <div ref={sortable.setNodeRef} className={`today-category-sortable ${isExpanded ? "is-expanded" : ""}`} style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition } as CSSProperties}>
    {children(sortable)}
  </div>;
}

function TodayCategoryDragPreview({ category, count }: { category: TaskCategoryDefinition; count: number }) {
  return <div className="today-category-folder is-collapsed is-overlay" style={taskCategoryStyle(category)}>
    <div className="today-category-folder-header">
      <span className="today-category-folder-artwork"><TaskCategoryArtwork icon={category.icon} /></span>
      <div className="today-category-folder-copy"><h3>{category.title}</h3><span>{count} {count === 1 ? "дело" : "дел"}</span></div>
      <span className="today-category-folder-toggle" aria-hidden="true"><i /></span>
    </div>
  </div>;
}

export function TodayList({ actions, reviewActions, todayKey, onSchedule, onSendToReview, onAdd, onDelete, onEdit, onToggleComplete, categories, onReorderCategories, isReorderingCategories }: TodayListProps) {
  const activeActions = actions.filter((action) => !action.isCompleted);
  const completedActions = actions.filter((action) => action.isCompleted);
  const [expandedCategories, setExpandedCategories] = useState<TaskCategory[]>([]);
  const [openTaskMenuId, setOpenTaskMenuId] = useState<string | null>(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const lastDragAt = useRef(0);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 7 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 240, tolerance: 7 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const groupLayoutId = useId();
  const reduceMotion = useReducedMotion();
  const activeGroups = [...categories, uncategorizedTaskCategory]
    .map((category) => ({ category, actions: activeActions.filter((action) => getTaskCategory(categories, action.taskCategory).id === category.id) }))
    .filter((group) => group.category.id !== "" || group.actions.length > 0);
  const draggableGroups = activeGroups.filter((group) => group.category.id);
  const draggedCategory = draggableGroups.find((group) => group.category.id === draggedCategoryId);
  const toggleCategory = (categoryId: string) => {
    setOpenTaskMenuId(null);
    setExpandedCategories((current) => current.includes(categoryId) ? current.filter((item) => item !== categoryId) : [...current, categoryId]);
  };
  const finishCategoryDrag = (event: DragEndEvent) => {
    lastDragAt.current = Date.now();
    setDraggedCategoryId(null);
    if (event.over && event.active.id !== event.over.id) onReorderCategories(String(event.active.id), String(event.over.id));
  };
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
          <h1 className="sr-only">Сегодня</h1>
          <p suppressHydrationWarning>{todayLabel()}</p>
        </div>
      </header>

      <motion.section layout="position" className="today-list-panel">
        <div className="today-list-heading">
          <h2>Текущие дела</h2>
          <span>{activeActions.length} {activeActions.length === 1 ? "дело" : "дел"}</span>
        </div>

        {activeGroups.length ? (
          <DndContext sensors={sensors} collisionDetection={categoryCollisionDetection} onDragStart={(event: DragStartEvent) => { lastDragAt.current = Date.now(); setDraggedCategoryId(String(event.active.id)); }} onDragEnd={finishCategoryDrag} onDragCancel={() => { lastDragAt.current = Date.now(); setDraggedCategoryId(null); }}>
            <SortableContext items={draggableGroups.map((group) => group.category.id)} strategy={rectSortingStrategy}>
              <motion.div layout className="today-category-folders" aria-label="Группы текущих дел">
                {activeGroups.map(({ category, actions: categoryActions }) => {
                  const isExpanded = expandedCategories.includes(category.id);
                  const folderProps = { category, actions: categoryActions, isExpanded, contentId: `${groupLayoutId}-group-${encodeURIComponent(category.id || "uncategorized")}`, onToggle: () => toggleCategory(category.id), onAdd, renderTask, reduceMotion };
                  return category.id ? <SortableTodayCategory key={category.id} category={category} isExpanded={isExpanded} disabled={isReorderingCategories}>
                    {(sortable) => <TodayCategoryFolder {...folderProps} dragHandleProps={isExpanded ? undefined : sortable} lastDragAt={lastDragAt} />}
                  </SortableTodayCategory> : <div className={`today-category-sortable ${isExpanded ? "is-expanded" : ""}`} key="uncategorized"><TodayCategoryFolder {...folderProps} /></div>;
                })}
              </motion.div>
            </SortableContext>
            {typeof document !== "undefined" ? createPortal(<DragOverlay adjustScale>
              {draggedCategory ? <TodayCategoryDragPreview category={draggedCategory.category} count={draggedCategory.actions.length} /> : null}
            </DragOverlay>, document.body) : null}
          </DndContext>
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
