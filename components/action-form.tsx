"use client";

import { ValueSelection } from "@/components/value-selection";
import { calculateActionScore } from "@/lib/scoring";
import type { ActDraft, ActionStatus, LifeValueId } from "@/lib/types";

type ActionFormProps = {
  draft: ActDraft;
  onDraftChange: (draft: ActDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  scorePreview: number;
  submitLabel: string;
  isEditing: boolean;
};

const statusOptions: Array<{ value: ActionStatus; label: string }> = [
  { value: "new", label: "Новое" },
  { value: "reviewed", label: "Оценено" },
  { value: "active", label: "В работе" },
  { value: "archived", label: "Архив" }
];

function updateAnswer(
  draft: ActDraft,
  onDraftChange: (draft: ActDraft) => void,
  key: keyof ActDraft["answers"],
  value: number
) {
  onDraftChange({
    ...draft,
    answers: {
      ...draft.answers,
      [key]: value
    }
  });
}

export function ActionForm({ draft, onDraftChange, onSubmit, onCancel, scorePreview, submitLabel, isEditing }: ActionFormProps) {
  const toggleValue = (value: LifeValueId) => {
    const nextValues = draft.values.includes(value)
      ? draft.values.filter((item) => item !== value)
      : [...draft.values, value];

    onDraftChange({ ...draft, values: nextValues });
  };

  return (
    <section className="panel panel-compact">
      <div className="panel-head">
        <div>
          <h2>{isEditing ? "Редактировать поступок" : "Добавить поступок"}</h2>
          <p>Бытовое действие, которое можно сделать, проверить или повторить в ближайшее время.</p>
        </div>
        <span className="score-pill">Score {scorePreview}</span>
      </div>

      <div className="form-grid">
        <input
          className="input"
          placeholder="Какой поступок или бытовое действие?"
          value={draft.title}
          onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
        />
        <textarea
          className="textarea"
          placeholder="Краткий контекст: зачем это и какой результат ты хочешь получить?"
          value={draft.details}
          onChange={(event) => onDraftChange({ ...draft, details: event.target.value })}
        />

        <div className="consequence-form">
          <label className="field-label">Последствия выбора</label>
          <div className="two-col">
            <label className="field consequence-field">
              <span>Какой результат я ожидаю?</span>
              <textarea
                className="textarea"
                placeholder="Что изменится, если поступок сработает?"
                value={draft.consequences.expected}
                onChange={(event) => onDraftChange({ ...draft, consequences: { ...draft.consequences, expected: event.target.value } })}
              />
            </label>
            <label className="field consequence-field">
              <span>Что будет, если я это сделаю?</span>
              <textarea
                className="textarea"
                placeholder="Ближайшие и возможные долгосрочные последствия"
                value={draft.consequences.ifDone}
                onChange={(event) => onDraftChange({ ...draft, consequences: { ...draft.consequences, ifDone: event.target.value } })}
              />
            </label>
          </div>
          <div className="two-col">
            <label className="field consequence-field">
              <span>Что будет, если я этого не сделаю?</span>
              <textarea
                className="textarea"
                placeholder="Что останется как есть или станет хуже?"
                value={draft.consequences.ifSkipped}
                onChange={(event) => onDraftChange({ ...draft, consequences: { ...draft.consequences, ifSkipped: event.target.value } })}
              />
            </label>
            <label className="field consequence-field">
              <span>Какие есть риски или цена?</span>
              <textarea
                className="textarea"
                placeholder="Что может пойти не так и чем придётся заплатить?"
                value={draft.consequences.risks}
                onChange={(event) => onDraftChange({ ...draft, consequences: { ...draft.consequences, risks: event.target.value } })}
              />
            </label>
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Связанные ценности</label>
          <ValueSelection values={draft.values} onToggle={toggleValue} />
        </div>

        <div className="two-col">
          <label className="field">
            <span>Насколько это необходимо сейчас? {draft.answers.necessity}</span>
            <input
              type="range"
              min="0"
              max="10"
              value={draft.answers.necessity}
              onChange={(event) => updateAnswer(draft, onDraftChange, "necessity", Number(event.target.value))}
            />
          </label>
          <label className="field">
            <span>Насколько это полезно? {draft.answers.perspective}</span>
            <input
              type="range"
              min="0"
              max="10"
              value={draft.answers.perspective}
              onChange={(event) => updateAnswer(draft, onDraftChange, "perspective", Number(event.target.value))}
            />
          </label>
        </div>

        <div className="two-col">
          <label className="field">
            <span>Насколько это поддерживает цель или ценности? {draft.answers.alignment}</span>
            <input
              type="range"
              min="0"
              max="10"
              value={draft.answers.alignment}
              onChange={(event) => updateAnswer(draft, onDraftChange, "alignment", Number(event.target.value))}
            />
          </label>
          <label className="field">
            <span>Насколько это актуально сейчас? {draft.answers.urgency}</span>
            <input
              type="range"
              min="0"
              max="10"
              value={draft.answers.urgency}
              onChange={(event) => updateAnswer(draft, onDraftChange, "urgency", Number(event.target.value))}
            />
          </label>
        </div>

        <label className="field">
            <span>Сколько усилий это потребует? {draft.answers.effort}</span>
          <input
            type="range"
            min="0"
            max="10"
            value={draft.answers.effort}
            onChange={(event) => updateAnswer(draft, onDraftChange, "effort", Number(event.target.value))}
          />
        </label>

        <div className="two-col">
          <label className="field">
            <span>Статус</span>
            <select
              className="select"
              value={draft.status}
              onChange={(event) => onDraftChange({ ...draft, status: event.target.value as ActionStatus })}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="field field-summary">
            <span>Соответствие</span>
            <strong>{calculateActionScore({ answers: draft.answers })}%</strong>
          </div>
        </div>

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
