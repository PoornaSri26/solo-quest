# Known Issues

Open issues with workarounds. Fixed items move to the changelog.

## Open

### Migration history is incomplete: shadow-database replay fails (`prisma migrate dev`)
**Symptom:** `prisma migrate dev --create-only` fails with P3006 ("no such table: UserSettings") on a fresh shadow database.
**Cause:** several tables (`raids`, `guilds`, `UserSettings`, `SocialStats`, white-label models, …) were created via `prisma db push` in existing environments and were never captured in a migration file. The migration directory therefore does not reconstruct a full schema, so replay against a fresh database breaks partway through.
**Impact:** dev databases keep working; `prisma db execute` + `prisma migrate resolve --applied` is the supported flow for adding new migrations (used for the guild-boss migrations, 2026-09-30). CI/test runs seed schema via `db push` or a prebuilt test.db and are unaffected.
**Fix path:** generate a full baseline migration (`prisma migrate diff --from-empty --to-schema-datamodel` → apply as `--applied` on all environments), after which `migrate dev` works normally. Tracked until then.

### Coverage is excluded for SDK-wrapper and admin-route modules
**Files:** `server/jest.config.js`
Stripe/Redis/jobs wrappers and the admin/analytics REST layers are excluded from coverage collection (with rationale in the config) because exercising them requires live vendor credentials or a full admin e2e suite. Backlog #241 follow-up: replace exclusions with real tests as those surfaces stabilize.

### Jest workers don't exit cleanly on Windows
**Symptom:** "A worker process has failed to exit gracefully…" warning after test runs.
**Impact:** cosmetic — all tests pass; CI unaffected (Linux).
**Workaround:** `--forceExit` in local runs; tracked for a proper teardown audit.

### Environment parity is manual
There is no automated check that dev/CI/prod run the same Node version and env vars beyond `engines` pinning (backlog #209). The engines pin (`node >=20`) is enforced only where npm chooses to enforce it.

## Fixed (kept for searchability)

### Server silently dies when Stripe key is missing
Was an eager Stripe import; fixed by the lazy guarded client (ADR-002). Symptom was only visible in `server/logs/exceptions.log`.

### 404s returned Express HTML instead of JSON
The catch-all 404/error middleware was registered inside `startServer()`, after most route registrations. Moved to module load — integration tests in `server/tests/middleware.test.ts` guard this ordering regression.

### `prisma db push` did not honor `DATABASE_URL`
The datasource URL was hardcoded to `file:./dev.db` in `schema.prisma`. The datasource now uses `env("DATABASE_URL")` so the CLI and the app read the same value from `.env`.

### Raid endpoints crashed serializing BigInt
`res.json(raid)` threw "Do not know how to serialize a BigInt" because `Raid.targetExp`/`progressExp` (and `Guild.totalExp`) are `BigInt` columns. Fixed with a global `BigInt.prototype.toJSON` patch plus an explicit `serializeRaid` helper on raid responses; guarded by `server/tests/guild-boss.test.ts`.
