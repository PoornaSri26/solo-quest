-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hunterId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "organizationId" TEXT,
    CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "hunter_stats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "expToNext" INTEGER NOT NULL DEFAULT 100,
    "progressPercent" REAL NOT NULL DEFAULT 0,
    "rank" TEXT NOT NULL DEFAULT 'E',
    "hp" INTEGER NOT NULL DEFAULT 100,
    "hpMax" INTEGER NOT NULL DEFAULT 100,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "streakWards" INTEGER NOT NULL DEFAULT 1,
    "streakWagerActive" BOOLEAN NOT NULL DEFAULT false,
    "streakWagerGoal" INTEGER NOT NULL DEFAULT 0,
    "streakWagerStake" INTEGER NOT NULL DEFAULT 0,
    "streakWagerStart" DATETIME,
    "statStrength" INTEGER NOT NULL DEFAULT 0,
    "statAgility" INTEGER NOT NULL DEFAULT 0,
    "statIntelligence" INTEGER NOT NULL DEFAULT 0,
    "statEndurance" INTEGER NOT NULL DEFAULT 0,
    "statLuck" INTEGER NOT NULL DEFAULT 0,
    "hunterClass" TEXT NOT NULL DEFAULT 'NONE',
    "comboCount" INTEGER NOT NULL DEFAULT 0,
    "comboDate" DATETIME,
    "lastEnergyLevel" INTEGER,
    "lastMoodLevel" INTEGER,
    "lastCheckInAt" DATETIME,
    "lastActiveDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "hunter_stats_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rank" TEXT NOT NULL DEFAULT 'E',
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SHADOW',
    "deadline" DATETIME,
    "notes" TEXT,
    "fk_gate_id" TEXT,
    "isBossQuest" BOOLEAN NOT NULL DEFAULT false,
    "snoozedUntil" DATETIME,
    "snoozeCount" INTEGER NOT NULL DEFAULT 0,
    "reflection" TEXT,
    "lootDropped" TEXT,
    "expReward" INTEGER NOT NULL DEFAULT 0,
    "goldReward" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "quests_fk_gate_id_fkey" FOREIGN KEY ("fk_gate_id") REFERENCES "gates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quests_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quest_subtasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_quest_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quest_subtasks_fk_quest_id_fkey" FOREIGN KEY ("fk_quest_id") REFERENCES "quests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "gates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" TEXT NOT NULL DEFAULT 'E',
    "deadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "gates_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "daily_dungeons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shift" TEXT DEFAULT 'ALL_DAY',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "daily_dungeons_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dungeon_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_dungeon_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rank" TEXT NOT NULL DEFAULT 'E',
    "position" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "dungeon_tasks_fk_dungeon_id_fkey" FOREIGN KEY ("fk_dungeon_id") REFERENCES "daily_dungeons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dungeon_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_dungeon_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedCount" INTEGER NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "cleared" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dungeon_logs_fk_dungeon_id_fkey" FOREIGN KEY ("fk_dungeon_id") REFERENCES "daily_dungeons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "notifications_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shop_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "costGold" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "fk_item_id" TEXT NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "acquiredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_inventory_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_inventory_fk_item_id_fkey" FOREIGN KEY ("fk_item_id") REFERENCES "shop_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "goldReward" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "fk_memento_id" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "milestones_fk_memento_id_fkey" FOREIGN KEY ("fk_memento_id") REFERENCES "mementos" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "milestone_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "fk_milestone_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "milestone_progress_fk_milestone_id_fkey" FOREIGN KEY ("fk_milestone_id") REFERENCES "milestones" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "milestone_progress_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "hunter_stats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mastery_challenges" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "goldReward" INTEGER NOT NULL DEFAULT 0,
    "difficulty" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "mastery_challenge_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "fk_challenge_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER,
    "startedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "mastery_challenge_progress_fk_challenge_id_fkey" FOREIGN KEY ("fk_challenge_id") REFERENCES "mastery_challenges" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mastery_challenge_progress_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "hunter_stats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mementos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_mementos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "fk_memento_id" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_mementos_fk_memento_id_fkey" FOREIGN KEY ("fk_memento_id") REFERENCES "mementos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_mementos_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "hunter_stats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quest_decisions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "fk_quest_id" TEXT NOT NULL,
    "decisionType" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quest_decisions_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quest_decisions_fk_quest_id_fkey" FOREIGN KEY ("fk_quest_id") REFERENCES "quests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "resource_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resource_usage_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "knowledge_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "questPatternsLearned" INTEGER NOT NULL DEFAULT 0,
    "optimalRoutesDiscovered" INTEGER NOT NULL DEFAULT 0,
    "shortcutsUnlocked" INTEGER NOT NULL DEFAULT 0,
    "efficiencyRating" REAL NOT NULL DEFAULT 0.0,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_progress_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "social_stats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "friendsAdded" INTEGER NOT NULL DEFAULT 0,
    "questsShared" INTEGER NOT NULL DEFAULT 0,
    "achievementsShared" INTEGER NOT NULL DEFAULT 0,
    "leaderboardRank" INTEGER,
    "socialScore" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guildId" TEXT,
    "guildRole" TEXT,
    CONSTRAINT "social_stats_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "social_stats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "guilds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "totalExp" BIGINT NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "raids" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_guild_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetExp" BIGINT NOT NULL DEFAULT 0,
    "progressExp" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "fk_user_id" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "raids_fk_guild_id_fkey" FOREIGN KEY ("fk_guild_id") REFERENCES "guilds" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "raid_participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_raid_id" TEXT NOT NULL,
    "fk_user_id" TEXT NOT NULL,
    "expContributed" BIGINT NOT NULL DEFAULT 0,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "raid_participants_fk_raid_id_fkey" FOREIGN KEY ("fk_raid_id") REFERENCES "raids" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "raid_participants_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "white_label_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_organization_id" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "themeColors" TEXT,
    "customDomain" TEXT,
    "customEmail" TEXT,
    "features" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "white_label_configs_fk_organization_id_fkey" FOREIGN KEY ("fk_organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "plan" TEXT NOT NULL DEFAULT 'enterprise',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fk_organization_id" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "lastUsed" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" DATETIME,
    CONSTRAINT "api_keys_fk_organization_id_fkey" FOREIGN KEY ("fk_organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quest_packs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_creator_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'gold',
    "questTemplates" TEXT NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "rating" REAL NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quest_packs_fk_creator_id_fkey" FOREIGN KEY ("fk_creator_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quest_pack_purchases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_quest_pack_id" TEXT NOT NULL,
    "fk_user_id" TEXT NOT NULL,
    "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quest_pack_purchases_fk_quest_pack_id_fkey" FOREIGN KEY ("fk_quest_pack_id") REFERENCES "quest_packs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quest_pack_purchases_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" DATETIME,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "subscriptions_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL DEFAULT 'STRIPE',
    "paymentIntentId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "simpleMode" BOOLEAN NOT NULL DEFAULT false,
    "penaltySeverity" TEXT NOT NULL DEFAULT 'forgiving',
    "notificationPreference" TEXT NOT NULL DEFAULT 'adaptive',
    "timezone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "avatarConfig" TEXT,
    "storyProgress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_settings_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "economy_ledger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "xpDelta" INTEGER NOT NULL DEFAULT 0,
    "goldDelta" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "rewardTableVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "economy_ledger_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reward_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT
);

-- CreateTable
CREATE TABLE "reconciliation_state" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usersChecked" INTEGER NOT NULL,
    "usersWithDrift" INTEGER NOT NULL,
    "maxDriftXp" INTEGER NOT NULL,
    "maxDriftGold" INTEGER NOT NULL,
    "details" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "push_tokens_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" TEXT,
    "sessionId" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_events_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "onboarding_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "currentStep" TEXT NOT NULL,
    "completedSteps" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "onboarding_progress_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "retention_metrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fk_user_id" TEXT NOT NULL,
    "day1Active" BOOLEAN NOT NULL DEFAULT false,
    "day7Active" BOOLEAN NOT NULL DEFAULT false,
    "day30Active" BOOLEAN NOT NULL DEFAULT false,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "avgSessionDuration" REAL NOT NULL,
    CONSTRAINT "retention_metrics_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_hunterId_key" ON "users"("hunterId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "hunter_stats_fk_user_id_key" ON "hunter_stats"("fk_user_id");

-- CreateIndex
CREATE INDEX "hunter_stats_fk_user_id_idx" ON "hunter_stats"("fk_user_id");

-- CreateIndex
CREATE INDEX "hunter_stats_rank_idx" ON "hunter_stats"("rank");

-- CreateIndex
CREATE INDEX "hunter_stats_level_idx" ON "hunter_stats"("level");

-- CreateIndex
CREATE INDEX "hunter_stats_streak_idx" ON "hunter_stats"("streak");

-- CreateIndex
CREATE INDEX "quests_fk_user_id_status_idx" ON "quests"("fk_user_id", "status");

-- CreateIndex
CREATE INDEX "quests_fk_user_id_fk_gate_id_idx" ON "quests"("fk_user_id", "fk_gate_id");

-- CreateIndex
CREATE INDEX "quests_fk_user_id_completedAt_idx" ON "quests"("fk_user_id", "completedAt");

-- CreateIndex
CREATE INDEX "quests_fk_user_id_deadline_idx" ON "quests"("fk_user_id", "deadline");

-- CreateIndex
CREATE INDEX "quests_status_deadline_idx" ON "quests"("status", "deadline");

-- CreateIndex
CREATE INDEX "quests_deletedAt_idx" ON "quests"("deletedAt");

-- CreateIndex
CREATE INDEX "quest_subtasks_fk_quest_id_idx" ON "quest_subtasks"("fk_quest_id");

-- CreateIndex
CREATE INDEX "quest_subtasks_position_idx" ON "quest_subtasks"("position");

-- CreateIndex
CREATE INDEX "gates_fk_user_id_status_idx" ON "gates"("fk_user_id", "status");

-- CreateIndex
CREATE INDEX "gates_fk_user_id_createdAt_idx" ON "gates"("fk_user_id", "createdAt");

-- CreateIndex
CREATE INDEX "gates_deadline_idx" ON "gates"("deadline");

-- CreateIndex
CREATE INDEX "gates_deletedAt_idx" ON "gates"("deletedAt");

-- CreateIndex
CREATE INDEX "daily_dungeons_fk_user_id_date_idx" ON "daily_dungeons"("fk_user_id", "date");

-- CreateIndex
CREATE INDEX "daily_dungeons_active_idx" ON "daily_dungeons"("active");

-- CreateIndex
CREATE INDEX "dungeon_tasks_fk_dungeon_id_idx" ON "dungeon_tasks"("fk_dungeon_id");

-- CreateIndex
CREATE INDEX "dungeon_tasks_position_idx" ON "dungeon_tasks"("position");

-- CreateIndex
CREATE INDEX "dungeon_logs_fk_dungeon_id_date_idx" ON "dungeon_logs"("fk_dungeon_id", "date");

-- CreateIndex
CREATE INDEX "notifications_fk_user_id_read_idx" ON "notifications"("fk_user_id", "read");

-- CreateIndex
CREATE INDEX "notifications_fk_user_id_createdAt_idx" ON "notifications"("fk_user_id", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_expiresAt_idx" ON "notifications"("expiresAt");

-- CreateIndex
CREATE INDEX "shop_items_category_idx" ON "shop_items"("category");

-- CreateIndex
CREATE INDEX "shop_items_isActive_idx" ON "shop_items"("isActive");

-- CreateIndex
CREATE INDEX "user_inventory_fk_user_id_idx" ON "user_inventory"("fk_user_id");

-- CreateIndex
CREATE INDEX "user_inventory_fk_item_id_idx" ON "user_inventory"("fk_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_inventory_fk_user_id_fk_item_id_key" ON "user_inventory"("fk_user_id", "fk_item_id");

-- CreateIndex
CREATE INDEX "milestones_isActive_idx" ON "milestones"("isActive");

-- CreateIndex
CREATE INDEX "milestones_category_idx" ON "milestones"("category");

-- CreateIndex
CREATE INDEX "milestone_progress_fk_user_id_idx" ON "milestone_progress"("fk_user_id");

-- CreateIndex
CREATE INDEX "milestone_progress_fk_milestone_id_idx" ON "milestone_progress"("fk_milestone_id");

-- CreateIndex
CREATE INDEX "milestone_progress_completed_idx" ON "milestone_progress"("completed");

-- CreateIndex
CREATE UNIQUE INDEX "milestone_progress_fk_user_id_fk_milestone_id_key" ON "milestone_progress"("fk_user_id", "fk_milestone_id");

-- CreateIndex
CREATE INDEX "mastery_challenges_difficulty_idx" ON "mastery_challenges"("difficulty");

-- CreateIndex
CREATE INDEX "mastery_challenges_isActive_idx" ON "mastery_challenges"("isActive");

-- CreateIndex
CREATE INDEX "mastery_challenge_progress_fk_user_id_idx" ON "mastery_challenge_progress"("fk_user_id");

-- CreateIndex
CREATE INDEX "mastery_challenge_progress_fk_challenge_id_idx" ON "mastery_challenge_progress"("fk_challenge_id");

-- CreateIndex
CREATE INDEX "mastery_challenge_progress_completed_idx" ON "mastery_challenge_progress"("completed");

-- CreateIndex
CREATE UNIQUE INDEX "mastery_challenge_progress_fk_user_id_fk_challenge_id_key" ON "mastery_challenge_progress"("fk_user_id", "fk_challenge_id");

-- CreateIndex
CREATE INDEX "mementos_rarity_idx" ON "mementos"("rarity");

-- CreateIndex
CREATE INDEX "mementos_category_idx" ON "mementos"("category");

-- CreateIndex
CREATE INDEX "mementos_isActive_idx" ON "mementos"("isActive");

-- CreateIndex
CREATE INDEX "user_mementos_fk_user_id_idx" ON "user_mementos"("fk_user_id");

-- CreateIndex
CREATE INDEX "user_mementos_fk_memento_id_idx" ON "user_mementos"("fk_memento_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_mementos_fk_user_id_fk_memento_id_key" ON "user_mementos"("fk_user_id", "fk_memento_id");

-- CreateIndex
CREATE INDEX "quest_decisions_fk_user_id_timestamp_idx" ON "quest_decisions"("fk_user_id", "timestamp");

-- CreateIndex
CREATE INDEX "quest_decisions_fk_quest_id_timestamp_idx" ON "quest_decisions"("fk_quest_id", "timestamp");

-- CreateIndex
CREATE INDEX "quest_decisions_decisionType_idx" ON "quest_decisions"("decisionType");

-- CreateIndex
CREATE INDEX "resource_usage_fk_user_id_resourceType_timestamp_idx" ON "resource_usage"("fk_user_id", "resourceType", "timestamp");

-- CreateIndex
CREATE INDEX "resource_usage_fk_user_id_timestamp_idx" ON "resource_usage"("fk_user_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_progress_fk_user_id_key" ON "knowledge_progress"("fk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_stats_fk_user_id_key" ON "social_stats"("fk_user_id");

-- CreateIndex
CREATE INDEX "social_stats_guildId_idx" ON "social_stats"("guildId");

-- CreateIndex
CREATE INDEX "social_stats_leaderboardRank_idx" ON "social_stats"("leaderboardRank");

-- CreateIndex
CREATE UNIQUE INDEX "guilds_name_key" ON "guilds"("name");

-- CreateIndex
CREATE UNIQUE INDEX "guilds_slug_key" ON "guilds"("slug");

-- CreateIndex
CREATE INDEX "guilds_name_idx" ON "guilds"("name");

-- CreateIndex
CREATE INDEX "guilds_slug_idx" ON "guilds"("slug");

-- CreateIndex
CREATE INDEX "guilds_isActive_idx" ON "guilds"("isActive");

-- CreateIndex
CREATE INDEX "raids_fk_guild_id_idx" ON "raids"("fk_guild_id");

-- CreateIndex
CREATE INDEX "raids_status_idx" ON "raids"("status");

-- CreateIndex
CREATE INDEX "raids_fk_user_id_idx" ON "raids"("fk_user_id");

-- CreateIndex
CREATE INDEX "raids_startDate_idx" ON "raids"("startDate");

-- CreateIndex
CREATE INDEX "raid_participants_fk_raid_id_idx" ON "raid_participants"("fk_raid_id");

-- CreateIndex
CREATE INDEX "raid_participants_fk_user_id_idx" ON "raid_participants"("fk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "raid_participants_fk_raid_id_fk_user_id_key" ON "raid_participants"("fk_raid_id", "fk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "white_label_configs_fk_organization_id_key" ON "white_label_configs"("fk_organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "white_label_configs_customDomain_key" ON "white_label_configs"("customDomain");

-- CreateIndex
CREATE INDEX "white_label_configs_fk_organization_id_idx" ON "white_label_configs"("fk_organization_id");

-- CreateIndex
CREATE INDEX "white_label_configs_customDomain_idx" ON "white_label_configs"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_isActive_idx" ON "organizations"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_fk_organization_id_idx" ON "api_keys"("fk_organization_id");

-- CreateIndex
CREATE INDEX "api_keys_key_idx" ON "api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_revoked_idx" ON "api_keys"("revoked");

-- CreateIndex
CREATE INDEX "quest_packs_fk_creator_id_idx" ON "quest_packs"("fk_creator_id");

-- CreateIndex
CREATE INDEX "quest_packs_category_idx" ON "quest_packs"("category");

-- CreateIndex
CREATE INDEX "quest_packs_isApproved_idx" ON "quest_packs"("isApproved");

-- CreateIndex
CREATE INDEX "quest_packs_isActive_idx" ON "quest_packs"("isActive");

-- CreateIndex
CREATE INDEX "quest_pack_purchases_fk_user_id_idx" ON "quest_pack_purchases"("fk_user_id");

-- CreateIndex
CREATE INDEX "quest_pack_purchases_fk_quest_pack_id_idx" ON "quest_pack_purchases"("fk_quest_pack_id");

-- CreateIndex
CREATE UNIQUE INDEX "quest_pack_purchases_fk_quest_pack_id_fk_user_id_key" ON "quest_pack_purchases"("fk_quest_pack_id", "fk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_fk_user_id_key" ON "subscriptions"("fk_user_id");

-- CreateIndex
CREATE INDEX "subscriptions_fk_user_id_idx" ON "subscriptions"("fk_user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_plan_idx" ON "subscriptions"("plan");

-- CreateIndex
CREATE INDEX "payments_fk_user_id_idx" ON "payments"("fk_user_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "payments_paymentMethod_idx" ON "payments"("paymentMethod");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_fk_user_id_key" ON "user_settings"("fk_user_id");

-- CreateIndex
CREATE INDEX "user_settings_fk_user_id_idx" ON "user_settings"("fk_user_id");

-- CreateIndex
CREATE INDEX "economy_ledger_fk_user_id_createdAt_idx" ON "economy_ledger"("fk_user_id", "createdAt");

-- CreateIndex
CREATE INDEX "economy_ledger_reason_idx" ON "economy_ledger"("reason");

-- CreateIndex
CREATE INDEX "economy_ledger_referenceType_referenceId_idx" ON "economy_ledger"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "reward_configs_key_key" ON "reward_configs"("key");

-- CreateIndex
CREATE INDEX "reconciliation_state_runAt_idx" ON "reconciliation_state"("runAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_fk_user_id_idx" ON "push_tokens"("fk_user_id");

-- CreateIndex
CREATE INDEX "push_tokens_platform_idx" ON "push_tokens"("platform");

-- CreateIndex
CREATE INDEX "push_tokens_isActive_idx" ON "push_tokens"("isActive");

-- CreateIndex
CREATE INDEX "analytics_events_fk_user_id_timestamp_idx" ON "analytics_events"("fk_user_id", "timestamp");

-- CreateIndex
CREATE INDEX "analytics_events_eventType_timestamp_idx" ON "analytics_events"("eventType", "timestamp");

-- CreateIndex
CREATE INDEX "analytics_events_sessionId_idx" ON "analytics_events"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_progress_fk_user_id_key" ON "onboarding_progress"("fk_user_id");

-- CreateIndex
CREATE INDEX "onboarding_progress_currentStep_idx" ON "onboarding_progress"("currentStep");

-- CreateIndex
CREATE INDEX "onboarding_progress_completedAt_idx" ON "onboarding_progress"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "retention_metrics_fk_user_id_key" ON "retention_metrics"("fk_user_id");

-- CreateIndex
CREATE INDEX "retention_metrics_fk_user_id_idx" ON "retention_metrics"("fk_user_id");

-- CreateIndex
CREATE INDEX "retention_metrics_day1Active_idx" ON "retention_metrics"("day1Active");

-- CreateIndex
CREATE INDEX "retention_metrics_day7Active_idx" ON "retention_metrics"("day7Active");

-- CreateIndex
CREATE INDEX "retention_metrics_day30Active_idx" ON "retention_metrics"("day30Active");

