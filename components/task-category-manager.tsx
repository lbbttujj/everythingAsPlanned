"use client";

import { type CSSProperties, useState } from "react";

import type { TaskCategoryDefinition } from "@/lib/types";

const iconOptions = [
  "✦", "♥", "💡", "📝", "📚", "🏠", "✈️", "🎯", "🧩", "💼", "🌱",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💕", "⭐", "✨", "🔥",
  "😊", "😎", "🥰", "🤔", "🥳", "😴", "👨‍👩‍👧", "🤝", "🎁", "🎉",
  "💻", "📱", "⚙️", "🔧", "🔬", "🎓", "📖", "✏️", "📌", "📅", "✅", "📂",
  "💰", "💳", "🛒", "👕", "🍎", "☕", "🍕", "🍳", "🏋️", "🏃", "🚲", "🧘",
  "💊", "🩺", "🎨", "🎵", "🎸", "🎬", "📷", "🎮", "🌍", "🏖️", "⛰️", "🚗",
  "🚀", "🐱", "🐶", "🌸", "🌳", "☀️", "🌙", "🌈"
];

type TaskCategoryManagerProps = {
  categories: TaskCategoryDefinition[];
  onClose: () => void;
  onCreate: (title: string, icon: string, color: string) => void;
  onUpdate: (category: TaskCategoryDefinition) => void;
  onDelete: (id: string) => void;
};

export function TaskCategoryManager({ categories, onClose, onCreate, onUpdate, onDelete }: TaskCategoryManagerProps) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("◌");
  const [color, setColor] = useState("#6f7ce8");
  const [drafts, setDrafts] = useState<Record<string, TaskCategoryDefinition>>({});
  const [iconPickerTarget, setIconPickerTarget] = useState<"new" | string | null>(null);

  const draftFor = (category: TaskCategoryDefinition) => drafts[category.id] ?? category;
  const changeDraft = (category: TaskCategoryDefinition, changes: Partial<TaskCategoryDefinition>) => setDrafts((current) => ({ ...current, [category.id]: { ...draftFor(category), ...changes } }));
  const saveDraft = (category: TaskCategoryDefinition) => {
    const next = draftFor(category);
    if (!next.title.trim()) return;
    onUpdate({ ...next, title: next.title.trim() });
    setDrafts((current) => { const { [category.id]: _, ...rest } = current; return rest; });
  };

  return (
    <div className="category-manager-backdrop" role="presentation">
      <section className="category-manager" role="dialog" aria-modal="true" aria-labelledby="category-manager-title">
        <header><div><span className="section-kicker">Структура дня</span><h2 id="category-manager-title">Группы дел</h2></div><button className="todo-action-button" type="button" onClick={onClose} aria-label="Закрыть">×</button></header>
        <p>Задачи удалённой группы останутся в списке без группы.</p>

        <div className="category-create-form">
          <input className="input" value={title} placeholder="Новая группа" onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && title.trim() && (onCreate(title.trim(), icon, color), setTitle(""))} />
          <button className="category-icon-picker-trigger" type="button" aria-label="Выбрать иконку новой группы" onClick={() => setIconPickerTarget((current) => current === "new" ? null : "new")}>{icon}</button>
          <input className="category-color-input" aria-label="Цвет новой группы" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          <button className="button" type="button" onClick={() => { if (!title.trim()) return; onCreate(title.trim(), icon, color); setTitle(""); }}>Добавить</button>
          {iconPickerTarget === "new" ? <div className="category-icon-picker-area"><CategoryIconPicker value={icon} onChange={(nextIcon) => { setIcon(nextIcon); setIconPickerTarget(null); }} /></div> : null}
        </div>

        <div className="category-manager-list">
          {categories.map((category) => {
            const draft = draftFor(category);
            return <article key={category.id} className="category-manager-item" style={{ "--task-category-color": draft.color } as CSSProperties}>
              <button className="category-icon-picker-trigger" type="button" aria-label={`Выбрать иконку ${category.title}`} onClick={() => setIconPickerTarget((current) => current === category.id ? null : category.id)}>{draft.icon}</button>
              <input className="input" aria-label={`Название ${category.title}`} value={draft.title} onChange={(event) => changeDraft(category, { title: event.target.value })} />
              <input className="category-color-input" aria-label={`Цвет ${category.title}`} type="color" value={draft.color} onChange={(event) => changeDraft(category, { color: event.target.value })} />
              <button className="mini-button" type="button" onClick={() => saveDraft(category)}>Сохранить</button>
              <button className="todo-action-button danger" type="button" onClick={() => onDelete(category.id)} aria-label={`Удалить группу «${category.title}»`} title="Удалить группу">×</button>
              {iconPickerTarget === category.id ? <div className="category-icon-picker-area"><CategoryIconPicker value={draft.icon} onChange={(nextIcon) => { changeDraft(category, { icon: nextIcon }); setIconPickerTarget(null); }} /></div> : null}
            </article>;
          })}
        </div>
      </section>
    </div>
  );
}

function CategoryIconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return <div className="thoughts-icon-picker" role="group" aria-label="Эмодзи группы">{iconOptions.map((option) => <button className={value === option ? "is-selected" : ""} type="button" key={option} aria-label={`Эмодзи ${option}`} aria-pressed={value === option} onClick={() => onChange(option)}>{option}</button>)}</div>;
}
