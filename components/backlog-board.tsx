"use client";

import { useState } from "react";

import type { BacklogGroup } from "@/lib/types";

type BacklogBoardProps = {
  groups: BacklogGroup[];
  onAddNote: (groupId: string, text: string) => void;
  onCreateGroup: (title: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onDeleteNote: (groupId: string, noteId: string) => void;
  onReorderGroups: (draggedGroupId: string, targetGroupId: string) => void;
};

export function BacklogBoard({ groups, onAddNote, onCreateGroup, onDeleteGroup, onDeleteNote, onReorderGroups }: BacklogBoardProps) {
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<string[]>([]);
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const submitGroup = () => {
    if (!groupTitle.trim()) return;
    onCreateGroup(groupTitle);
    setGroupTitle("");
    setIsAddingGroup(false);
  };

  const submitNote = (groupId: string) => {
    if (!noteText.trim()) return;
    onAddNote(groupId, noteText);
    setNoteText("");
    setActiveGroupId(null);
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroupIds((current) => current.includes(groupId) ? current.filter((item) => item !== groupId) : [...current, groupId]);
  };

  const clearDragState = () => {
    setDraggedGroupId(null);
    setDragOverGroupId(null);
  };

  return (
    <section className="backlog-view">
      <header className="backlog-header">
        <div>
          <div className="section-kicker">Без срока</div>
          <h1>Бэклог</h1>
          <p>Идеи и заметки, к которым можно вернуться позже.</p>
        </div>
        <button className="today-add-button" type="button" onClick={() => setIsAddingGroup(true)}>
          <span>+</span>
          Новая группа
        </button>
      </header>

      {isAddingGroup ? (
        <section className="backlog-composer">
          <input autoFocus className="input" placeholder="Например, «Поездки» или «Идеи для дома»" value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitGroup()} />
          <div>
            <button className="button secondary" type="button" onClick={() => setIsAddingGroup(false)}>Отмена</button>
            <button className="button" type="button" onClick={submitGroup}>Создать</button>
          </div>
        </section>
      ) : null}

      {groups.length ? (
        <div className="backlog-groups">
          {groups.map((group) => (
            <section
              className={`backlog-group ${collapsedGroupIds.includes(group.id) ? "is-collapsed" : ""} ${dragOverGroupId === group.id ? "is-drag-over" : ""}`}
              key={group.id}
              onDragOver={(event) => {
                if (draggedGroupId === group.id) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverGroupId(group.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId = event.dataTransfer.getData("text/plain") || draggedGroupId;
                if (sourceId && sourceId !== group.id) onReorderGroups(sourceId, group.id);
                clearDragState();
              }}
            >
              <header className="backlog-group-header">
                <span
                  className="backlog-drag-handle"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", group.id);
                    setDraggedGroupId(group.id);
                  }}
                  onDragEnd={clearDragState}
                  aria-label={`Переместить группу «${group.title}»`}
                  title="Перетащить группу"
                >⠿</span>
                <button className="backlog-group-toggle" type="button" onClick={() => toggleGroup(group.id)} aria-expanded={!collapsedGroupIds.includes(group.id)}>
                  <span>{group.title}</span>
                  <small>{group.notes.length} {group.notes.length === 1 ? "заметка" : "заметок"}</small>
                  <i aria-hidden="true">⌄</i>
                </button>
                <div className="todo-actions">
                  <button className="todo-action-button" type="button" onClick={() => { setActiveGroupId(group.id); setNoteText(""); }} aria-label={`Добавить заметку в «${group.title}»`} title="Добавить заметку">+</button>
                  <button className="todo-action-button danger" type="button" onClick={() => onDeleteGroup(group.id)} aria-label={`Удалить группу «${group.title}»`} title="Удалить группу">×</button>
                </div>
              </header>

              {!collapsedGroupIds.includes(group.id) && activeGroupId === group.id ? (
                <div className="backlog-note-composer">
                  <textarea autoFocus className="textarea" placeholder="Запиши мысль коротко" value={noteText} onChange={(event) => setNoteText(event.target.value)} />
                  <div>
                    <button className="button secondary" type="button" onClick={() => setActiveGroupId(null)}>Отмена</button>
                    <button className="button" type="button" onClick={() => submitNote(group.id)}>Добавить</button>
                  </div>
                </div>
              ) : null}

              {!collapsedGroupIds.includes(group.id) && group.notes.length ? (
                <ul className="backlog-notes">
                  {group.notes.map((note) => (
                    <li key={note.id}>
                      <span>{note.text}</span>
                      <button className="todo-action-button danger" type="button" onClick={() => onDeleteNote(group.id, note.id)} aria-label="Удалить заметку" title="Удалить">×</button>
                    </li>
                  ))}
                </ul>
              ) : !collapsedGroupIds.includes(group.id) ? <p className="backlog-empty">Пока пусто. Добавь первую заметку.</p> : null}
            </section>
          ))}
        </div>
      ) : (
        <section className="backlog-empty-state">
          <span>+</span>
          <h2>Освободи голову</h2>
          <p>Создай группу, чтобы сохранять идеи без обязательства делать их прямо сейчас.</p>
          <button className="button" type="button" onClick={() => setIsAddingGroup(true)}>Создать группу</button>
        </section>
      )}
    </section>
  );
}
