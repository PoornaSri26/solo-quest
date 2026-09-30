# Bug Triage Process

How bugs flow from report to fix. Keep it lightweight — this is a solo-maintainer process with room for contributors.

## Severity levels

| Level | Definition | Response target |
|---|---|---|
| **S1 Critical** | Data loss, security hole, money/XPCORRUPTION, server down | Start same day; drop everything |
| **S2 Major** | Core flow broken (can't complete quests, login broken) with workaround absent or painful | Within 2 days |
| **S3 Minor** | Feature broken with an easy workaround, visual glitches | Within a week |
| **S4 Trivial** | Cosmetics, copy typos | Opportunistic |

## Flow

1. **Report** — GitHub issue using the bug template; security issues go to SECURITY.md email instead, never public issues.
2. **Triage** (maintainer, ~2×/week): assign severity, reproduce, label area (`server`, `frontend`, `infra`), and either schedule it or close as `wontfix`/`duplicate` with a comment explaining why.
3. **Fix** — PR references the issue (`Fixes #N`), includes a regression test when feasible (the repo's convention: middleware ordering, idempotency, and CSRF 403s all have regression tests).
4. **Verify & close** — CI green (build + tests + coverage gate + security scan); note user-facing fixes in CHANGELOG.md under Unreleased.

## Labels

- `severity/S1` … `severity/S4`
- `area/server`, `area/frontend`, `area/ios`, `area/android`, `area/infra`
- `good first issue` — well-scoped, tests exist nearby to imitate
- `regression` — broke something that previously worked (prioritize these)

## Weekly sweep

Every week (or before a release): scan open S2+ issues, re-triage stale ones (no activity 30 days → ping reporter or close), and check `server/logs/exceptions.log` patterns against open issues — recurring exception signatures get an issue even without a user report.
