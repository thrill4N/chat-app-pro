import multer from "multer";
import { ALLOWED_MIME_TYPES } from "../lib/fileValidation.js";
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_PROFILE_PICTURE_SIZE = 5 * 1024 * 1024;
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) { cb(new Error("This file type is not supported")); return; }
    cb(null, true);
  },
});

export const uploadProfilePicture = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PROFILE_PICTURE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/") || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Profile pictures must be JPEG, PNG, GIF, or WebP images"));
      return;
    }
    cb(null, true);
  },
});
