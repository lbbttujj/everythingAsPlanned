"use client";

import { useState } from "react";

import { PaperclipIcon } from "@/components/paperclip-icon";
import { TaskAttachments } from "@/components/task-attachments";
import { attachmentSizeLabel, mergeAttachmentFiles, validateAttachmentFiles } from "@/lib/task-attachments";
import type { Attachment } from "@/lib/types";

type TaskAttachmentPickerProps = {
  files: File[];
  existingAttachments?: Attachment[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
};

export function TaskAttachmentPicker({ files, existingAttachments = [], onFilesChange, disabled = false }: TaskAttachmentPickerProps) {
  const [error, setError] = useState("");
  return <div className="task-attachment-picker">
    <div className="action-setting-row action-file-row">
      <span className="action-setting-label"><PaperclipIcon /><span>Файлы{files.length + existingAttachments.length ? ` · ${files.length + existingAttachments.length}` : ""}</span></span>
      <label className="action-file-button">Добавить<input aria-label="Добавить файлы или фото" type="file" multiple disabled={disabled} onChange={(event) => {
        const added = Array.from(event.currentTarget.files ?? []);
        const validationError = validateAttachmentFiles(added);
        setError(validationError ?? "");
        if (!validationError) onFilesChange(mergeAttachmentFiles(files, added));
        event.currentTarget.value = "";
      }} /></label>
    </div>
    {existingAttachments.length ? <div className="task-existing-attachments"><span>Уже прикреплено</span><TaskAttachments attachments={existingAttachments} taskTitle="Прикреплённые файлы" /></div> : null}
    {files.length ? <ul className="task-picked-files" aria-label="Выбранные файлы">
      {files.map((file, index) => <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
        <PaperclipIcon />
        <span className="task-attachment-copy"><span className="task-attachment-name" title={file.name}>{file.name}</span><small>{attachmentSizeLabel(file.size)} · Будет загружен</small></span>
        <button type="button" disabled={disabled} aria-label={`Убрать файл ${file.name}`} onClick={() => onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))}>×</button>
      </li>)}
    </ul> : null}
    <small className="task-attachment-hint">Можно выбрать несколько файлов, до 6 МБ каждый.</small>
    {error ? <p className="task-attachment-error" role="alert">{error}</p> : null}
  </div>;
}
