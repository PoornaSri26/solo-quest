-- Tiered completion quality (#96 follow-up): PERFECT | GOOD | POOR, recorded
-- when a quest is completed via /api/quests/:id/complete-tiered. Boss strikes
-- scale damage by this quality (PERFECT 1.5x, GOOD 1x, POOR 0.5x); null means
-- a standard completion (1x).

ALTER TABLE "quests" ADD COLUMN "completionQuality" TEXT;
