# ADR-001 — SQLite for development, Postgres via `DATABASE_URL` in production

- **Status:** Accepted
- **Date:** 2026-09
- **Context:** Solo Quest needs a zero-setup local DX (the schema hardcodes `file:./dev.db`) but must run on managed Postgres in production. Prisma abstracts most of the difference, but SQLite and Postgres differ in concurrency, JSON functions, and migration semantics.
- **Decision:** Develop against SQLite (`server/prisma/dev.db`); production supplies a Postgres connection string via `DATABASE_URL`. Prisma is the only sanctioned DB access path — no raw SQL that would be dialect-specific.
- **Consequences:**
  - `prisma db push` reads the URL hardcoded in `schema.prisma` and ignores a `DATABASE_URL` env override — to push against another database, point a copy of the schema at it (see DEPLOYMENT_GUIDE.md).
  - Migration strategy must be validated on Postgres before first production deploy (`prisma migrate` rather than `db push`).
  - Test suites use a throwaway `file:./test.db` so tests never touch dev data.
