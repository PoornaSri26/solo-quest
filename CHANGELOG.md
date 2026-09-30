# Changelog

All notable changes to Solo Quest are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Quality-scaled boss strikes (#96): tiered completions record their quality on the quest (`PERFECT`/`GOOD`/`POOR`) and boss strikes scale accordingly (×1.5 / ×1 / ×0.5); standard completions stay at ×1.
- Guild boss kill-feed (#96): `GET /api/guilds/boss/history` returns past victories (tier, fighter count, top slayer, defeat date, newest first); the Social page boss card renders a "Past Victories" feed that refreshes live when a boss falls.
- Boss victory rewards (#96): defeating a shared boss pays every fighter flat gold scaled by tier (100g × tier), credited atomically inside the killing-blow transaction with `BOSS_VICTORY` ledger entries — the boss can never pay out twice.
- Live boss fight state (#96): `boss:updated` socket events feed a store-level `bossState`; the Social page boss card re-fetches HP and leaderboard in real time as any guild member lands strikes.
- Boss strikes are now automatic (#96): every verified quest completion lands a rank-scaled strike on the guild's active boss via the shared `attemptBossStrike` helper (the explicit `POST /api/guilds/boss/strike` endpoint remains for API/tests). Strike results arrive as a notification plus `boss:updated` socket event — no manual quest-ID input in the UI.
- Boss fight leaderboard (#96): `GET /api/guilds/boss/current` returns the top 10 damage dealers (display names resolved) and participant count; the Social page renders the ranked list with the leader crowned and your own row highlighted.
- Guild shared boss fights (#96): guilds summon a tiered rift boss (5 tiers, 1.5k–25k HP) that every member damages by striking with server-verified quest completions — each completion (≤7 days old, rank-scaled E=100…S=600 HP) is one strike, claimed atomically so it can never pay out twice. Live `boss:updated` WebSocket events for participants; new `isBoss`/`bossTier`/`bossStrikeUsed` schema fields with migrations.
- Hunter log heatmap (#30): GitHub-style 53-week grid of daily quest completions on the dashboard, with month labels, tooltips, current/best streaks, and a yearly total. Backed by `GET /api/hunter/activity-log` (day-bucketed `groupBy` over `completedAt`, hourly cache).
- Offline connection indicator (#421): a fixed banner shows while the realtime socket is disconnected or reconnecting, so users know stats/quest sync may be stale.

### Fixed
- Migration history repaired with a full-schema baseline (`20240101000000_baseline`): `prisma migrate deploy` now replays cleanly from an empty database, and the social/analytics tables missing from the old migration chain are captured. Existing dev databases were marked applied via `migrate resolve`.
- `MilestoneTracker` broken JSX (div closed after `</Card>`) from the UI-migration commit — component now compiles; `Card`/`Button` UI primitives accept standard HTML attributes (`onClick`, `role`, `aria-label`, …) which the migrated pages already pass.
- WebSocket handlers are no longer re-attached on repeated `connectWebSocket` calls (StrictMode double-mount and re-login no longer duplicate events); the existing socket's auth token is refreshed instead.
- Fixed `res.json` crash on raid endpoints: BigInt HP/progress columns (raids, guild totalExp) now serialize to strings via a `toJSON` patch, so `GET /api/guilds/:id/raids` and raid creation no longer throw "Do not know how to serialize a BigInt".

### Fixed
- `prisma db push` / `prisma migrate` now honor `DATABASE_URL` from `.env` instead of the hardcoded `file:./dev.db` in `schema.prisma`.

### Added
- Gameplay systems from the improvement report:
  - **Hunter classes/archetypes** (#24) — Warrior, Mage, Scholar, Assassin, Ranger; selectable during onboarding and via `POST /api/hunter/class`.
  - **Daily combo/momentum multiplier** (#4) — consecutive completions in a day scale rewards up to 1.5x.
  - **Randomized loot drops** (#13) — variable-ratio rewards with rarity tiers; full-screen loot payoff animation via `loot:dropped` WebSocket event.
  - **Speedrun bonus** (#34) — completing well ahead of a deadline pays up to +25%.
  - **Category-based stat growth** (#3) — quests now train Strength/Agility/Intelligence/Endurance/Luck by category.
  - **Energy/mood check-in + adaptive difficulty** (#2, #78) — self-reported 1–5 energy tunes suggested quest rank band.
  - **Quest of the Day** (#87) — deterministic daily curated quest to reduce decision fatigue.
  - **Quest snooze** (#73) — postpone instead of binary complete/fail (max 3x, extends deadline).
  - **Failure reflection prompts** (#66) — guided "why did this fail?" journaling on failed quests.
  - **Streak Ward purchase** (#21/#61) — buy streak insurance with gold (75g, max 3 held).
  - **Procedural flavor text** (#25) — deterministic per-quest flavor via `GET /api/quests/:id/flavor`.
- PWA support: web app manifest, app icons, install/meta tags, theme color (installable on desktop & Android, iOS home-screen support).
- GDPR data-ownership endpoints: `GET /api/account/export` (full JSON data export) and `DELETE /api/account` (soft-delete + PII anonymization), with in-app UI under Hunter Profile → Account & Data.
- Deleted-account protections: login and `/api/hunter/me` now reject accounts flagged as deleted.
- Security policy (`SECURITY.md`) with coordinated disclosure process.
- Privacy policy (`PRIVACY.md`) and Terms of Service (`TERMS_OF_SERVICE.md`).
- Contribution guidelines (`CONTRIBUTING.md`) and Code of Conduct.
- This changelog.

## [0.4.0] — White-label & Marketplace

### Added
- Corporate/coaching white-label tier with Organizations, white-label config, and API keys.
- Marketplace for quest packs (browse, publish, purchase).

## [0.3.0] — Social Layer

### Added
- Guilds: create, browse, join.
- Raids: create, join, participant tracking.
- Leaderboard and social stats endpoints.

## [0.2.0] — Mobile & Monetization

### Added
- Capacitor wrapper for iOS/Android builds (`MOBILE.md`).
- Stripe subscription infrastructure: plans, checkout, webhook, cancellation.
- Entitlements system with per-plan feature limits and streak-freeze tokens.
- Configurable failure penalties (forgiving / moderate / hardcore).
- Simple Mode onboarding for users who want less RPG complexity.
- Onboarding flow integrated with auth.
- Swagger/OpenAPI documentation at `/api-docs`.

### Fixed
- Auth page redirect to dashboard after successful login.
- Token-based redirect from landing page.

## [0.1.0] — Foundation

### Added
- Core quest system with ranks E–S, XP/gold economy, and server-side reward calculations.
- Daily dungeons with shift-based tasks and streak tracking.
- Gate raids (grouped quest challenges) and Shadow Realm (failed quest tracking).
- Shop with cosmetics/themes/power-ups and user inventory with equipping.
- Milestones, mastery challenges, mementos, knowledge progress systems.
- Real-time updates via WebSocket (stats, quests, notifications, level-ups).
- Auth with JWT, CSRF protection, Redis-backed rate limiting, structured logging.
- Docker Compose + Kubernetes deployment, nginx reverse proxy.
- Backend test suite (auth, quests, business logic).

[Unreleased]: https://github.com/PoornaSri26/solo-quest/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/PoornaSri26/solo-quest/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/PoornaSri26/solo-quest/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/PoornaSri26/solo-quest/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/PoornaSri26/solo-quest/releases/tag/v0.1.0
