import { createClient } from "@/lib/supabase/client";
import type { Attachment } from "@/lib/types";

export const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;

export function validateAttachmentFiles(files: File[]) {
  const oversized = files.find((file) => file.size > MAX_ATTACHMENT_BYTES);
  return oversized ? `Файл «${oversized.name}» больше 6 МБ. Выбери файл меньшего размера.` : null;
}

export function mergeAttachmentFiles(current: File[], added: File[]) {
  const result = [...current];
  for (const file of added) {
    if (!result.some((other) => other.name === file.name && other.size === file.size && other.type === file.type && other.lastModified === file.lastModified)) result.push(file);
  }
  return result;
}

export function attachmentSizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} МБ`;
}

export async function loadTaskAttachment(attachment: Attachment): Promise<Blob> {
  const supabase = createClient();
  let path = attachment.storagePath;
  if (!path) {
    const { data, error } = await supabase.from("attachments").select("storage_path").eq("id", attachment.id).single();
    if (error) throw error;
    path = data?.storage_path;
  }
  if (!path) throw new Error("Файл не найден.");
  const { data, error } = await supabase.storage.from("planner-attachments").download(path);
  if (error) throw error;
  if (!data) throw new Error("Не удалось загрузить файл.");
  return data;
}

export function saveAttachmentBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Allow mobile browsers time to start the download before releasing its URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
