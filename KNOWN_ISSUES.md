# Known Issues

Open issues with workarounds. Fixed items move to the changelog.

## Open

### Migration history is incomplete: shadow-database replay fails (`prisma migrate dev`)
**RESOLVED 2026-09-30 (baseline):** the drifted history was replaced with a full-schema baseline:
- `20240101000000_baseline` — complete schema as of before the guild-boss work (`prisma migrate diff --from-empty --to-schema-datamodel`), marked applied on existing databases via `prisma migrate resolve`.
- The two guild-boss migrations were kept (SQL retargeted to the baseline's `@@map` table names, e.g. `"quests"` not `"Quest"`).
- Old partial migrations were removed from `prisma/migrations/` (preserved in git history under those paths).
- Fresh-replay verified: `migrate deploy` on an empty database applies all migrations and `prisma migrate diff` against the schema is empty.
**Remaining caveat:** any other environment that had the old migration rows must be re-baselined once: delete rows from `_prisma_migrations` (or run `migrate resolve --applied 20240101000000_baseline`) before deploying. `prisma migrate dev --create-only` now works against fresh shadow databases.

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
