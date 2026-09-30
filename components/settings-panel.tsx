"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { createFriendContact, loadFriendContacts, removeFriend } from "@/lib/shared-list-repository";
import type { FriendContact } from "@/lib/types";

type SettingsPanelProps = {
  userId: string;
  email: string;
  onClose: () => void;
  onFriendsChange: () => void;
  onManageCategories: () => void;
  onSignOut: () => Promise<void>;
};

export function SettingsPanel({ userId, email, onClose, onFriendsChange, onManageCategories, onSignOut }: SettingsPanelProps) {
  const [friends, setFriends] = useState<FriendContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);

  const requestClose = useCallback(() => {
    if (closeTimer.current !== null) return;
    setIsClosing(true);
    closeTimer.current = window.setTimeout(onClose, 280);
  }, [onClose]);

  const openCategoryManager = () => {
    if (closeTimer.current !== null) return;
    setIsClosing(true);
    closeTimer.current = window.setTimeout(() => {
      onClose();
      onManageCategories();
    }, 280);
  };

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
      if (previousFocus?.isConnected) previousFocus.focus();
      else document.querySelector<HTMLElement>(".settings-trigger")?.focus();
    };
  }, [requestClose]);

  useEffect(() => {
    let active = true;
    void loadFriendContacts(userId).then((contacts) => {
      if (active) setFriends(contacts);
    }).catch((error: unknown) => {
      if (active) setErrorMessage(error instanceof Error ? error.message : "Не удалось загрузить друзей.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [userId]);

  const addFriend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusy || !friendName.trim() || !friendEmail.trim()) return;
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await createFriendContact(friendEmail, friendName);
      onFriendsChange();
      setFriends(await loadFriendContacts(userId));
      setFriendName("");
      setFriendEmail("");
      setIsAddingFriend(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось добавить друга.");
    } finally {
      setIsBusy(false);
    }
  };

  const deleteFriend = async (contactId: string) => {
    if (isBusy) return;
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await removeFriend(contactId);
      setFriends((current) => current.filter((friend) => friend.id !== contactId));
      setConfirmDeleteId(null);
      onFriendsChange();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось удалить друга.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className={`settings-backdrop ${isClosing ? "is-closing" : ""}`} role="presentation" onMouseDown={requestClose}>
      <section className="settings-panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="settings-header">
          <div><span className="section-kicker">Личное пространство</span><h2 id="settings-title">Настройки</h2></div>
          <button className="settings-close" ref={closeButtonRef} type="button" onClick={requestClose} aria-label="Закрыть настройки">×</button>
        </header>

        <div className="settings-content">
          <section className="settings-section" aria-labelledby="settings-appearance-title">
            <h3 id="settings-appearance-title">Внешний вид</h3>
            <ThemeToggle showLabel />
          </section>

          <section className="settings-section" aria-labelledby="settings-account-title">
            <h3 id="settings-account-title">Аккаунт</h3>
            <div className="settings-account-card">
              <span className="settings-avatar" aria-hidden="true">{email.slice(0, 1).toUpperCase()}</span>
              <div><strong>Ваш профиль</strong><small>{email}</small></div>
            </div>
            <div className="settings-future"><span>Скоро</span><p>Здесь появятся управление профилем и безопасностью аккаунта.</p></div>
          </section>

          <section className="settings-section" aria-labelledby="settings-tasks-title">
            <div className="settings-section-heading"><div><h3 id="settings-tasks-title">Дела</h3><p>Создавай группы, выбирай для них цвет и иконку.</p></div></div>
            <button className="settings-manage-categories" type="button" onClick={openCategoryManager}>Управлять группами дел <span aria-hidden="true">›</span></button>
          </section>

          <section className="settings-section" aria-labelledby="settings-friends-title" aria-busy={isLoading || isBusy}>
            <div className="settings-section-heading"><div><h3 id="settings-friends-title">Друзья</h3><p>Быстрый выбор при приглашении в общий список.</p></div><span className="settings-count">{friends.length}</span></div>
            {errorMessage ? <p className="data-error" role="alert">{errorMessage}</p> : null}
            {isLoading ? <p className="settings-muted">Загружаем друзей…</p> : friends.length ? (
              <ul className="settings-friends-list">
                {friends.map((friend) => <li key={friend.id}>
                  <div className="settings-friend-row"><span className="settings-friend-avatar" aria-hidden="true">{friend.name.slice(0, 1).toUpperCase()}</span><span className="settings-friend-copy"><strong>{friend.name}</strong><small>{friend.email}</small></span><button className="settings-remove-friend" type="button" onClick={() => setConfirmDeleteId(friend.id)} aria-label={`Удалить друга ${friend.name}`} disabled={isBusy}>×</button></div>
                  {confirmDeleteId === friend.id ? <div className="settings-confirm"><span>Удалить из друзей?</span><button className="mini-button" type="button" onClick={() => setConfirmDeleteId(null)}>Нет</button><button className="mini-button danger" type="button" onClick={() => void deleteFriend(friend.id)} disabled={isBusy}>Удалить</button></div> : null}
                </li>)}
              </ul>
            ) : <p className="settings-muted">Пока никого нет. Добавь контакт, чтобы не вводить e-mail каждый раз.</p>}

            {isAddingFriend ? (
              <form className="settings-friend-form" onSubmit={(event) => void addFriend(event)}>
                <label>Имя<input className="input" autoFocus value={friendName} onChange={(event) => setFriendName(event.target.value)} placeholder="Как обращаться?" required maxLength={80} /></label>
                <label>E-mail<input className="input" type="email" value={friendEmail} onChange={(event) => setFriendEmail(event.target.value)} placeholder="friend@example.com" required /></label>
                <div><button className="button secondary" type="button" onClick={() => setIsAddingFriend(false)}>Отмена</button><button className="button" type="submit" disabled={isBusy}>Сохранить</button></div>
              </form>
            ) : <button className="settings-add-friend" type="button" onClick={() => setIsAddingFriend(true)}>+ Добавить друга</button>}
          </section>
        </div>

        <footer className="settings-footer"><button className="settings-sign-out" type="button" onClick={() => void onSignOut()}>Выйти из аккаунта</button></footer>
      </section>
    </div>
  );
}
