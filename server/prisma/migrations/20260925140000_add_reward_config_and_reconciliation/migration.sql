-- DB-backed reward configuration (tunable game balance) and
-- economy reconciliation run history.

CREATE TABLE IF NOT EXISTS "reward_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL UNIQUE,
    "value" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT
);

CREATE TABLE IF NOT EXISTS "reconciliation_state" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usersChecked" INTEGER NOT NULL,
    "usersWithDrift" INTEGER NOT NULL,
    "maxDriftXp" INTEGER NOT NULL DEFAULT 0,
    "maxDriftGold" INTEGER NOT NULL DEFAULT 0,
    "details" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "reconciliation_state_runAt_idx" ON "reconciliation_state"("runAt");
