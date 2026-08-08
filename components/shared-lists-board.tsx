"use client";

import { type PointerEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  cancelSharedListInvitation,
  createSharedList,
  createSharedListItem,
  deleteSharedList,
  deleteSharedListItem,
  inviteSharedListMember,
  leaveSharedList,
  loadSharedListsData,
  removeSharedListMember,
  renameSharedList,
  reorderSharedListItems,
  respondSharedListInvitation,
  updateSharedListItem
} from "@/lib/shared-list-repository";
import type { SharedList, SharedListItem, SharedListsData } from "@/lib/types";

type SharedListsBoardProps = {
  userId: string;
  email: string;
};

type Confirmation =
  | { kind: "delete-list"; listId: string; title: string }
  | { kind: "leave-list"; listId: string; title: string }
  | { kind: "remove-member"; listId: string; userId: string; email: string };

const emptyData: SharedListsData = { lists: [], invitations: [] };

export function SharedListsBoard({ userId, email }: SharedListsBoardProps) {
  const [data, setData] = useState<SharedListsData>(emptyData);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const selectedList = useMemo(() => data.lists.find((list) => list.id === selectedListId) ?? null, [data.lists, selectedListId]);

  const refresh = useCallback(async (keepListId: string | null = null) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const next = await loadSharedListsData(userId);
      setData(next);
      setSelectedListId(keepListId && next.lists.some((list) => list.id === keepListId) ? keepListId : null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось загрузить общие списки.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh(null);
  }, [refresh]);

  const run = async (operation: () => Promise<void>, fallbackMessage: string) => {
    setErrorMessage(null);
    try {
      await operation();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : fallbackMessage);
    }
  };

  const updateList = (listId: string, updater: (list: SharedList) => SharedList) => {
    setData((current) => ({ ...current, lists: current.lists.map((list) => list.id === listId ? updater(list) : list) }));
  };

  const submitList = () => void run(async () => {
    if (!listTitle.trim()) return;
    const id = await createSharedList(listTitle);
    setListTitle("");
    setIsCreatingList(false);
    await refresh(id);
  }, "Не удалось создать общий список.");

  const respondInvitation = (invitationId: string, accept: boolean) => void run(async () => {
    await respondSharedListInvitation(invitationId, accept);
    await refresh(null);
  }, "Не удалось обработать приглашение.");

  const submitItem = () => void run(async () => {
    if (!selectedList || !newItemText.trim()) return;
    const position = (selectedList.items[0]?.position ?? 0) + 1;
    const item = await createSharedListItem(selectedList.id, userId, newItemText, position);
    updateList(selectedList.id, (list) => ({ ...list, items: [item, ...list.items] }));
    setNewItemText("");
  }, "Не удалось добавить пункт.");

  const toggleItem = (item: SharedListItem) => void run(async () => {
    const saved = await updateSharedListItem({ ...item, isCompleted: !item.isCompleted });
    updateList(item.listId, (list) => ({ ...list, items: list.items.map((current) => current.id === saved.id ? saved : current) }));
  }, "Не удалось обновить пункт.");

  const submitItemEdit = (item: SharedListItem) => void run(async () => {
    if (!editingItemText.trim()) return;
    const saved = await updateSharedListItem({ ...item, text: editingItemText });
    updateList(item.listId, (list) => ({ ...list, items: list.items.map((current) => current.id === saved.id ? saved : current) }));
    setEditingItemId(null);
    setEditingItemText("");
  }, "Не удалось изменить пункт.");

  const removeItem = (item: SharedListItem) => void run(async () => {
    await deleteSharedListItem(item.id);
    updateList(item.listId, (list) => ({ ...list, items: list.items.filter((current) => current.id !== item.id) }));
  }, "Не удалось удалить пункт.");

  const reorderItems = (sourceId: string, targetId: string) => {
    if (!selectedList || sourceId === targetId) return;
    const sourceIndex = selectedList.items.findIndex((item) => item.id === sourceId);
    const targetIndex = selectedList.items.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const reordered = [...selectedList.items];
    const [source] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, source);
    const positioned = reordered.map((item, index) => ({ ...item, position: reordered.length - index }));
    updateList(selectedList.id, (list) => ({ ...list, items: positioned }));
    void run(async () => {
      await reorderSharedListItems(positioned);
    }, "Не удалось сохранить порядок пунктов.");
  };

  const submitInvite = () => void run(async () => {
    if (!selectedList || !inviteEmail.trim()) return;
    await inviteSharedListMember(selectedList.id, inviteEmail);
    setInviteEmail("");
    await refresh(selectedList.id);
  }, "Не удалось отправить приглашение.");

  const submitRename = () => void run(async () => {
    if (!selectedList || !renameTitle.trim()) return;
    await renameSharedList(selectedList.id, renameTitle);
    updateList(selectedList.id, (list) => ({ ...list, title: renameTitle.trim() }));
    setIsRenaming(false);
  }, "Не удалось переименовать список.");

  const confirmAction = () => void run(async () => {
    if (!confirmation) return;
    if (confirmation.kind === "delete-list") {
      await deleteSharedList(confirmation.listId);
    } else if (confirmation.kind === "leave-list") {
      await leaveSharedList(confirmation.listId);
    } else {
      await removeSharedListMember(confirmation.listId, confirmation.userId);
    }
    setConfirmation(null);
    await refresh(null);
  }, "Не удалось выполнить действие.");

  const clearDragState = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  const findItemAtPoint = (clientX: number, clientY: number) => document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-shared-item-id]")?.dataset.sharedItemId ?? null;

  const startTouchDrag = (event: PointerEvent<HTMLSpanElement>, itemId: string) => {
    if (event.pointerType !== "touch") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggedItemId(itemId);
  };

  const moveTouchDrag = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType !== "touch" || !draggedItemId) return;
    event.preventDefault();
    const targetId = findItemAtPoint(event.clientX, event.clientY);
    setDragOverItemId(targetId && targetId !== draggedItemId ? targetId : null);
  };

  const endTouchDrag = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType !== "touch" || !draggedItemId) return;
    const targetId = findItemAtPoint(event.clientX, event.clientY);
    if (targetId) reorderItems(draggedItemId, targetId);
    clearDragState();
  };

  if (isLoading) return <p className="shared-status">Загружаем общие списки…</p>;

  if (selectedList) {
    const isOwner = selectedList.ownerId === userId;
    const activeMembers = selectedList.members.filter((member) => member.isActive);
    const memberEmails = new Map(selectedList.members.map((member) => [member.userId, member.email]));

    return (
      <section className="shared-list-detail">
        <button className="shared-back-button" type="button" onClick={() => { setSelectedListId(null); setIsMembersOpen(false); }}>‹ Все общие списки</button>
        <header className="shared-list-detail-header">
          <div>
            <span className="section-kicker">Совместный список</span>
            {isRenaming ? (
              <div className="shared-inline-form">
                <input autoFocus className="input" value={renameTitle} onChange={(event) => setRenameTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitRename()} />
                <button className="mini-button" type="button" onClick={submitRename}>Сохранить</button>
              </div>
            ) : <h2>{selectedList.title}</h2>}
            <p>{activeMembers.length} участник{activeMembers.length === 1 ? "" : "а"} · {selectedList.items.length} пунктов</p>
          </div>
          <button className="mini-button" type="button" onClick={() => setIsMembersOpen((current) => !current)} aria-expanded={isMembersOpen}>Участники</button>
        </header>

        {errorMessage ? <p className="data-error" role="alert">{errorMessage}</p> : null}

        {isMembersOpen ? (
          <section className="shared-members-panel">
            <h3>Участники</h3>
            <ul>
              {activeMembers.map((member) => (
                <li key={member.userId}>
                  <span><strong>{member.email}</strong>{member.userId === selectedList.ownerId ? <small>Владелец</small> : null}</span>
                  {isOwner && member.userId !== userId ? <button className="mini-button danger" type="button" onClick={() => setConfirmation({ kind: "remove-member", listId: selectedList.id, userId: member.userId, email: member.email })}>Исключить</button> : null}
                </li>
              ))}
            </ul>

            {isOwner ? (
              <>
                <div className="shared-invite-form">
                  <input className="input" type="email" placeholder="user@example.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitInvite()} />
                  <button className="button" type="button" onClick={submitInvite}>Пригласить</button>
                </div>
                {selectedList.pendingInvitations.length ? (
                  <div className="shared-pending-list">
                    <h4>Ожидают ответа</h4>
                    {selectedList.pendingInvitations.map((invitation) => (
                      <div key={invitation.id}><span>{invitation.invitedEmail}</span><button className="mini-button danger" type="button" onClick={() => void run(async () => { await cancelSharedListInvitation(invitation.id); await refresh(selectedList.id); }, "Не удалось отменить приглашение.")}>Отменить</button></div>
                    ))}
                  </div>
                ) : null}
                <div className="shared-owner-actions">
                  <button className="mini-button" type="button" onClick={() => { setRenameTitle(selectedList.title); setIsRenaming(true); }}>Переименовать</button>
                  <button className="mini-button danger" type="button" onClick={() => setConfirmation({ kind: "delete-list", listId: selectedList.id, title: selectedList.title })}>Удалить список</button>
                </div>
              </>
            ) : <button className="mini-button danger shared-leave-button" type="button" onClick={() => setConfirmation({ kind: "leave-list", listId: selectedList.id, title: selectedList.title })}>Выйти из списка</button>}
          </section>
        ) : null}

        <div className="shared-item-composer">
          <input className="input" placeholder="Добавить общий пункт" value={newItemText} onChange={(event) => setNewItemText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitItem()} />
          <button className="button" type="button" onClick={submitItem}>Добавить</button>
        </div>

        {selectedList.items.length ? (
          <ul className="shared-items">
            {selectedList.items.map((item) => (
              <li
                className={`${item.isCompleted ? "is-completed" : ""} ${dragOverItemId === item.id ? "is-drag-over" : ""}`}
                key={item.id}
                data-shared-item-id={item.id}
                onDragOver={(event) => { if (draggedItemId !== item.id) { event.preventDefault(); setDragOverItemId(item.id); } }}
                onDrop={(event) => { event.preventDefault(); const sourceId = event.dataTransfer.getData("text/plain") || draggedItemId; if (sourceId) reorderItems(sourceId, item.id); clearDragState(); }}
              >
                <span
                  className="shared-item-drag-handle"
                  draggable
                  onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); setDraggedItemId(item.id); }}
                  onDragEnd={clearDragState}
                  onPointerDown={(event) => startTouchDrag(event, item.id)}
                  onPointerMove={moveTouchDrag}
                  onPointerUp={endTouchDrag}
                  onPointerCancel={clearDragState}
                  aria-label={`Переместить «${item.text}»`}
                >⠿</span>
                <button className={`todo-check ${item.isCompleted ? "is-completed" : ""}`} type="button" onClick={() => toggleItem(item)} aria-label={item.isCompleted ? "Вернуть пункт" : "Выполнить пункт"}>{item.isCompleted ? "✓" : null}</button>
                <div className="shared-item-copy">
                  {editingItemId === item.id ? (
                    <input autoFocus className="input" value={editingItemText} onChange={(event) => setEditingItemText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitItemEdit(item)} />
                  ) : <strong>{item.text}</strong>}
                  <small>{item.createdBy ? memberEmails.get(item.createdBy) ?? "Бывший участник" : "Бывший участник"}</small>
                </div>
                <div className="todo-actions">
                  {editingItemId === item.id ? <button className="todo-action-button" type="button" onClick={() => submitItemEdit(item)} aria-label="Сохранить">✓</button> : <button className="todo-action-button" type="button" onClick={() => { setEditingItemId(item.id); setEditingItemText(item.text); }} aria-label="Изменить">✎</button>}
                  <button className="todo-action-button danger" type="button" onClick={() => removeItem(item)} aria-label="Удалить">×</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="shared-empty">Список пока пуст. Добавьте первый общий пункт.</p>}

        {confirmation ? <ConfirmationDialog confirmation={confirmation} onCancel={() => setConfirmation(null)} onConfirm={confirmAction} /> : null}
      </section>
    );
  }

  return (
    <section className="shared-lists-overview">
      {errorMessage ? <p className="data-error" role="alert">{errorMessage}</p> : null}

      {data.invitations.length ? (
        <section className="shared-invitations">
          <h2>Приглашения</h2>
          {data.invitations.map((invitation) => (
            <article key={invitation.id}>
              <div><strong>{invitation.listTitle}</strong><span>{invitation.inviterEmail} предлагает вести список вместе</span></div>
              <div><button className="mini-button" type="button" onClick={() => respondInvitation(invitation.id, true)}>Принять</button><button className="mini-button danger" type="button" onClick={() => respondInvitation(invitation.id, false)}>Отклонить</button></div>
            </article>
          ))}
        </section>
      ) : null}

      <header className="shared-overview-header">
        <div><h2>Общие списки</h2><p>Планы, которые можно вести вместе.</p></div>
        <button className="today-add-button" type="button" onClick={() => setIsCreatingList(true)}><span>+</span>Новый список</button>
      </header>

      {isCreatingList ? (
        <div className="backlog-composer">
          <input autoFocus className="input" placeholder="Например, «Покупки домой»" value={listTitle} onChange={(event) => setListTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitList()} />
          <div><button className="button secondary" type="button" onClick={() => setIsCreatingList(false)}>Отмена</button><button className="button" type="button" onClick={submitList}>Создать</button></div>
        </div>
      ) : null}

      {data.lists.length ? (
        <div className="shared-list-cards">
          {data.lists.map((list) => {
            const activeMembers = list.members.filter((member) => member.isActive).length;
            const openItems = list.items.filter((item) => !item.isCompleted).length;
            return <button type="button" key={list.id} onClick={() => setSelectedListId(list.id)}><span className="shared-list-card-icon">↗</span><strong>{list.title}</strong><small>{activeMembers} участника · {openItems} активных</small></button>;
          })}
        </div>
      ) : (
        <section className="backlog-empty-state"><span>↗</span><h2>Планируйте вместе</h2><p>Создайте список и пригласите людей по e-mail.</p><button className="button" type="button" onClick={() => setIsCreatingList(true)}>Создать общий список</button></section>
      )}

      <p className="shared-account-note">Приглашения для аккаунта {email}</p>
    </section>
  );
}

function ConfirmationDialog({ confirmation, onCancel, onConfirm }: { confirmation: Confirmation; onCancel: () => void; onConfirm: () => void }) {
  const title = confirmation.kind === "delete-list" ? `Удалить «${confirmation.title}»?` : confirmation.kind === "leave-list" ? `Выйти из «${confirmation.title}»?` : `Исключить ${confirmation.email}?`;
  const text = confirmation.kind === "delete-list" ? "Список, участники и все пункты будут удалены без возможности восстановления." : confirmation.kind === "leave-list" ? "Список исчезнет из вашего бэклога, пока владелец не пригласит вас снова." : "Пользователь сразу потеряет доступ к списку.";
  return <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}><section className="modal-dialog backlog-delete-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><span className="section-kicker">Подтверждение</span><h2>{title}</h2><p>{text}</p><div className="toolbar toolbar-actions"><button className="button secondary" type="button" onClick={onCancel}>Отмена</button><button className="button danger-button" type="button" onClick={onConfirm}>Подтвердить</button></div></section></div>;
}
