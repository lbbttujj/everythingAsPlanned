"use client";

import { useState } from "react";

import { goalBlocks, goalRecommendation, goalScoreLabel } from "@/lib/goal-assessment";
import { scoreBand } from "@/lib/scoring";
import { valueLabels } from "@/lib/value-labels";
import type { ActionItem } from "@/lib/types";

type ActionTableProps = {
  actions: ActionItem[];
  onEdit: (action: ActionItem) => void;
  onDelete: (id: string) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  sortKey: "score" | "title" | "values" | "status" | "manual";
  sortDirection: "asc" | "desc";
  onSort: (key: "score" | "title" | "values" | "status" | "manual") => void;
};

function statusLabel(status: ActionItem["status"]) {
  switch (status) {
    case "new": return "Новая";
    case "reviewed": return "Оценена";
    case "active": return "В работе";
    case "archived": return "Архив";
    default: return status;
  }
}

function answerLabel(value: number) {
  if (value >= 8) return "Высоко";
  if (value >= 5) return "Средне";
  return "Низко";
}

function sectionDecision(action: ActionItem) {
  if (action.kind === "goal") return goalRecommendation(action.score);
  if (action.score >= 80) return "Стоит сделать в ближайшее время";
  if (action.score >= 65) return "Хороший кандидат на следующий шаг";
  return "Не приоритет сейчас";
}

export function ActionTable({ actions, onEdit, onDelete, onReorder, sortKey, sortDirection, onSort }: ActionTableProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const goals = actions.filter((action) => action.kind === "goal");
  const acts = actions.filter((action) => action.kind === "act");

  const handleExportPdf = () => {
    window.print();
  };

  const clearDragState = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const renderRows = (sectionActions: ActionItem[]) => sectionActions.map((action, index) => (
    <tr
      key={action.id}
      className={`${draggedId === action.id ? "is-dragging" : ""} ${dragOverId === action.id ? "drop-target" : ""}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", action.id);
        setDraggedId(action.id);
      }}
      onDragOver={(event) => {
        if (draggedId === action.id) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDragOverId(action.id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const sourceId = event.dataTransfer.getData("text/plain") || draggedId;
        if (sourceId && sourceId !== action.id) onReorder(sourceId, action.id);
        clearDragState();
      }}
      onDragEnd={clearDragState}
    >
      <td className="priority-cell">
        <span className="drag-handle" aria-label="Перетащить запись" title="Перетащить">⠿</span>
        <span className="priority-number">{String(index + 1).padStart(2, "0")}</span>
        <span className={`score-badge ${scoreBand(action.score)}`}>{action.score}%</span>
      </td>
      <td className="goal-cell">
        <strong>{action.title}</strong>
        <p>{action.details || "Без дополнительного описания"}</p>
        <span className={`status status-${action.status}`}>{statusLabel(action.status)}</span>
        <details className="answer-details">
          <summary>{action.kind === "goal" ? "Посмотреть оценку цели" : "Посмотреть ответы"}</summary>
          {action.kind === "goal" && action.goalAssessment ? (
            <div className="goal-table-assessment">
              <div className="goal-table-result"><b>{goalScoreLabel(action.score)}</b><span>{action.goalAssessment.warnings.length ? `${action.goalAssessment.warnings.length} зоны требуют внимания` : "Критичных зон не найдено"}</span></div>
              <div className="answer-grid">
                {goalBlocks.map((block) => <span key={block.id}>{block.title} <b>{action.goalAssessment?.blockScores[block.id]}%</b></span>)}
              </div>
            </div>
          ) : (
            <div className="consequence-table">
              <div className="answer-grid">
                <span>Необходимость <b>{answerLabel(action.answers.necessity)}</b></span>
                <span>Польза <b>{answerLabel(action.answers.perspective)}</b></span>
                <span>Ценности <b>{answerLabel(action.answers.alignment)}</b></span>
                <span>Актуальность <b>{answerLabel(action.answers.urgency)}</b></span>
                <span>Усилие <b>{answerLabel(action.answers.effort)}</b></span>
              </div>
              <div className="consequence-table-list">
                <span><b>Ожидаемый результат</b>{action.consequences.expected || "Не указан"}</span>
                <span><b>Если сделать</b>{action.consequences.ifDone || "Не указано"}</span>
                <span><b>Если не сделать</b>{action.consequences.ifSkipped || "Не указано"}</span>
                <span><b>Риски и цена</b>{action.consequences.risks || "Не указаны"}</span>
              </div>
            </div>
          )}
        </details>
      </td>
      <td>
        <div className="inline-tags">
          {action.values.length > 0 ? action.values.map((value) => <span className="mini-pill" key={value}>{valueLabels[value].title}</span>) : <span className="muted-cell">Не выбраны</span>}
        </div>
      </td>
      <td className="decision-cell">
        <span className="decision-label">{sectionDecision(action)}</span>
        <span className="decision-hint">{action.kind === "goal" ? "Глобальное направление" : "Повседневный уровень"}</span>
      </td>
      <td className="actions-cell">
        <div className="row-actions">
          <button className="mini-button" type="button" onClick={() => onEdit(action)}>Изменить</button>
          <button className="mini-button danger" type="button" onClick={() => onDelete(action.id)}>Удалить</button>
        </div>
      </td>
    </tr>
  ));

  const renderSection = (title: string, description: string, sectionActions: ActionItem[]) => (
    <section className="goal-section" key={title}>
      <div className="section-heading">
        <div>
          <div className="section-kicker">{title === "Цели" ? "Глобально · долго" : "Ближайшее · конкретно"}</div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span className="section-count">{sectionActions.length}</span>
      </div>
      <div className="table-wrap">
        <table className="action-table">
          <thead>
            <tr>
              <th className="priority-column" aria-sort={sortKey === "score" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}><button className="table-sort-button" type="button" onClick={() => onSort("score")}>Приоритет <span>{sortKey === "score" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span></button></th>
              <th aria-sort={sortKey === "title" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}><button className="table-sort-button" type="button" onClick={() => onSort("title")}>Запись <span>{sortKey === "title" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span></button></th>
              <th aria-sort={sortKey === "values" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}><button className="table-sort-button" type="button" onClick={() => onSort("values")}>Ценности <span>{sortKey === "values" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span></button></th>
              <th aria-sort={sortKey === "status" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}><button className="table-sort-button" type="button" onClick={() => onSort("status")}>Решение <span>{sortKey === "status" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span></button></th>
              <th className="actions-column">Управление</th>
            </tr>
          </thead>
          <tbody>
            {sectionActions.length > 0 ? renderRows(sectionActions) : <tr><td colSpan={5} className="empty-state">Пока здесь ничего нет. Добавь первую запись выше.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <section className="panel table-panel">
      <div className="panel-head table-heading">
        <div>
          <div className="section-kicker">Текущий выбор</div>
          <h2>Что сейчас важно</h2>
          <p>{sortKey === "manual" ? "Перетащи строку, чтобы собрать собственную очередь внутри каждого раздела." : "Цели и поступки разделены: нажми на заголовок колонки, чтобы изменить сортировку."}</p>
        </div>
        <div className="table-head-actions">
          <span className="score-pill">{actions.length} записей</span>
          <button className="export-button" type="button" onClick={handleExportPdf}>Выгрузить PDF</button>
        </div>
      </div>
      <div className="goal-sections">
        {renderSection("Цели", "Направления на месяцы и годы. Сначала проверяем, действительно ли это твоя цель.", goals)}
        {renderSection("Бытовое", "Конкретные поступки и эксперименты, которые можно сделать в ближайшее время.", acts)}
      </div>
    </section>
  );
}
