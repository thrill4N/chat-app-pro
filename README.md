# 💬 chat-app-pro

A real-time chat application — React/Vite frontend, Express + Socket.io backend, MongoDB Atlas for storage, Clerk for auth, ImageKit for media, Gemini for AI features, Redis for caching. Originally scaffolded from a public tutorial repo and since hardened, rebranded, and substantially extended.

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Data structures & design decisions](#data-structures--design-decisions)
- [Tech stack](#tech-stack)
- [Environment variables](#environment-variables)
- [Running locally](#running-locally)
- [Running with Docker](#running-with-docker)
- [One-time setup: seeding the chatbot](#one-time-setup-seeding-the-chatbot)
- [Feature build log](#feature-build-log)

---

## Features

**Messaging**
- Real-time 1:1 messaging via Socket.io, with online/offline presence
- Group chatrooms: create, add/remove members, owner/admin/member roles, real-time broadcast via Socket.io rooms
- Room access modes: `invite_only` and `request_to_join`, with owner/admin approval flow and duplicate-request prevention
- Cursor-based pagination on message history (both 1:1 and rooms)

**Social feed**
- Signed-in community feed with post creation, reply threads, and reaction actions
- Unique reaction enforcement per user/target and bounded input validation on the server
- Feed pages stay isolated from private chat and room data

**Files & media**
- Image/video attachments plus general file sharing (documents, archives), uploaded via ImageKit
- Real content-type detection via magic bytes (not the declared MIME type), deny-by-default allow-list, executables explicitly blocked
- Malware scanning via VirusTotal: known-malicious files blocked instantly; unknown files scanned in the background and removed if flagged

**AI**
- In-chat chatbot powered by Gemini: always responds in a private DM with it, responds via `@chatbot` mention in group chats and human 1:1s
- Guardrails: system-instruction role anchoring, Gemini safety filters (including jailbreak detection), per-user rate limiting, graceful fallback on API failure
- Hate-speech moderation for group messages: async flag-and-remove, Gemini-based classifier

**Identity & profile**
- Auth via Clerk (hosted sign-up/sign-in UI); a webhook keeps the local `User` collection in sync with Clerk on create/update/delete
- User profile editing (username, bio, status, online-visibility) layered on top of Clerk-owned identity fields

**Performance**
- Redis caching (cache-aside, TTL + active invalidation) for the user list, conversations list, and rooms list

**Ops & hardening**
- `helmet` security headers, API rate limiting, input validation on every write path, centralized JSON error handling
- Multi-stage `Dockerfile` (single image serves API + built frontend) with a `HEALTHCHECK`; `docker-compose.yml` for local dev (Redis included, MongoDB stays on Atlas)
- GitHub Actions CI: backend syntax check, frontend lint + build, on every PR

## Architecture

Three-tier: **client** (React/Vite SPA) → **application** (Express REST API + Socket.io server, delegating to Clerk, ImageKit, VirusTotal, and Gemini) → **data** (MongoDB Atlas + Redis).

Full system design diagrams are maintained in Eraser:
**https://app.eraser.io/workspace/mREAZh6mmEiXkQdfn31n**

## Data structures & design decisions

- **Online-presence map** (`backend/src/lib/socket.js`) — a plain JS hash map, `userId → socketId`, O(1) lookup. Per-process/in-memory; won't work across multiple backend instances without a shared store or sticky sessions -- a known limitation at this scale, not yet needed.
- **Conversation list & rooms list** — built with MongoDB aggregation / lean queries, then wrapped in a Redis cache-aside layer (`lib/redis.js`). Cache misses and Redis being entirely unconfigured both fall through to computing fresh -- caching is an optimization, never a hard dependency.
- **Cursor-based pagination** (`getMessages`, `getRoomMessages`) — `createdAt < before`, sorted descending, limited, reversed. Stays fast at any scroll depth, unlike `.skip().limit()`.
- **Room membership as an embedded array** (`Room.members`) — `{userId, role, joinedAt}` subdocuments rather than a join collection. One query gets a room with its members; the tradeoff (document growth) doesn't bite at realistic group-chat sizes.
- **Message schema shared across 1:1 and rooms** — `receiverId` XOR `roomId`, enforced via conditional `required`. One code path (pagination, sending, moderation, malware scanning) for both contexts instead of two parallel schemas.
- **File-type validation is two-layered** — a cheap declared-MIME pre-check in the multer `fileFilter`, then the real check via magic-byte sniffing (`file-type` package) once the file is actually buffered. A renamed executable is caught by the second layer regardless of what the first one saw.
- **Malware scanning and hate-speech moderation both use async flag-and-remove** — the message sends and broadcasts instantly, a background check follows, and a flagged message gets its content redacted and clients notified via a `messageFlagged` socket event. Chosen over blocking-until-checked for responsiveness; the tradeoff is a brief window where flagged content is visible before removal.
- **Redis cache-aside with TTL + explicit invalidation** — TTL alone for low-stakes staleness (user list), TTL *plus* invalidation-on-write for anything where staleness would be a noticeable UX miss (conversations list, rooms list after a membership change).

## Tech stack

**Frontend:** React, Vite, Tailwind CSS, HeroUI, Zustand, Socket.io client, React Router
**Backend:** Node.js, Express, Socket.io, Mongoose, Multer, Helmet, express-rate-limit, file-type, redis
**Data:** MongoDB Atlas, Redis
**Auth:** Clerk
**Media:** ImageKit
**AI:** Google Gemini (chatbot + moderation classifier)
**Malware scanning:** VirusTotal
**Diagramming:** Eraser.io
**Containerization:** Docker, Docker Compose
**CI:** GitHub Actions

## Environment variables

See `backend/.env.example` for the full annotated list. Copy it to `backend/.env` and fill in real values -- `.env` is already git-ignored.

Frontend needs `VITE_CLERK_PUBLISHABLE_KEY` (in `frontend/.env` for local dev, or exported in your shell before a Docker build).

The app also relies on a verified Clerk session token for Socket.IO connection auth. The backend rejects any client-supplied `userId` that does not match a valid Clerk-issued token, so room and chat events are never trusted solely from the browser.

## Running locally

```bash
# backend
cd backend
cp .env.example .env   # fill in real values
npm install
npm run dev

# frontend, in a second terminal
cd frontend
echo "VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx" > .env
npm install
npm run dev
```

### Validation commands

```bash
cd backend
npm test

cd ../frontend
npm run lint
npm run build
```

Redis is optional for local dev without Docker -- the app runs correctly (just uncached) with `REDIS_URL` unset. To run it: `docker run -p 6379:6379 redis:7-alpine`, or install and run `redis-server` locally.

## Running with Docker

```bash
cp backend/.env.example backend/.env   # fill in real values, including MONGO_URI pointing at Atlas
export VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx   # needed at build time, see docker-compose.yml comments
docker compose up --build
```

This starts Redis and the app together. No `mongo` service is defined on purpose -- this project runs against MongoDB Atlas, not a local database container.

## One-time setup: seeding the chatbot

The chatbot is a real `User` document (`isBot: true`), not a hardcoded id, so it needs to be created once:

```bash
cd backend && npm run db:seed-bot
```

Requires `MONGO_URI` to be set. Without this step, `@chatbot` mentions and bot DMs silently no-op (by design -- a missing bot never crashes the app, it just won't respond).

## Feature build log

Originally scoped as a 4-day sprint, expanded once real requirements (group chatrooms with admin roles, hardened file sharing, an AI chatbot with guardrails, content moderation, caching) made clear the honest scope was larger. Built and merged in this order:

- [x] User profile creation/editing
- [x] Group chatrooms (rooms, membership, admin roles)
- [x] Hardened file sharing (type validation, malware scanning)
- [x] Gemini-powered chatbot with guardrails
- [x] Hate-speech moderation for group messages
- [x] Redis caching layer

Typing indicators and read receipts, originally scoped early on, were deprioritized in favor of the above once the fuller feature set was defined -- not built in this pass, a reasonable next addition.
