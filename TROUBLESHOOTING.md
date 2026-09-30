# Troubleshooting Guide

Common failure modes and their fixes. If your symptom isn't here, check `server/logs/exceptions.log` first — boot crashes historically only surfaced there.

## Server fails to start

### `Neither apiKey nor config.authenticator provided` in exceptions.log
**Symptom:** server silently dies on boot; nothing on the console.
**Cause:** Stripe key missing while an older build imported Stripe eagerly.
**Fix:** Already fixed (ADR-002). Pull the latest `server/src/stripe.ts` — the client is now lazy and a missing key is non-fatal.

### `EADDRINUSE ::5000`
**Symptom:** `Error: listen EADDRINUSE: address already in use :::5000`.
**Cause:** a previous server instance is still running (note: `startServer()` is skipped under `NODE_ENV=test`, so this only happens outside Jest).
**Fix:** kill the stale process (`npx kill-port 5000`, or find the PID via `netstat -ano | grep 5000` on Windows).

### `JWT_SECRET must be at least 16 characters`
**Symptom:** boot aborts with a Zod validation dump listing env errors.
**Cause:** `server/src/env.ts` validates the environment at startup.
**Fix:** set the variable listed in the error. `server/.env.example` documents every variable and its minimum requirements.

## Database

### Prisma says schema is "out of sync" / missing columns
**Symptom:** runtime `Unknown argument` or `column does not exist` Prisma errors.
**Cause:** `dev.db` predates a schema change.
**Fix:** `cd server && npx prisma db push` (dev only; it syncs without dropping data unless a column type changed destructively). A pre-drift backup of dev.db is the safest path for destructive changes.

### `prisma db push` ignores my `DATABASE_URL`
**Cause:** the CLI reads the datasource URL hardcoded in `schema.prisma` (`file:./dev.db`), not the env var, when the URL is not templated.
**Fix:** for a one-off push to another database, copy the schema and sed the URL in (see DEPLOYMENT_GUIDE.md). Long-term, template the datasource URL: `url = env("DATABASE_URL")`.

### Test suite hangs or fails with "Timed out fetching connection"
**Fix:** tests expect `DATABASE_URL="file:./test.db"` and need `--forceExit` because some suites keep timers open: `cd server && DATABASE_URL="file:./test.db" npx jest --forceExit`. If a suite hangs persistently, run it alone with `--detectOpenHandles`.

## HTTP 403s

### POST returns `{"error":"CSRF protection: Missing origin/referer"}`
**Cause:** expected behavior. Non-browser clients (curl, Postman without headers) send no Origin/Referer, and non-development environments reject them (ADR-003).
**Fix:** send an allowlisted origin: `curl -X POST -H "Origin: http://localhost:5173" ...`. In development (`NODE_ENV=development`) missing headers are allowed for convenience.

### POST returns `{"error":"Invalid origin"}`
**Cause:** the Origin header is present but not in `ALLOWED_ORIGINS`.
**Fix:** add the origin to `ALLOWED_ORIGINS` in `server/.env` and restart.

### Admin endpoints return "Superadmin access required"
**Cause:** the account's `role` is `USER`.
**Fix:** run the idempotent seed: `cd server && npx ts-node --transpile-only prisma/seed-admin.ts` (honors `DATABASE_URL`, refuses the default password when `NODE_ENV=production`).

## TypeScript / tooling

### ts-node-dev hangs or crashes on boot
**Cause (Windows):** a stray `package.json` with `"type": "module"` in a parent directory (e.g. `C:\Users\<you>\package.json`) breaks ts-node's CJS hook.
**Fix:** start the server with `npx ts-node --transpile-only src/index.ts` from `server/`, or remove the stray file.

### `rg` / code-search tools fail with ENOENT
**Cause:** ripgrep binary missing from PATH in some sandboxed environments.
**Fix:** use plain `grep -rn` in the terminal.

## Frontend

### Build fails with "X is not exported from system-voice"
**Cause:** `src/lib/system-voice.ts` exports were trimmed while consumers (LoreCompendium, SystemToastContainer) still imported them.
**Fix:** both `loreFragments` and `rankUpNarrative` are restored — pull latest. When trimming shared modules, run `npm run build` (not just `tsc`) to catch chunk-level import errors.
