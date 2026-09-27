-- Economy ledger: immutable audit trail for every gold/XP change.
-- Written transactionally alongside balance mutations.

CREATE TABLE IF NOT EXISTS "economy_ledger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "xpDelta" INTEGER NOT NULL DEFAULT 0,
    "goldDelta" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "rewardTableVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "economy_ledger_userId_createdAt_idx" ON "economy_ledger"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "economy_ledger_reason_idx" ON "economy_ledger"("reason");
CREATE INDEX IF NOT EXISTS "economy_ledger_referenceType_referenceId_idx" ON "economy_ledger"("referenceType", "referenceId");
