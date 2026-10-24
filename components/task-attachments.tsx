"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { PaperclipIcon } from "@/components/paperclip-icon";
import { attachmentSizeLabel, loadTaskAttachment, saveAttachmentBlob } from "@/lib/task-attachments";
import type { Attachment } from "@/lib/types";

type TaskAttachmentsProps = {
  attachments?: Attachment[];
  taskTitle: string;
};

export function TaskAttachments({ attachments = [], taskTitle }: TaskAttachmentsProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const requestRef = useRef(0);
  const listId = useId();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (!attachments.length) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && detailsRef.current && !detailsRef.current.contains(event.target)) detailsRef.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      requestRef.current += 1;
    };
  }, [attachments.length]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  const closePreview = () => {
    setPreview(null);
    detailsRef.current?.querySelector("summary")?.focus();
  };

  const openAttachment = async (attachment: Attachment) => {
    const requestId = ++requestRef.current;
    setPendingId(attachment.id);
    setError("");
    try {
      const blob = await loadTaskAttachment(attachment);
      if (requestId !== requestRef.current) return;
      if (attachment.mimeType.startsWith("image/")) {
        setPreview({ url: URL.createObjectURL(blob), name: attachment.fileName });
      } else {
        saveAttachmentBlob(blob, attachment.fileName);
      }
      if (detailsRef.current) detailsRef.current.open = false;
    } catch {
      if (requestId === requestRef.current) setError("Не удалось открыть файл. Проверь подключение и попробуй ещё раз.");
    } finally {
      if (requestId === requestRef.current) setPendingId(null);
    }
  };

  if (!attachments.length) return null;

  return <>
    <details className="task-attachments" ref={detailsRef} onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (detailsRef.current) detailsRef.current.open = false;
        detailsRef.current?.querySelector("summary")?.focus();
      }
    }}>
      <summary className="task-attachments-trigger" aria-label={`Вложения (${attachments.length}): ${taskTitle}`} aria-controls={listId}>
        <PaperclipIcon /><span>{attachments.length}</span>
      </summary>
      <div className="task-attachments-popover" id={listId}>
        <strong className="task-attachments-heading">Вложения · {attachments.length}</strong>
        <ul aria-label={`Файлы дела «${taskTitle}»`}>
          {attachments.map((attachment) => <li key={attachment.id}>
            <button type="button" disabled={pendingId !== null} onClick={() => void openAttachment(attachment)} title={attachment.fileName}>
              <PaperclipIcon />
              <span className="task-attachment-copy"><span className="task-attachment-name">{attachment.fileName}</span><small>{pendingId === attachment.id ? "Загружаем…" : `${attachmentSizeLabel(attachment.sizeBytes)} · ${attachment.mimeType.startsWith("image/") ? "Посмотреть фото" : "Скачать"}`}</small></span>
            </button>
          </li>)}
        </ul>
        {error ? <p className="task-attachment-error" role="alert">{error}</p> : null}
      </div>
    </details>
    {preview ? createPortal(<TaskAttachmentPreview url={preview.url} name={preview.name} onClose={closePreview} />, document.body) : null}
  </>;
}

function TaskAttachmentPreview({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return <dialog ref={dialogRef} className="task-attachment-preview" aria-label={`Просмотр: ${name}`} onKeyDown={(event) => event.stopPropagation()} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="task-attachment-preview-content">
      <header><span className="task-attachment-name" title={name}>{name}</span><button type="button" onClick={onClose} aria-label="Закрыть изображение" autoFocus>×</button></header>
      {failed ? <p role="alert">Браузер не смог показать изображение. <a href={url} download={name}>Скачать файл</a></p> : <img src={url} alt={name} onError={() => setFailed(true)} />}
    </div>
  </dialog>;
}
