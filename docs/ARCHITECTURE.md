# ARCHITECTURE --- Solo Quest

## Layers
Frontend (src/) renders UI; Backend (server/src/) holds business logic; Prisma/DB stores data; Redis caches; Socket.io pushes realtime.

## Data flow (quest complete)
1. User clicks complete → frontend POST /api/quests/:id
2. Backend validates ownership + state
3. Server computes XP/gold via economy.ts + ledger
4. Prisma persists; Redis invalidates
5. Socket.io emits stats:updated
6. Frontend updates store + dopamine feedback

## Folder structure
src/ (components, pages, sections, lib, store, shared); server/src/; server/prisma/.

## Decisions
Third-party (Stripe) called server-side only. Economy mutations go through ledger helpers.
