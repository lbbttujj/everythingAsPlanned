"use client";

import type { ActDraft } from "@/lib/types";

type ActionFormProps = {
  draft: ActDraft;
  onDraftChange: (draft: ActDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  isEditing: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
};

export function ActionForm({ draft, onDraftChange, onSubmit, onCancel, submitLabel, isEditing, files, onFilesChange }: ActionFormProps) {
  const recurrence = draft.recurrence;
  const oneYearFromToday = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().slice(0, 10);
  };
  const toggleRecurrenceDay = (day: number) => {
    if (!recurrence) return;
    const days = recurrence.days.includes(day) ? recurrence.days.filter((item) => item !== day) : [...recurrence.days, day].sort((left, right) => left - right);
    onDraftChange({ ...draft, recurrence: { ...recurrence, days } });
  };

  return (
    <section className="panel panel-compact quick-task-form">
      <div className="panel-head">
        <div>
          <h2>{isEditing ? "Изменить дело" : "Новое дело"}</h2>
          <p>Коротко запиши то, что хочешь сделать сегодня.</p>
        </div>
      </div>

      <div className="form-grid">
        <textarea
          autoFocus
          className="textarea quick-task-textarea"
          placeholder="Например, записаться к врачу"
          value={draft.title}
          onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
        />

        <label className="important-toggle">
          <input type="checkbox" checked={draft.isImportant} onChange={(event) => onDraftChange({ ...draft, isImportant: event.target.checked })} />
          <span>Важное дело</span>
        </label>

        <label className="important-toggle">
          <input type="checkbox" checked={Boolean(recurrence)} onChange={(event) => onDraftChange({ ...draft, recurrence: event.target.checked ? { frequency: "weekly", days: [1], endDate: oneYearFromToday(), endMode: "always" } : null })} />
          <span>Регулярное дело</span>
        </label>

        {recurrence ? (
          <div className="recurrence-picker">
            <select className="select" value={recurrence.frequency} onChange={(event) => onDraftChange({ ...draft, recurrence: { ...recurrence, frequency: event.target.value as "weekly" | "monthly", days: [1] } })}>
              <option value="weekly">Еженедельное</option>
              <option value="monthly">Ежемесячное</option>
            </select>
            <div className="recurrence-days">
              {(recurrence.frequency === "weekly" ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] : Array.from({ length: 31 }, (_, index) => String(index + 1))).map((label, index) => {
                const day = index + 1;
                return <button className={`recurrence-day ${recurrence.days.includes(day) ? "is-selected" : ""}`} type="button" key={label} onClick={() => toggleRecurrenceDay(day)}>{label}</button>;
              })}
            </div>
            <label className="important-toggle"><input type="checkbox" checked={recurrence.endMode === "always"} onChange={(event) => onDraftChange({ ...draft, recurrence: { ...recurrence, endMode: event.target.checked ? "always" : "until", endDate: event.target.checked ? oneYearFromToday() : recurrence.endDate } })} /><span>Всегда (на год вперёд)</span></label>
            <label className="field"><span>Повторять до</span><input className="input" type="date" value={recurrence.endDate} disabled={recurrence.endMode === "always"} onChange={(event) => onDraftChange({ ...draft, recurrence: { ...recurrence, endDate: event.target.value } })} /></label>
          </div>
        ) : null}

        <label className="attachment-picker">
          <span>Прикрепить фото или файл</span>
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" onChange={(event) => onFilesChange(Array.from(event.target.files ?? []))} />
          {files.length ? <small>Выбрано файлов: {files.length}</small> : null}
        </label>

        <div className="toolbar toolbar-actions">
          <button className="button secondary" type="button" onClick={onCancel}>
            Отмена
          </button>
          <button className="button" type="button" onClick={onSubmit}>
            {submitLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
