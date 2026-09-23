-- Database Triggers for Data Consistency
-- These triggers ensure data integrity and automatic updates

-- Trigger to update updatedAt timestamp
CREATE TRIGGER IF NOT EXISTS update_users_updatedAt
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_hunter_stats_updatedAt
AFTER UPDATE ON hunter_stats
BEGIN
  UPDATE hunter_stats SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_quests_updatedAt
AFTER UPDATE ON quests
BEGIN
  UPDATE quests SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_quest_subtasks_updatedAt
AFTER UPDATE ON quest_subtasks
BEGIN
  UPDATE quest_subtasks SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_gates_updatedAt
AFTER UPDATE ON gates
BEGIN
  UPDATE gates SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_daily_dungeons_updatedAt
AFTER UPDATE ON daily_dungeons
BEGIN
  UPDATE daily_dungeons SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_dungeon_tasks_updatedAt
AFTER UPDATE ON dungeon_tasks
BEGIN
  UPDATE dungeon_tasks SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_milestones_updatedAt
AFTER UPDATE ON milestones
BEGIN
  UPDATE milestones SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_milestone_progress_updatedAt
AFTER UPDATE ON milestone_progress
BEGIN
  UPDATE milestone_progress SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_mastery_challenges_updatedAt
AFTER UPDATE ON mastery_challenges
BEGIN
  UPDATE mastery_challenges SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_mastery_challenge_progress_updatedAt
AFTER UPDATE ON mastery_challenge_progress
BEGIN
  UPDATE mastery_challenge_progress SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_mementos_updatedAt
AFTER UPDATE ON mementos
BEGIN
  UPDATE mementos SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_shop_items_updatedAt
AFTER UPDATE ON shop_items
BEGIN
  UPDATE shop_items SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_organizations_updatedAt
AFTER UPDATE ON organizations
BEGIN
  UPDATE organizations SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_white_label_configs_updatedAt
AFTER UPDATE ON white_label_configs
BEGIN
  UPDATE white_label_configs SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_api_keys_updatedAt
AFTER UPDATE ON api_keys
BEGIN
  UPDATE api_keys SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_quest_packs_updatedAt
AFTER UPDATE ON quest_packs
BEGIN
  UPDATE quest_packs SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_subscriptions_updatedAt
AFTER UPDATE ON subscriptions
BEGIN
  UPDATE subscriptions SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_payments_updatedAt
AFTER UPDATE ON payments
BEGIN
  UPDATE payments SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_user_settings_updatedAt
AFTER UPDATE ON user_settings
BEGIN
  UPDATE user_settings SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_organizations_updatedAt
AFTER UPDATE ON organizations
BEGIN
  UPDATE organizations SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_raids_updatedAt
AFTER UPDATE ON raids
BEGIN
  UPDATE raids SET updatedAt = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to maintain guild member count
CREATE TRIGGER IF NOT EXISTS update_guild_member_count_insert
AFTER INSERT ON social_stats
WHEN NEW.guildId IS NOT NULL
BEGIN
  UPDATE guilds SET memberCount = memberCount + 1 WHERE id = NEW.guildId;
END;

CREATE TRIGGER IF NOT EXISTS update_guild_member_count_delete
AFTER DELETE ON social_stats
WHEN OLD.guildId IS NOT NULL
BEGIN
  UPDATE guilds SET memberCount = memberCount - 1 WHERE id = OLD.guildId;
END;

CREATE TRIGGER IF NOT EXISTS update_guild_member_count_update
AFTER UPDATE OF guildId ON social_stats
BEGIN
  IF OLD.guildId IS NOT NULL AND NEW.guildId IS NULL THEN
    UPDATE guilds SET memberCount = memberCount - 1 WHERE id = OLD.guildId;
  ELSEIF OLD.guildId IS NULL AND NEW.guildId IS NOT NULL THEN
    UPDATE guilds SET memberCount = memberCount + 1 WHERE id = NEW.guildId;
  ELSEIF OLD.guildId IS NOT NULL AND NEW.guildId IS NOT NULL AND OLD.guildId != NEW.guildId THEN
    UPDATE guilds SET memberCount = memberCount - 1 WHERE id = OLD.guildId;
    UPDATE guilds SET memberCount = memberCount + 1 WHERE id = NEW.guildId;
  END IF;
END;

-- Trigger to maintain organization member count
CREATE TRIGGER IF NOT EXISTS update_organization_member_count_insert
AFTER INSERT ON users
WHEN NEW.organizationId IS NOT NULL
BEGIN
  UPDATE organizations SET memberCount = memberCount + 1 WHERE id = NEW.organizationId;
END;

CREATE TRIGGER IF NOT EXISTS update_organization_member_count_delete
AFTER DELETE ON users
WHEN OLD.organizationId IS NOT NULL
BEGIN
  UPDATE organizations SET memberCount = memberCount - 1 WHERE id = OLD.organizationId;
END;

CREATE TRIGGER IF NOT EXISTS update_organization_member_count_update
AFTER UPDATE OF organizationId ON users
BEGIN
  IF OLD.organizationId IS NOT NULL AND NEW.organizationId IS NULL THEN
    UPDATE organizations SET memberCount = memberCount - 1 WHERE id = OLD.organizationId;
  ELSEIF OLD.organizationId IS NULL AND NEW.organizationId IS NOT NULL THEN
    UPDATE organizations SET memberCount = memberCount + 1 WHERE id = NEW.organizationId;
  ELSEIF OLD.organizationId IS NOT NULL AND NEW.organizationId IS NOT NULL AND OLD.organizationId != NEW.organizationId THEN
    UPDATE organizations SET memberCount = memberCount - 1 WHERE id = OLD.organizationId;
    UPDATE organizations SET memberCount = memberCount + 1 WHERE id = NEW.organizationId;
  END IF;
END;

-- Trigger to maintain quest pack download count
CREATE TRIGGER IF NOT EXISTS increment_quest_pack_download_count
AFTER INSERT INTO quest_pack_purchases
BEGIN
  UPDATE quest_packs SET downloadCount = downloadCount + 1 WHERE id = NEW.questPackId;
END;

-- Trigger to maintain raid participant last active time
CREATE TRIGGER IF NOT EXISTS update_raid_participant_last_active
AFTER UPDATE ON raid_participants
BEGIN
  UPDATE raid_participants SET lastActiveAt = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to set completedAt when quest status changes to COMPLETED
CREATE TRIGGER IF NOT EXISTS set_quest_completed_at
AFTER UPDATE OF status ON quests
WHEN NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED'
BEGIN
  UPDATE quests SET completedAt = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to set completedAt when milestone progress changes to completed
CREATE TRIGGER IF NOT EXISTS set_milestone_completed_at
AFTER UPDATE OF completed ON milestone_progress
WHEN NEW.completed = 1 AND OLD.completed = 0
BEGIN
  UPDATE milestone_progress SET completedAt = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to set completedAt when mastery challenge progress changes to completed
CREATE TRIGGER IF NOT EXISTS set_mastery_challenge_completed_at
AFTER UPDATE OF completed ON mastery_challenge_progress
WHEN NEW.completed = 1 AND OLD.completed = 0
BEGIN
  UPDATE mastery_challenge_progress SET completedAt = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to maintain API key revoked timestamp
CREATE TRIGGER IF NOT EXISTS set_api_key_revoked_at
AFTER UPDATE OF revoked ON api_keys
WHEN NEW.revoked = 1 AND OLD.revoked = 0
BEGIN
  UPDATE api_keys SET revokedAt = datetime('now') WHERE id = NEW.id;
END;

-- Prevent deletion of users with active subscriptions
CREATE TRIGGER IF NOT EXISTS prevent_delete_user_with_active_subscription
BEFORE DELETE ON users
BEGIN
  SELECT CASE(
    EXISTS(SELECT 1 FROM subscriptions WHERE userId = OLD.id AND status = 'ACTIVE')
  ) WHEN 1 THEN RAISE(ABORT, 'Cannot delete user with active subscription')
  END;
END;

-- Prevent deletion of shop items that are in user inventory
CREATE TRIGGER IF NOT EXISTS prevent_delete_shop_item_with_inventory
BEFORE DELETE ON shop_items
BEGIN
  SELECT CASE(
    EXISTS(SELECT 1 FROM user_inventory WHERE itemId = OLD.id)
  ) WHEN 1 THEN RAISE(ABORT, 'Cannot delete shop item that is in user inventory')
  END;
END;

-- Prevent deletion of guilds with active raids
CREATE TRIGGER IF NOT EXISTS prevent_delete_guild_with_active_raids
BEFORE DELETE ON guilds
BEGIN
  SELECT CASE(
    EXISTS(SELECT 1 FROM raids WHERE guildId = OLD.id AND status = 'ACTIVE')
  ) WHEN 1 THEN RAISE(ABORT, 'Cannot delete guild with active raids')
  END;
END;