# Day 4 patch instructions

Two files are full replacements (drop straight into place):
- backend/src/lib/fileValidation.js  (new)
- backend/src/lib/virusTotal.js      (new)
- backend/src/middleware/upload.middleware.js  (replaces existing)

message.controller.js needs four targeted edits -- see the numbered
patch files here, and the corresponding find/replace instructions in
the chat message this bundle was attached to.

message.model.js needs two fields added -- see chat message, "Patch 2".

## New dependency
cd backend && npm install file-type

## New env var
Add to backend/.env (and .env.example):
VIRUSTOTAL_API_KEY=your_key_here
