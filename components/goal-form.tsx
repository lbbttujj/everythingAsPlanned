"use client";

import { ValueSelection } from "@/components/value-selection";
import {
  calculateGoalAssessment,
  goalBlocks,
  goalFinalOptions,
  goalRecommendation,
  goalScale,
  goalScoreLabel,
  isGoalAssessmentComplete
} from "@/lib/goal-assessment";
import type { GoalDraft, GoalFinalAnswer, GoalQuestionId, LifeValueId } from "@/lib/types";

type GoalFormProps = {
  draft: GoalDraft;
  onDraftChange: (draft: GoalDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEditing: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
};

const statusOptions = [
  { value: "new", label: "Новая" },
  { value: "reviewed", label: "Оценена" },
  { value: "active", label: "В работе" },
  { value: "archived", label: "Архив" }
] as const;

export function GoalForm({ draft, onDraftChange, onSubmit, onCancel, isEditing, files, onFilesChange }: GoalFormProps) {
  const assessment = calculateGoalAssessment(draft.goalAssessment.answers, draft.goalAssessment.finalAnswer);
  const isComplete = isGoalAssessmentComplete(draft.goalAssessment.answers, draft.goalAssessment.finalAnswer);

  const updateAssessment = (answers = draft.goalAssessment.answers, finalAnswer = draft.goalAssessment.finalAnswer) => {
    const next = calculateGoalAssessment(answers, finalAnswer);
    onDraftChange({
      ...draft,
      goalAssessment: {
        answers,
        finalAnswer,
        score: next.score,
        blockScores: next.blockScores,
        warnings: next.warnings
      }
    });
  };

  const setAnswer = (questionId: GoalQuestionId, value: number) => {
    updateAssessment({ ...draft.goalAssessment.answers, [questionId]: value });
  };

  const setFinalAnswer = (value: GoalFinalAnswer) => {
    updateAssessment(draft.goalAssessment.answers, value);
  };

  const toggleValue = (value: LifeValueId) => {
    const nextValues = draft.values.includes(value)
      ? draft.values.filter((item) => item !== value)
      : [...draft.values, value];

    onDraftChange({ ...draft, values: nextValues });
  };

  return (
    <section className="panel panel-compact goal-form-panel">
      <div className="panel-head">
        <div>
          <h2>{isEditing ? "Редактировать цель" : "Добавить цель"}</h2>
          <p>Цель — это долгосрочное направление. Анкета помогает понять, действительно ли она твоя и стоит ли двигаться к ней.</p>
        </div>
        <span className="score-pill">{assessment.score}%</span>
      </div>

      <div className="form-grid">
        <input
          className="input goal-title-input"
          placeholder="Я хочу…"
          value={draft.title}
          onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
          autoFocus
        />
        <textarea
          className="textarea"
          placeholder="Коротко: зачем тебе эта цель и какой жизненной сферы она касается?"
          value={draft.details}
          onChange={(event) => onDraftChange({ ...draft, details: event.target.value })}
        />

        <label className="attachment-picker">
          <span>Прикрепить фото или файл</span>
          <input type="file" accept="image/*,.pdf,.doc,.docx,.txt" onChange={(event) => onFilesChange(event.target.files?.[0] ? [event.target.files[0]] : [])} />
          {files.length ? <small>Выбран файл: {files[0].name}</small> : null}
        </label>

        <div className="field-group">
          <label className="field-label">Связанные ценности</label>
          <ValueSelection values={draft.values} onToggle={toggleValue} />
        </div>

        <div className="goal-progress">
          <div>
            <span className="field-label">Анкета оценки</span>
            <strong>{Object.keys(draft.goalAssessment.answers).length} из 24 вопросов</strong>
          </div>
          <div className="goal-result">
            <strong>{goalScoreLabel(assessment.score)}</strong>
            <span>{goalRecommendation(assessment.score)}</span>
          </div>
        </div>

        <div className="goal-block-list">
          {goalBlocks.map((block, blockIndex) => (
            <section className="goal-block" key={block.id}>
              <div className="goal-block-head">
                <div>
                  <span className="goal-block-number">0{blockIndex + 1}</span>
                  <h3>{block.title}</h3>
                  <p>{block.description}</p>
                </div>
                <span className={`block-score ${assessment.blockScores[block.id] < 50 ? "is-low" : ""}`}>
                  {assessment.blockScores[block.id]}%
                </span>
              </div>

              <div className="goal-question-list">
                {block.questions.map((question, questionIndex) => {
                  const selected = draft.goalAssessment.answers[question.id];

                  return (
                    <div className="goal-question" key={question.id}>
                      <div className="goal-question-text"><span>{blockIndex * 4 + questionIndex + 1}</span>{question.text}</div>
                      <div className="answer-scale" role="group" aria-label={question.text}>
                        {goalScale.map((option) => (
                          <button
                            className={`scale-option ${selected === option.value ? "is-selected" : ""}`}
                            type="button"
                            key={option.value}
                            onClick={() => setAnswer(question.id, option.value)}
                            aria-pressed={selected === option.value}
                            title={option.label}
                          >
                            {option.value}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="final-question">
          <div>
            <span className="field-label">Финальный контрольный вопрос</span>
            <h3>Если достижение цели не гарантировано, считаешь ли ты сам путь к ней достойным своего времени?</h3>
          </div>
          <div className="final-answer-list">
            {goalFinalOptions.map((option) => (
              <button
                className={`final-answer ${draft.goalAssessment.finalAnswer === option.value ? "is-selected" : ""}`}
                type="button"
                key={option.value}
                onClick={() => setFinalAnswer(option.value)}
                aria-pressed={draft.goalAssessment.finalAnswer === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {assessment.warnings.length > 0 ? (
          <div className="warning-list">
            <strong>На что стоит обратить внимание</strong>
            {assessment.warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        ) : null}

        <div className="two-col">
          <label className="field">
            <span>Статус цели</span>
            <select className="select" value={draft.status} onChange={(event) => onDraftChange({ ...draft, status: event.target.value as GoalDraft["status"] })}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <div className="field field-summary">
            <span>Итоговое соответствие</span>
            <strong>{assessment.score}%</strong>
          </div>
        </div>

        {!isComplete ? <p className="form-hint">Ответь на все вопросы и выбери вариант финального вопроса, чтобы сохранить оценку.</p> : null}

        <div className="toolbar toolbar-actions">
          <button className="button secondary" type="button" onClick={onCancel}>Отмена</button>
          <button className="button" type="button" onClick={onSubmit} disabled={!isComplete || !draft.title.trim()}>
            {isEditing ? "Сохранить изменения" : "Добавить цель"}
          </button>
        </div>
      </div>
    </section>
  );
}
