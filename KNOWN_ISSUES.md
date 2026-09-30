# Known Issues

Open issues with workarounds. Fixed items move to the changelog.

## Open

### Coverage is excluded for SDK-wrapper and admin-route modules
**Files:** `server/jest.config.js`
Stripe/Redis/jobs wrappers and the admin/analytics REST layers are excluded from coverage collection (with rationale in the config) because exercising them requires live vendor credentials or a full admin e2e suite. Backlog #241 follow-up: replace exclusions with real tests as those surfaces stabilize.

### Jest workers don't exit cleanly on Windows
**Symptom:** "A worker process has failed to exit gracefully…" warning after test runs.
**Impact:** cosmetic — all tests pass; CI unaffected (Linux).
**Workaround:** `--forceExit` in local runs; tracked for a proper teardown audit.

### `prisma db push` does not honor `DATABASE_URL`
The CLI reads the URL hardcoded in `schema.prisma`. Until the datasource is templated to `env("DATABASE_URL")`, pushing to a non-default database requires a temp schema copy (see TROUBLESHOOTING.md).

### Environment parity is manual
There is no automated check that dev/CI/prod run the same Node version and env vars beyond `engines` pinning (backlog #209). The engines pin (`node >=20`) is enforced only where npm chooses to enforce it.

## Fixed (kept for searchability)

### Server silently dies when Stripe key is missing
Was an eager Stripe import; fixed by the lazy guarded client (ADR-002). Symptom was only visible in `server/logs/exceptions.log`.

### 404s returned Express HTML instead of JSON
The catch-all 404/error middleware was registered inside `startServer()`, after most route registrations. Moved to module load — integration tests in `server/tests/middleware.test.ts` guard this ordering regression.
