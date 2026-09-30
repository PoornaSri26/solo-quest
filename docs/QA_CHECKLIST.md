# Manual QA Checklist

Run before each release or significant deploy. Many items are guarded by automated tests (marked ✅ when covered); the rest are quick manual passes.

## Auth & accounts
- [ ] Register → login → logout round-trip (✅ auth.test.ts)
- [ ] Login rejected for soft-deleted accounts (✅ covered in gdpr.test.ts)
- [ ] Password too short / email malformed rejected with clear errors
- [ ] JWT expired → 401, frontend redirects to auth

## Quests & economy
- [ ] Create quest → complete → XP/gold granted and visible in ledger (✅ economy tests)
- [ ] Double-click "complete" does not double-grant (idempotency — ✅ covered)
- [ ] Snooze (max 3), fail with reflection, streak ward consumption on failure
- [ ] Shop purchase → inventory contains item; second purchase of unique item blocked at DB level (✅ covered)
- [ ] Daily dungeon reset boundary (run before and after local midnight)

## Subscription tiers
- [ ] Free tier hit: gate/quest caps enforced with upgrade prompt (✅ entitlements.test.ts)
- [ ] Stripe unconfigured → endpoints degrade gracefully, server boots (ADR-002)
- [ ] Webhook without valid signature → rejected

## Security smoke
- [ ] Unknown route returns JSON 404, not HTML (✅ middleware.test.ts)
- [ ] POST from disallowed Origin → 403 Invalid origin (✅ csrf.test.ts)
- [ ] Rate limit: 6th rapid login attempt → 429
- [ ] Admin API as normal user → "Superadmin access required"
- [ ] Security headers present (`curl -I` → CSP, X-Frame-Options, HSTS behind TLS)

## Data & compliance
- [ ] `GET /api/account/export` returns complete JSON attachment (✅ gdpr.test.ts)
- [ ] `DELETE /api/account` anonymizes PII; login afterwards rejected (✅ gdpr.test.ts)
- [ ] No email/token in server logs after the above (redaction — ✅ logger.test.ts)

## Cross-cutting
- [ ] `npm run build` (frontend) clean
- [ ] `npm run build` + full test suite (server) clean, coverage gate green
- [ ] `/health` reports DB (and Redis, when configured) healthy
- [ ] Reduced-motion honored: no idle avatar animation
- [ ] Keyboard-only pass: tab through dashboard → quests → complete a quest
- [ ] 200% browser zoom: no clipped controls on dashboard
