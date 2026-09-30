-- Guild shared boss fights (#96): a Raid row can represent a shared boss.
-- isBoss marks boss-type raids whose "damage" accrues only from server-verified
-- quest completions (never client-sent XP); bossTier (1-5) scales boss HP and
-- victory rewards (0 = regular raid, unchanged behavior).
-- The raids table itself is created via `prisma db push` in environments where
-- the social models predate the migration history (see KNOWN_ISSUES.md).

ALTER TABLE "raids" ADD COLUMN "isBoss" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "raids" ADD COLUMN "bossTier" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "raids_fk_guild_id_isBoss_status_idx" ON "raids"("fk_guild_id", "isBoss", "status");
