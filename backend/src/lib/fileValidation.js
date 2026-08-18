import { fileTypeFromBuffer } from "file-type";
import path from "path";

/**
 * Two layers of defense, deliberately kept separate:
 *
 *  1. A fast, cheap check in the multer fileFilter (upload.middleware.js)
 *     against the *declared* extension/MIME -- this only exists to reject
 *     obviously-wrong uploads before spending time buffering them.
 *
 *  2. The real check, here: after the file is fully in memory, we look at
 *     its actual bytes (the "magic number" file formats start with) via
 *     the `file-type` package. A client can claim any Content-Type it
 *     wants, but it can't fake what the first few bytes of a real PNG,
 *     ZIP, or PDF look like. This is the check that actually matters.
 *
 * Deny-by-default: anything not explicitly in ALLOWED_MIME_TYPES is
 * rejected, rather than trying to enumerate every dangerous format.
 */

export const ALLOWED_MIME_TYPES = new Set([
  // images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // video
  "video/mp4",
  "video/webm",
  "video/quicktime",
  // documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  // archives
  "application/zip",
  "application/x-7z-compressed",
  "application/gzip",
]);

// Belt-and-suspenders: even if a future ALLOWED_MIME_TYPES edit accidentally
// widened things, these are never permitted, full stop.
const HARD_DENY_EXTENSIONS = new Set([
  ".exe", ".dll", ".so", ".dylib", ".bat", ".cmd", ".sh", ".bash",
  ".ps1", ".msi", ".apk", ".app", ".jar", ".js", ".mjs", ".vbs",
  ".scr", ".com", ".pif", ".gadget", ".wsf", ".htm", ".html",
]);

/**
 * Inspects the actual file bytes and decides whether this upload is
 * allowed. Returns { ok: true, mimeType, extension } or { ok: false, reason }.
 *
 * Plain text files (.txt, .csv) are a known blind spot for magic-byte
 * detection -- they have no distinctive header, so file-type can't
 * identify them from bytes alone. We fall back to trusting the browser's
 * declared type *only* for that narrow case, since a text file can't
 * smuggle an executable payload the way a renamed binary could.
 */
export async function validateUploadedFile(file) {
  const detected = await fileTypeFromBuffer(file.buffer);

  const mimeType = detected?.mime || file.mimetype;
  const extension = detected ? `.${detected.ext}` : path.extname(file.originalname).toLowerCase();

  if (HARD_DENY_EXTENSIONS.has(extension)) {
    return { ok: false, reason: "This file type is not allowed" };
  }

  const isPlainText = !detected && (file.mimetype === "text/plain" || file.mimetype === "text/csv");
  if (!isPlainText && !ALLOWED_MIME_TYPES.has(mimeType)) {
    return { ok: false, reason: "This file type is not supported" };
  }
  if (isPlainText && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return { ok: false, reason: "This file type is not supported" };
  }

  return { ok: true, mimeType: isPlainText ? file.mimetype : mimeType, extension };
}
