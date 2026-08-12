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
  const selectedFile = files[0];
  const formattedDate = draft.scheduledFor ? draft.scheduledFor.split("-").reverse().join(".") : "";
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
    <section className="action-sheet-content">
      <div className="action-sheet-heading">
        <span className="action-sheet-handle" aria-hidden="true" />
        <h2>{isEditing ? "Изменить дело" : "Новое дело"}</h2>
      </div>

      <div className="action-sheet-form">
        <textarea
          autoFocus
          className="textarea action-sheet-title"
          placeholder="Что нужно сделать?"
          value={draft.title}
          onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
        />

        <div className="action-sheet-settings">
          <label className="action-setting-row">
            <span className="action-setting-label"><span className="action-setting-icon" aria-hidden="true">▣</span>Дата</span>
            <span className="action-date-control"><span>{formattedDate || "Сегодня"}</span><input aria-label="Дата дела" type="date" value={draft.scheduledFor} onChange={(event) => onDraftChange({ ...draft, scheduledFor: event.target.value })} /></span>
          </label>

          <label className="action-setting-row action-toggle-row">
            <span className="action-setting-label"><span className="action-setting-icon" aria-hidden="true">☆</span>Важное</span>
            <span className={`ios-toggle ${draft.isImportant ? "is-on" : ""}`}><input type="checkbox" checked={draft.isImportant} onChange={(event) => onDraftChange({ ...draft, isImportant: event.target.checked })} /><span aria-hidden="true" /></span>
          </label>

          <label className="action-setting-row">
            <span className="action-setting-label"><span className="action-setting-icon" aria-hidden="true">↻</span>Регулярность</span>
            <select className="action-inline-select" value={recurrence?.frequency ?? "none"} onChange={(event) => onDraftChange({ ...draft, recurrence: event.target.value === "none" ? null : { frequency: event.target.value as "weekly" | "monthly", days: [1], endDate: oneYearFromToday(), endMode: "always" } })}>
              <option value="none">Нет</option>
              <option value="weekly">Каждую неделю</option>
              <option value="monthly">Каждый месяц</option>
            </select>
          </label>

          <label className="action-setting-row action-file-row">
            <span className="action-setting-label"><span className="action-setting-icon" aria-hidden="true">⌕</span>{selectedFile ? selectedFile.name : "Файл или фото"}</span>
            <span className="action-file-button">{selectedFile ? "Заменить" : "Добавить"}<input aria-label="Добавить файл или фото" type="file" accept="image/*,.pdf,.doc,.docx,.txt" onChange={(event) => onFilesChange(Array.from(event.target.files ?? []).slice(0, 1))} /></span>
          </label>
        </div>

        {recurrence ? (
          <div className="recurrence-picker action-recurrence-details">
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

        <div className="action-sheet-actions">
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
