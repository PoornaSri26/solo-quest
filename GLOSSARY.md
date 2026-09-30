# Glossary

Domain vocabulary for Solo Quest. Use these terms consistently in code, docs, and PRs.

## Hunter & progression

| Term | Meaning |
|---|---|
| **Hunter** | A user. Backed by `User` + `HunterStats`. |
| **Rank** | Letter grade E → S measuring overall standing. Higher ranks pay more XP/gold and unlock cosmetics. |
| **Level / XP** | Experience points from quest completion; leveling raises hunter level. Reward amounts come from the DB-backed reward table (`RewardConfig`, see `server/src/economy.ts`). |
| **Gold** | Soft currency earned from quests and dungeons; spent in the shop and on streak wards. Every grant/deduction is written to `EconomyLedger`. |
| **Class / Archetype** | Hunter build chosen at onboarding (Warrior, Mage, Scholar, Assassin, Ranger). Determines stat growth weights and cosmetic presets. |
| **Stats** | Strength, Agility, Intelligence, Endurance, Luck — grown by quest category (`categoryToStat`). |
| **Streak** | Consecutive days with a completed quest. **Streak Ward** is purchasable insurance (75g, max 3) consumed automatically on a failed day. |

## Quests & challenges

| Term | Meaning |
|---|---|
| **Quest** | A single task with a rank (E–S), category, and optional deadline. |
| **Gate** | A larger goal/project containing quests (the "dungeon entrance" metaphor). Max concurrent gates is an entitlement. |
| **Daily Dungeon** | Recurring daily checklist of `DungeonTask`s; clearing it pays a bonus. |
| **Shadow Realm** | Redemption space for failed quests — constructive framing (repair the failure), never pure punishment. |
| **Raid** | A guild-wide boss fight with shared HP (schema exists; social features are on the roadmap). |
| **Combo multiplier** | Same-day consecutive completions scale rewards up to 1.5× (`calculateComboMultiplier`). |
| **Speedrun bonus** | Completing well ahead of deadline pays up to +25% (`calculateSpeedrunBonus`). |
| **Snooze** | Postpone instead of binary complete/fail; max 3 per quest. |
| **Milestone / Mastery Challenge / Memento** | Long-horizon goal with progress tracking; unlockable keepsake reward. |

## Monetization & entitlements

| Term | Meaning |
|---|---|
| **Entitlement** | Feature limits derived from subscription plan (`server/src/entitlements.ts`): free < hunter_pass < guild < enterprise. |
| **Hunter Pass** | Mid-tier subscription (advanced analytics, unlimited quests). |
| **White-label** | Enterprise tier capability — custom branding via `WhiteLabelConfig` / `Organization`. |

## Infrastructure

| Term | Meaning |
|---|---|
| **Reward table** | DB-backed (auditable) rank → XP/gold mapping; falls back to in-code defaults if DB is unavailable. |
| **Economy ledger** | Append-only record of every gold/XP mutation for audit and reconciliation. |
| **Reconciliation** | `server/src/reconciliation.ts` recomputes balances from the ledger to detect drift. |
| **Rate limiter** | Redis-backed token bucket per endpoint class with in-memory fallback (`server/src/rateLimiter.ts`). |
| **Origin allowlist** | `ALLOWED_ORIGINS` env var — single source of truth for CORS, CSP connect-src, and CSRF (ADR-003). |
| **Idempotency key** | Client-supplied key making reward-granting POSTs safe to retry (`server/src/economy.ts`). |
| **Soft delete** | Accounts are anonymized and flagged with `deletedAt` rather than hard-deleted (GDPR). |
