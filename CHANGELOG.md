# Changelog

All notable changes to Solo Quest are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
