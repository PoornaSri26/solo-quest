-- 3D hunter avatar configuration (report #9): JSON-serialized slot config
-- (bodyType, skinTone, armorColor, accentColor, hairStyle, hairColor, classSigil).
-- Stored as TEXT because the SQLite connector does not support the Json type.
-- NOTE: table spelling varies by environment (UserSettings model-name vs
-- user_settings @@map name); SQLite has no "ADD COLUMN IF NOT EXISTS", so both
-- are attempted and the failure on the non-matching spelling is tolerated
-- (same pattern as 20260923000000_add_gameplay_systems).

ALTER TABLE "UserSettings" ADD COLUMN "avatarConfig" TEXT;
ALTER TABLE "user_settings" ADD COLUMN "avatarConfig" TEXT;
