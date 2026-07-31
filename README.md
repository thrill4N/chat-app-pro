# 💬 chat-app-pro

A real-time 1:1 chat application — React/Vite frontend, Express + Socket.io backend, MongoDB Atlas for storage, Clerk for auth, ImageKit for media. Originally scaffolded from a public tutorial repo and since hardened, rebranded, and re-architected as a 4-day feature sprint.

---

## Contents

- [Current features](#current-features)
- [Architecture](#architecture)
- [Data structures & design decisions](#data-structures--design-decisions)
- [Tech stack](#tech-stack)
- [Environment variables](#environment-variables)
- [Running locally](#running-locally)
- [Running with Docker](#running-with-docker)
- [4-day feature roadmap](#4-day-feature-roadmap)

---

## Current features

- Real-time 1:1 messaging via Socket.io, with online/offline presence
- Image and video attachments, uploaded to and served from ImageKit
- Sidebar with two views: all users, and active conversations (sorted by most recent)
- Auth via Clerk (hosted sign-up/sign-in UI); a webhook keeps the local `User` collection in sync with Clerk on create/update/delete
- User profile editing (username, bio, status, online-visibility) — app-owned fields layered on top of the Clerk-owned identity fields
- Light/dark mode, 13 wallpapers, 11 themes, optional keyboard sound effects
- Security & reliability hardening: `helmet` headers, API rate limiting, input validation on all message/profile writes, cursor-based pagination on message history, a centralized JSON error handler (including Multer upload errors)
- Self-ping cron job to prevent free-tier host spin-down in production
- Multi-stage `Dockerfile` (single image serves both API and built frontend) with a `HEALTHCHECK`, plus a `docker-compose.yml` for local dev against MongoDB Atlas

## Architecture

Three-tier: **client** (React/Vite SPA) → **application** (Express REST API + Socket.io server, delegating to Clerk and ImageKit) → **data** (MongoDB Atlas).

Full system design diagrams (current architecture, and the proposed additions below) are maintained in Eraser:
**https://app.eraser.io/workspace/mREAZh6mmEiXkQdfn31n**

- Current Architecture canvas: `?diagram=8NqERTPq0nnnFjvpB6Fy&layout=canvas`
- Proposed Architecture canvas (cache, group chatrooms, guardrailed chatbot): `?diagram=_v0VK5ODrc4-Dg02EiLk&layout=canvas`

## Data structures & design decisions

A few choices worth understanding before extending the codebase:

- **Online-presence map** (`backend/src/lib/socket.js`) — a plain JS object used as a hash map, `userId → socketId`, giving O(1) lookup for message delivery. It's per-process and in-memory, which is fine for a single backend instance but won't work across multiple instances without a shared store (see Redis in the roadmap below) or sticky sessions.
- **Conversation list** (`getConversationsForSidebar`) — built with a MongoDB **aggregation pipeline** (an array of stage objects, Mongo's own query DSL) rather than pulling every message into Node and grouping in JS. This pushes the grouping work to the database and avoids transferring the full message history just to derive a short "who have I talked to" list.
- **Message history pagination** (`getMessages`) — uses **cursor-based pagination** (`createdAt < before`, sorted descending, limited, then reversed) instead of `.skip().limit()`. Skip-based paging gets slower the deeper you page; a cursor on an indexed field stays fast at any depth.
- **Partial-update pattern** (`updateProfile`) — builds a plain `updates` object containing only the fields present in the request body, then applies it atomically with `findByIdAndUpdate`. A request that only changes `bio` never touches `username`/`status`/`lastSeenPolicy`, so concurrent edits to different fields can't clobber each other.
- **Sparse unique index on `username`** — a plain unique index would only allow one user *total* with no username set; `sparse: true` lets every pre-existing user stay username-less until they opt in, with no migration needed.

## Tech stack

**Frontend:** React, Vite, Tailwind CSS, HeroUI, Zustand, Socket.io client, React Router
**Backend:** Node.js, Express, Socket.io, Mongoose, Multer, Helmet, express-rate-limit
**Data:** MongoDB Atlas
**Auth:** Clerk
**Media:** ImageKit
**Diagramming:** Eraser.io
**Containerization:** Docker, Docker Compose

## Environment variables

See `backend/.env.example` for the full annotated list (server config, `MONGO_URI`, Clerk keys, ImageKit key, and `AI_AGENT_API_KEY`/`AI_AGENT_MODEL` for the upcoming chatbot feature). Copy it to `backend/.env` and fill in real values — `.env` is already git-ignored.

Frontend needs one variable: `VITE_CLERK_PUBLISHABLE_KEY` (either in `frontend/.env` for local dev, or exported in your shell before a Docker build — see [Running with Docker](#running-with-docker)).

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

## Running with Docker

```bash
cp backend/.env.example backend/.env   # fill in real values, including MONGO_URI pointing at Atlas
export VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx   # needed at build time, see docker-compose.yml comments
docker compose up --build
```

No `mongo` service is defined in `docker-compose.yml` on purpose — this project runs against MongoDB Atlas, not a local database container.

## 4-day feature roadmap

Each day is scoped as its own issue + PR, implemented and merged one at a time:

- [x] **Day 1** — User profile creation/editing (`username`, `bio`, `status`, online-visibility; `PATCH /api/users/me`; settings modal)
- [ ] **Day 2** — Typing indicators + read receipts
- [ ] **Day 3** — Group chatrooms (Socket.io rooms broadcast pattern)
- [ ] **Day 4** — Redis caching layer

Follow-up backlog (scoped in the architecture diagram, not part of the 4-day window): guardrailed AI chatbot, push notifications, message search.
