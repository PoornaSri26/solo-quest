# Data Model

Reference for `server/prisma/schema.prisma`. Every model maps to a **snake_case** table via `@@map` (portable across SQLite/Postgres, ADR-001). This file is generated from the schema — if it drifts, regenerate.

## Identity & core

| Model | Table | Purpose |
|---|---|---|
| `User` | `users` | Accounts. `role` (`SUPERADMIN`/`USER`) powers RBAC; `deletedAt` marks soft-deleted (PII-anonymized) accounts. |
| `HunterStats` | `hunter_stats` | Level, XP, gold, rank, stats, streak, streak wards, class. |
| `UserSettings` | `user_settings` | Simple mode, penalty severity, notifications, `avatarConfig` (JSON slots), feedback intensity. |
| `Notification` | `notifications` | In-app notification feed. |

## Quests & challenges

| Model | Table | Purpose |
|---|---|---|
| `Quest` | `quests` | Core task: rank, category, deadline, status, reflection. |
| `QuestSubtask` | `quest_subtasks` | Checklist items under a quest. |
| `QuestDecision` | `quest_decisions` | Narrative choice log (flavor/story mode). |
| `Gate` | `gates` | Larger goals/projects containing quests. |
| `DailyDungeon` / `DungeonTask` / `DungeonLog` | `daily_dungeons` / `dungeon_tasks` / `dungeon_logs` | Daily checklist and its run history. |
| `Milestone` / `MilestoneProgress` | `milestones` / `milestone_progress` | Long-horizon goals and per-user progress. |
| `MasteryChallenge` / `MasteryChallengeProgress` | `mastery_challenges` / `mastery_challenge_progress` | Repeatable mastery tracks. |
| `Memento` / `UserMemento` | `mementos` / `user_mementos` | Unlockable keepsakes. |

## Social & guilds

| Model | Table | Purpose |
|---|---|---|
| `SocialStats` | `social_stats` | Aggregated social counters per user. |
| `Guild` | `guilds` | Guilds (schema ready; mechanics on roadmap #96–107). |
| `Raid` / `RaidParticipant` | `raids` / `raid_participants` | Shared boss fights. |
| `KnowledgeProgress` | `knowledge_progress` | Knowledge/lore compendium progress. |

## Shop & monetization

| Model | Table | Purpose |
|---|---|---|
| `ShopItem` | `shop_items` | Purchasable items. |
| `UserInventory` | `user_inventory` | Owned items; `@@unique([userId, itemId])` guards duplicate purchases at the DB level. |
| `Subscription` | `subscriptions` | Plan, status, period end (free/hunter_pass/guild/enterprise). |
| `Payment` | `payments` | Payment records tied to Stripe. |
| `Organization` / `ApiKey` / `WhiteLabelConfig` | `organizations` / `api_keys` / `white_label_configs` | Enterprise tier: white-label branding, API access. |
| `QuestPack` / `QuestPackPurchase` | `quest_packs` / `quest_pack_purchases` | Marketplace quest packs. |

## Economy integrity

| Model | Table | Purpose |
|---|---|---|
| `EconomyLedger` | `economy_ledger` | Append-only gold/XP mutation log. |
| `RewardConfig` | `reward_config` | Versioned rank → reward values (DB-backed balance tuning). |
| `ReconciliationState` | `reconciliation_state` | Cursor/state for ledger reconciliation runs. |

## Platform & analytics

| Model | Table | Purpose |
|---|---|---|
| `ResourceUsage` | `resource_usages` | Feature usage counters. |
| `PushToken` | `push_tokens` | Mobile push registration (Capacitor). |
| `AnalyticsEvent` | `analytics_events` | Product analytics event stream. |
| `OnboardingProgress` | `onboarding_progress` | Step-by-step onboarding state. |
| `RetentionMetrics` | `retention_metrics` | D1/D7/D30 cohort rollups. |

## Conventions

- **Soft deletes:** `User.deletedAt` flags anonymized accounts; queries must filter deleted users (login and `/api/hunter/me` already do).
- **Money & XP:** never adjust gold/XP directly — go through the ledger-writing helpers in `server/src/economy.ts` so reconciliation stays valid.
- **Ownership:** user-scoped rows carry `userId` with `onDelete: Cascade` from `User`.
