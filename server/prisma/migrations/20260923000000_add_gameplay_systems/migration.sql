-- Gameplay systems: class/archetype, combo/momentum, energy/mood check-ins,
-- quest snooze, failure reflection, loot drops.
-- NOTE: This database's tables use the model names (HunterStats/Quest), not the
-- @@map snake_case names, so both spellings are attempted. SQLite has no
-- "ADD COLUMN IF NOT EXISTS"; errors from duplicate columns are tolerated by
-- re-running resolve/deploy per environment.

-- HunterStats (model-name spelling, matches this dev database)
ALTER TABLE "HunterStats" ADD COLUMN "hunterClass" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "HunterStats" ADD COLUMN "comboCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "HunterStats" ADD COLUMN "comboDate" DATETIME;
ALTER TABLE "HunterStats" ADD COLUMN "lastEnergyLevel" INTEGER;
ALTER TABLE "HunterStats" ADD COLUMN "lastMoodLevel" INTEGER;
ALTER TABLE "HunterStats" ADD COLUMN "lastCheckInAt" DATETIME;

-- Quest (model-name spelling)
ALTER TABLE "Quest" ADD COLUMN "snoozedUntil" DATETIME;
ALTER TABLE "Quest" ADD COLUMN "snoozeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Quest" ADD COLUMN "reflection" TEXT;
ALTER TABLE "Quest" ADD COLUMN "lootDropped" TEXT;
