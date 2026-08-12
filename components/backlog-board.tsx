"use client";

import { type PointerEvent, type ReactNode, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { SharedListsBoard } from "@/components/shared-lists-board";
import { createClient } from "@/lib/supabase/client";
import type { Attachment, BacklogGroup } from "@/lib/types";

const GROUP_ICONS = ["✦", "♥", "💡", "📝", "📚", "🏠", "✈️", "🎯", "🧩", "💼", "🌱"];

type BacklogBoardProps = {
  groups: BacklogGroup[];
  onAddNote: (groupId: string, text: string, files: File[]) => void;
  onCreateGroup: (title: string, parentId: string | null, icon: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onDeleteNote: (groupId: string, noteId: string) => void;
  onUpdateGroup: (groupId: string, changes: Partial<Pick<BacklogGroup, "title" | "parentId" | "icon">>) => void;
  onUpdateNote: (groupId: string, noteId: string, text: string) => void;
  onReorderGroups: (draggedGroupId: string, targetGroupId: string) => void;
  userId: string;
  email: string;
};

function fallbackIcon(group: Pick<BacklogGroup, "id" | "title" | "icon">) {
  if (group.icon) return group.icon;
  const source = group.id || group.title;
  const index = [...source].reduce((sum, character) => sum + character.charCodeAt(0), 0) % GROUP_ICONS.length;
  return GROUP_ICONS[index];
}

function descendantIds(groups: BacklogGroup[], rootId: string) {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const group of groups) {
      if (group.parentId && ids.has(group.parentId) && !ids.has(group.id)) {
        ids.add(group.id);
        changed = true;
      }
    }
  }
  return ids;
}

function buildBreadcrumbs(groups: BacklogGroup[], currentGroupId: string | null) {
  const result: BacklogGroup[] = [];
  let cursor = currentGroupId;
  const visited = new Set<string>();
  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    const group = groups.find((item) => item.id === cursor);
    if (!group) break;
    result.unshift(group);
    cursor = group.parentId;
  }
  return result;
}

export function BacklogBoard({ groups, onAddNote, onCreateGroup, onDeleteGroup, onDeleteNote, onUpdateGroup, onUpdateNote, onReorderGroups, userId, email }: BacklogBoardProps) {
  const [mode, setMode] = useState<"personal" | "shared">("personal");
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupIcon, setGroupIcon] = useState(GROUP_ICONS[0]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [groupDialog, setGroupDialog] = useState<"rename" | "move" | "delete" | null>(null);
  const [renamedTitle, setRenamedTitle] = useState("");
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const currentGroup = groups.find((group) => group.id === currentGroupId) ?? null;
  const breadcrumbs = useMemo(() => buildBreadcrumbs(groups, currentGroupId), [groups, currentGroupId]);
  const visibleGroups = useMemo(() => groups.filter((group) => group.parentId === currentGroupId).sort((left, right) => left.order - right.order), [groups, currentGroupId]);
  const blockedMoveIds = currentGroup ? descendantIds(groups, currentGroup.id) : new Set<string>();
  const moveTargets = groups.filter((group) => !blockedMoveIds.has(group.id)).sort((left, right) => left.title.localeCompare(right.title, "ru"));

  const openGroup = (groupId: string) => {
    setCurrentGroupId(groupId);
    setIsGroupMenuOpen(false);
    setIsAddingGroup(false);
    setIsAddingNote(false);
  };

  const submitGroup = () => {
    if (!groupTitle.trim()) return;
    onCreateGroup(groupTitle, currentGroupId, groupIcon);
    setGroupTitle("");
    setGroupIcon(GROUP_ICONS[0]);
    setIsAddingGroup(false);
  };

  const submitNote = () => {
    if (!currentGroupId || !noteText.trim()) return;
    onAddNote(currentGroupId, noteText, noteFiles);
    setNoteText("");
    setNoteFiles([]);
    setIsAddingNote(false);
  };

  const submitNoteEdit = (noteId: string) => {
    if (!currentGroupId || !editingNoteText.trim()) return;
    onUpdateNote(currentGroupId, noteId, editingNoteText);
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const clearDragState = () => {
    setDraggedGroupId(null);
    setDragOverGroupId(null);
  };

  const findGroupAtPoint = (clientX: number, clientY: number) => document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-thought-group-id]")?.dataset.thoughtGroupId ?? null;

  const startTouchDrag = (event: PointerEvent<HTMLSpanElement>, groupId: string) => {
    if (event.pointerType !== "touch") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggedGroupId(groupId);
  };

  const moveTouchDrag = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType !== "touch" || !draggedGroupId) return;
    event.preventDefault();
    const targetId = findGroupAtPoint(event.clientX, event.clientY);
    setDragOverGroupId(targetId && targetId !== draggedGroupId ? targetId : null);
  };

  const endTouchDrag = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType !== "touch" || !draggedGroupId) return;
    const targetId = findGroupAtPoint(event.clientX, event.clientY);
    if (targetId && targetId !== draggedGroupId) onReorderGroups(draggedGroupId, targetId);
    clearDragState();
  };

  const viewAttachment = async (attachment: Attachment) => {
    const supabase = createClient();
    let storagePath = attachment.storagePath;
    if (!storagePath) {
      const { data, error } = await supabase.from("attachments").select("storage_path").eq("id", attachment.id).single();
      if (error) return;
      storagePath = data?.storage_path;
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

  if (mode === "shared") {
    return (
      <section className="backlog-view thoughts-view">
        <ThoughtsHeader />
        <BacklogModeSwitch mode={mode} onChange={setMode} />
        <SharedListsBoard userId={userId} email={email} />
      </section>
    );
  }

  return (
    <section className="backlog-view thoughts-view">
      {!currentGroup ? <ThoughtsHeader /> : null}
      {!currentGroup ? <BacklogModeSwitch mode={mode} onChange={setMode} /> : null}

      {currentGroup ? (
        <>
          <nav className="thoughts-breadcrumbs" aria-label="Путь группы">
            <button type="button" onClick={() => setCurrentGroupId(null)}>Мысли</button>
            {breadcrumbs.map((group, index) => <span key={group.id}><i>/</i><button type="button" onClick={() => setCurrentGroupId(group.id)} aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}>{group.title}</button></span>)}
          </nav>
          <header className="thoughts-folder-header">
            <div className="thoughts-folder-title">
              <span>{fallbackIcon(currentGroup)}</span>
              <div><h1>{currentGroup.title}</h1><p>{visibleGroups.length} подгрупп · {currentGroup.notes.length} записей</p></div>
            </div>
            <div className="thoughts-menu-wrap">
              <button className="thoughts-menu-button" type="button" onClick={() => setIsGroupMenuOpen((value) => !value)} aria-label="Действия с группой">•••</button>
              {isGroupMenuOpen ? (
                <div className="thoughts-menu">
                  <button type="button" onClick={() => { setRenamedTitle(currentGroup.title); setGroupDialog("rename"); setIsGroupMenuOpen(false); }}>Переименовать</button>
                  <button type="button" onClick={() => { setGroupDialog("move"); setIsGroupMenuOpen(false); }}>Переместить</button>
                  <button className="danger" type="button" onClick={() => { setGroupDialog("delete"); setIsGroupMenuOpen(false); }}>Удалить</button>
                </div>
              ) : null}
            </div>
          </header>
        </>
      ) : null}

      <div className="thoughts-toolbar">
        <button className="button secondary" type="button" onClick={() => setIsAddingGroup(true)}>+ {currentGroup ? "Подгруппа" : "Новая группа"}</button>
        {currentGroup ? <button className="button" type="button" onClick={() => setIsAddingNote(true)}>+ Запись</button> : null}
      </div>

      {isAddingGroup ? (
        <section className="thoughts-composer">
          <input autoFocus className="input" placeholder="Название группы" value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitGroup()} />
          <div className="thoughts-icon-picker" aria-label="Иконка группы">{GROUP_ICONS.map((icon) => <button className={groupIcon === icon ? "is-selected" : ""} type="button" key={icon} onClick={() => setGroupIcon(icon)}>{icon}</button>)}</div>
          <div className="toolbar toolbar-actions"><button className="button secondary" type="button" onClick={() => setIsAddingGroup(false)}>Отмена</button><button className="button" type="button" onClick={submitGroup}>Создать</button></div>
        </section>
      ) : null}

      {visibleGroups.length ? (
        <div className="thoughts-grid">
          {visibleGroups.map((group) => {
            const childCount = groups.filter((item) => item.parentId === group.id).length;
            return (
              <button className={`thoughts-tile ${dragOverGroupId === group.id ? "is-drag-over" : ""}`} type="button" key={group.id} data-thought-group-id={group.id} onClick={() => openGroup(group.id)} onDragOver={(event) => { if (draggedGroupId === group.id) return; event.preventDefault(); setDragOverGroupId(group.id); }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); const sourceId = event.dataTransfer.getData("text/plain") || draggedGroupId; if (sourceId && sourceId !== group.id) onReorderGroups(sourceId, group.id); clearDragState(); }}>
                <span className="thoughts-tile-icon">{fallbackIcon(group)}</span>
                <span className="thoughts-tile-copy"><strong>{group.title}</strong><small>{childCount ? `${childCount} подгрупп · ` : ""}{group.notes.length} записей</small></span>
                <span className="thoughts-tile-arrow" aria-hidden="true">›</span>
                <span className="thoughts-tile-drag" draggable onClick={(event) => event.stopPropagation()} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", group.id); setDraggedGroupId(group.id); }} onDragEnd={clearDragState} onPointerDown={(event) => startTouchDrag(event, group.id)} onPointerMove={moveTouchDrag} onPointerUp={endTouchDrag} onPointerCancel={clearDragState} aria-label={`Изменить порядок группы «${group.title}»`}>⠿</span>
              </button>
            );
          })}
        </div>
      ) : !currentGroup || !currentGroup.notes.length ? <div className="thoughts-empty"><span>✦</span><h2>{currentGroup ? "Здесь пока пусто" : "Место для мыслей"}</h2><p>{currentGroup ? "Добавь подгруппу или первую запись." : "Создай группу для идей, планов и заметок без даты."}</p></div> : null}

      {currentGroup && isAddingNote ? (
        <section className="thoughts-composer">
          <textarea autoFocus className="textarea" placeholder="Запиши мысль" value={noteText} onChange={(event) => setNoteText(event.target.value)} />
          <label className="attachment-picker"><span>Файл или фото</span><input type="file" accept="image/*,.pdf,.doc,.docx,.txt" onChange={(event) => setNoteFiles(event.target.files?.[0] ? [event.target.files[0]] : [])} />{noteFiles[0] ? <small>{noteFiles[0].name}</small> : null}</label>
          <div className="toolbar toolbar-actions"><button className="button secondary" type="button" onClick={() => setIsAddingNote(false)}>Отмена</button><button className="button" type="button" onClick={submitNote}>Добавить</button></div>
        </section>
      ) : null}

      {currentGroup?.notes.length ? (
        <section className="thoughts-notes-section">
          <h2>Записи</h2>
          <ul className="thoughts-notes">
            {currentGroup.notes.map((note) => (
              <li key={note.id}>
                {editingNoteId === note.id ? (
                  <div className="thoughts-note-edit"><textarea autoFocus className="textarea" value={editingNoteText} onChange={(event) => setEditingNoteText(event.target.value)} /><div><button className="mini-button" type="button" onClick={() => setEditingNoteId(null)}>Отмена</button><button className="mini-button" type="button" onClick={() => submitNoteEdit(note.id)}>Сохранить</button></div></div>
                ) : (
                  <><span className="thoughts-note-text">{note.text}</span><div className="thoughts-note-actions">{note.attachments?.[0] ? <button className="attachment-view-button" type="button" onClick={() => void viewAttachment(note.attachments![0])}>Посмотреть</button> : null}<button className="todo-action-button" type="button" onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.text); }} aria-label="Изменить запись">✎</button><button className="todo-action-button danger" type="button" onClick={() => onDeleteNote(currentGroup.id, note.id)} aria-label="Удалить запись">×</button></div></>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {groupDialog === "rename" && currentGroup ? <ThoughtsDialog title="Переименовать группу" onClose={() => setGroupDialog(null)}><input autoFocus className="input" value={renamedTitle} onChange={(event) => setRenamedTitle(event.target.value)} /><div className="toolbar toolbar-actions"><button className="button secondary" type="button" onClick={() => setGroupDialog(null)}>Отмена</button><button className="button" type="button" onClick={() => { if (renamedTitle.trim()) onUpdateGroup(currentGroup.id, { title: renamedTitle.trim() }); setGroupDialog(null); }}>Сохранить</button></div></ThoughtsDialog> : null}

      {groupDialog === "move" && currentGroup ? <ThoughtsDialog className="thoughts-move-dialog" title="Переместить группу" showBack onClose={() => setGroupDialog(null)}><p>Выбери новое расположение для «{currentGroup.title}».</p><div className="thoughts-move-list"><button className={currentGroup.parentId === null ? "is-current" : ""} type="button" disabled={currentGroup.parentId === null} onClick={() => { onUpdateGroup(currentGroup.id, { parentId: null }); setCurrentGroupId(null); setGroupDialog(null); }}>✦ Общие мысли</button>{moveTargets.map((target) => <button className={currentGroup.parentId === target.id ? "is-current" : ""} type="button" key={target.id} disabled={currentGroup.parentId === target.id} onClick={() => { onUpdateGroup(currentGroup.id, { parentId: target.id }); setCurrentGroupId(target.id); setGroupDialog(null); }}>{fallbackIcon(target)} {target.title}</button>)}</div></ThoughtsDialog> : null}

      {groupDialog === "delete" && currentGroup ? <ThoughtsDialog className="thoughts-delete-dialog" title={`Удалить «${currentGroup.title}»?`} onClose={() => setGroupDialog(null)}><p>Группа, все вложенные подгруппы и записи будут удалены без возможности восстановления.</p><div className="toolbar toolbar-actions"><button className="button secondary" type="button" onClick={() => setGroupDialog(null)}>Нет</button><button className="button danger-button" type="button" onClick={() => { const parentId = currentGroup.parentId; onDeleteGroup(currentGroup.id); setCurrentGroupId(parentId); setGroupDialog(null); }}>Да, удалить всё</button></div></ThoughtsDialog> : null}

      {imagePreviewUrl ? <div className="image-preview-backdrop" role="presentation" onMouseDown={() => setImagePreviewUrl(null)}><div className="image-preview-dialog" role="dialog" aria-modal="true" aria-label="Просмотр изображения" onMouseDown={(event) => event.stopPropagation()}><button className="image-preview-close" type="button" onClick={() => setImagePreviewUrl(null)} aria-label="Закрыть">×</button><img src={imagePreviewUrl} alt="Прикреплённое изображение" /></div></div> : null}
    </section>
  );
}

function ThoughtsHeader() {
  return <header className="backlog-header"><div><div className="section-kicker">Пространство без срока</div><h1>Мысли</h1></div></header>;
}

function BacklogModeSwitch({ mode, onChange }: { mode: "personal" | "shared"; onChange: (mode: "personal" | "shared") => void }) {
  return <div className="backlog-mode-switch" role="tablist" aria-label="Раздел мыслей"><button className={mode === "personal" ? "is-active" : ""} type="button" role="tab" aria-selected={mode === "personal"} onClick={() => onChange("personal")}>Личные</button><button className={mode === "shared" ? "is-active" : ""} type="button" role="tab" aria-selected={mode === "shared"} onClick={() => onChange("shared")}>Общие</button></div>;
}

function ThoughtsDialog({ title, children, className = "", showBack = false, onClose }: { title: string; children: ReactNode; className?: string; showBack?: boolean; onClose: () => void }) {
  const backdropClassName = className ? `${className}-backdrop` : "";
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={`modal-backdrop ${backdropClassName}`} role="presentation" onMouseDown={onClose}><section className={`modal-dialog thoughts-dialog ${className}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><div className="thoughts-dialog-header">{showBack ? <button className="thoughts-dialog-back" type="button" onClick={onClose}>← Назад</button> : null}<h2>{title}</h2></div>{children}</section></div>,
    document.body,
  );
}
