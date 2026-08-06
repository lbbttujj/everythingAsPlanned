"use client";

import { type PointerEvent, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Attachment, BacklogGroup } from "@/lib/types";

type BacklogBoardProps = {
  groups: BacklogGroup[];
  onAddNote: (groupId: string, text: string, files: File[]) => void;
  onCreateGroup: (title: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onDeleteNote: (groupId: string, noteId: string) => void;
  onReorderGroups: (draggedGroupId: string, targetGroupId: string) => void;
};

export function BacklogBoard({ groups, onAddNote, onCreateGroup, onDeleteGroup: deleteGroup, onDeleteNote, onReorderGroups }: BacklogBoardProps) {
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<string[]>([]);
  const [hasInitializedCollapsedGroups, setHasInitializedCollapsedGroups] = useState(false);
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [groupPendingDelete, setGroupPendingDelete] = useState<BacklogGroup | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (hasInitializedCollapsedGroups || groups.length === 0) return;

    setCollapsedGroupIds(groups.map((group) => group.id));
    setHasInitializedCollapsedGroups(true);
  }, [groups, hasInitializedCollapsedGroups]);

  const submitGroup = () => {
    if (!groupTitle.trim()) return;
    onCreateGroup(groupTitle);
    setGroupTitle("");
    setIsAddingGroup(false);
  };

  const submitNote = (groupId: string) => {
    if (!noteText.trim()) return;
    onAddNote(groupId, noteText, noteFiles);
    setNoteText("");
    setNoteFiles([]);
    setActiveGroupId(null);
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroupIds((current) => current.includes(groupId) ? current.filter((item) => item !== groupId) : [...current, groupId]);
  };

  const clearDragState = () => {
    setDraggedGroupId(null);
    setDragOverGroupId(null);
  };

  const onDeleteGroup = (groupId: string) => {
    setGroupPendingDelete(groups.find((group) => group.id === groupId) ?? null);
  };

  const findGroupAtPoint = (clientX: number, clientY: number) => {
    const target = document.elementFromPoint(clientX, clientY);
    return target?.closest<HTMLElement>("[data-backlog-group-id]")?.dataset.backlogGroupId ?? null;
  };

  const startTouchDrag = (event: PointerEvent<HTMLSpanElement>, groupId: string) => {
    if (event.pointerType !== "touch") return;

    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggedGroupId(groupId);
  };

  const moveTouchDrag = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType !== "touch" || !draggedGroupId) return;

    event.preventDefault();
    const targetGroupId = findGroupAtPoint(event.clientX, event.clientY);
    setDragOverGroupId(targetGroupId && targetGroupId !== draggedGroupId ? targetGroupId : null);
  };

  const endTouchDrag = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType !== "touch" || !draggedGroupId) return;

    const targetGroupId = findGroupAtPoint(event.clientX, event.clientY);
    if (targetGroupId && targetGroupId !== draggedGroupId) onReorderGroups(draggedGroupId, targetGroupId);
    clearDragState();
  };

  const viewAttachment = async (attachment: Attachment) => {
    const supabase = createClient();
    let storagePath = attachment.storagePath;
    if (!storagePath) {
      const { data: attachmentRow, error: attachmentError } = await supabase.from("attachments").select("storage_path").eq("id", attachment.id).single();
      if (attachmentError) return;
      storagePath = attachmentRow?.storage_path;
    }
    if (!storagePath) return;

    const { data, error } = await supabase.storage.from("planner-attachments").createSignedUrl(storagePath, 60);
    if (error || !data?.signedUrl) return;

    if (attachment.mimeType.startsWith("image/")) {
      setImagePreviewUrl(data.signedUrl);
      return;
    }

    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = attachment.fileName;
    link.click();
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
              data-backlog-group-id={group.id}
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
                  onPointerDown={(event) => startTouchDrag(event, group.id)}
                  onPointerMove={moveTouchDrag}
                  onPointerUp={endTouchDrag}
                  onPointerCancel={clearDragState}
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
                  <label className="attachment-picker">
                    <span>Прикрепить файл</span>
                    <input type="file" accept="image/*,.pdf,.doc,.docx,.txt" onChange={(event) => setNoteFiles(event.target.files?.[0] ? [event.target.files[0]] : [])} />
                    {noteFiles.length ? <small>Выбран файл: {noteFiles[0].name}</small> : null}
                  </label>
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
                      {note.attachments?.[0] ? <button className="attachment-view-button" type="button" onClick={() => void viewAttachment(note.attachments![0])}>Посмотреть</button> : null}
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
      {imagePreviewUrl ? <div className="image-preview-backdrop" role="presentation" onMouseDown={() => setImagePreviewUrl(null)}><div className="image-preview-dialog" role="dialog" aria-modal="true" aria-label="Просмотр изображения" onMouseDown={(event) => event.stopPropagation()}><button className="image-preview-close" type="button" onClick={() => setImagePreviewUrl(null)} aria-label="Закрыть">×</button><img src={imagePreviewUrl} alt="Прикреплённое изображение" /></div></div> : null}
      {groupPendingDelete ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setGroupPendingDelete(null)}>
          <section className="modal-dialog backlog-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-backlog-group-title" onMouseDown={(event) => event.stopPropagation()}>
            <span className="section-kicker">Удаление группы</span>
            <h2 id="delete-backlog-group-title">Удалить «{groupPendingDelete.title}»?</h2>
            <p>Все заметки в этой группе будут удалены без возможности восстановления.</p>
            <div className="toolbar toolbar-actions">
              <button className="button secondary" type="button" onClick={() => setGroupPendingDelete(null)}>Нет</button>
              <button className="button danger-button" type="button" onClick={() => { deleteGroup(groupPendingDelete.id); setGroupPendingDelete(null); }}>Да, удалить</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
