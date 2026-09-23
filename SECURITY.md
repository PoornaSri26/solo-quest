# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `main` branch | ✅ |

Solo Quest deploys from `main`; please always test against the latest commit.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Email **poornasri.n24@gmail.com** with:

1. A description of the issue and its impact.
2. Reproduction steps (or a proof-of-concept).
3. Affected endpoints/components, if known.

You'll receive an acknowledgment within **72 hours**, and a status update at least every **7 days** until resolution. We aim to remediate critical issues within **90 days** of confirmation, sooner when possible.

## Coordinated Disclosure

- Please give us a reasonable window (typically 90 days) to fix issues before public disclosure.
- We will credit reporters in release notes upon request.

## Scope

**In scope:**
- The API server (`server/`): auth, quests, economy, shop purchases, subscriptions/webhooks, guilds/raids.
- The web frontend (`src/`): XSS, CSRF, authorization bypasses.
- Deployment configurations (`Dockerfile`, `docker-compose.yml`, `k8s/`, `nginx.conf`).

**Out of scope:**
- Denial-of-service via volumetric attacks.
- Self-XSS or social-engineering of users.
- Missing security headers on third-party services.
- Reports from automated scanners without a working proof-of-concept.

## Security Features (for reviewers)

The server currently implements: bcrypt password hashing, JWT auth, CSRF origin validation, Redis-backed rate limiting with in-memory fallback, Helmet headers, Zod validation, server-side economy calculations, and structured logging. Relevant code lives in `server/src/csrf.ts`, `server/src/rateLimiter.ts`, `server/src/middleware.ts`, and `server/src/env.ts`.
