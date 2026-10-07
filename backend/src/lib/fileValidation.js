import { fileTypeFromBuffer } from "file-type";
import path from "path";

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/webm", "video/quicktime",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv",
  "application/zip", "application/x-7z-compressed", "application/gzip",
]);

const HARD_DENY_EXTENSIONS = new Set([
  ".exe", ".dll", ".so", ".dylib", ".bat", ".cmd", ".sh", ".bash",
  ".ps1", ".msi", ".apk", ".app", ".jar", ".js", ".mjs", ".vbs",
  ".scr", ".com", ".pif", ".gadget", ".wsf", ".htm", ".html",
]);

export async function validateUploadedFile(file) {
  const detected = await fileTypeFromBuffer(file.buffer);
  const mimeType = detected?.mime || file.mimetype;
  const extension = detected ? `.${detected.ext}` : path.extname(file.originalname).toLowerCase();
  if (HARD_DENY_EXTENSIONS.has(extension)) return { ok: false, reason: "This file type is not allowed" };
  const isPlainText = !detected && (file.mimetype === "text/plain" || file.mimetype === "text/csv");
  if (!isPlainText && !ALLOWED_MIME_TYPES.has(mimeType)) return { ok: false, reason: "This file type is not supported" };
  if (isPlainText && !ALLOWED_MIME_TYPES.has(file.mimetype)) return { ok: false, reason: "This file type is not supported" };
  return { ok: true, mimeType: isPlainText ? file.mimetype : mimeType, extension };
}
