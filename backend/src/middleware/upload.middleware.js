import multer from "multer";
import { ALLOWED_MIME_TYPES } from "../lib/fileValidation.js";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25mb

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    // Cheap, declared-type-only pre-check -- multer hasn't buffered the
    // file yet at this point (fileFilter runs before the stream is fully
    // read), so the real magic-byte check happens later, in the
    // controller, via validateUploadedFile(). This just rejects
    // obviously-wrong uploads before spending time receiving them.
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("This file type is not supported"));
      return;
    }
    cb(null, true);
  },
});
