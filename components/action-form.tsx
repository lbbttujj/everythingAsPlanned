"use client";

import type { ActDraft } from "@/lib/types";

type ActionFormProps = {
  draft: ActDraft;
  onDraftChange: (draft: ActDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  isEditing: boolean;
};

export function ActionForm({ draft, onDraftChange, onSubmit, onCancel, submitLabel, isEditing }: ActionFormProps) {
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
