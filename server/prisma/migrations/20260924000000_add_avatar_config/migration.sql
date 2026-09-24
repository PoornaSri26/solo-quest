-- AlterTable
-- 3D hunter avatar configuration (report #9): JSON-serialized slot config
-- (bodyType, skinTone, armorColor, accentColor, hairStyle, hairColor, classSigil).
-- Stored as TEXT because the SQLite connector does not support the Json type.
ALTER TABLE "user_settings" ADD COLUMN "avatarConfig" TEXT;
