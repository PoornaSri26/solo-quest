# Threat Model (STRIDE-lite)

Scope: the API server (`server/`), the web/PWA frontend (`src/`), and their deployment configs. This is a living summary of principal threats and the mitigations in place — review it when adding auth, money, or admin surface. Bugs found via this model go through [SECURITY.md](../SECURITY.md).

## Assets

- **Credentials** — password hashes (bcrypt), JWT secrets, Stripe keys/webhook secret.
- **Money & economy** — gold, XP, subscriptions, ledger integrity.
- **PII** — emails, display names, push tokens, analytics events.
- **Availability** — the API itself.

## Spoofing

| Threat | Mitigation |
|---|---|
| Forged JWTs | HS256 with min-16-char secret (Zod-enforced at boot); short-lived tokens; token revocation blocklist in `economy.ts` |
| Credential stuffing | Redis-backed per-IP/user rate limiting (`auth`: 5/min) with memory fallback |
| Webhook spoofing | Stripe webhook verifies signature; CSRF-exempt but never trusts payloads without it |

## Tampering

| Threat | Mitigation |
|---|---|
| Client-sent XP/gold values | All economy math server-side; client can only *request* actions |
| Double-claim of rewards | Idempotent `updateMany` claim + idempotency keys; DB-level `@@unique([userId, itemId])` for purchases |
| Ledger manipulation | Append-only `EconomyLedger`; nightly reconciliation recomputes balances (`reconciliation.ts`, 96% tested) |
| Malicious avatar config | Whitelist + hex validation server-side (settings PATCH) |

## Repudiation

| Threat | Mitigation |
|---|---|
| "I didn't spend that gold" | Ledger records every mutation; admin actions route through RBAC with role checks |
| Undetected abuse | Structured logs with request IDs (`X-Request-ID` on every response) |

## Information disclosure

| Threat | Mitigation |
|---|---|
| Secrets in logs | `redact()` pipeline in `logger.ts` masks emails, JWTs, Bearer tokens, secret-named fields (tested) |
| PII harvesting | GDPR export/erasure endpoints; soft-delete + PII anonymization; deleted accounts rejected at login |
| SQL injection | Prisma parameterized queries only |
| XSS | React escaping + Helmet CSP (`connect-src` from the shared origin allowlist, ADR-003) |
| CSRF | Origin/Referer validation (ADR-003); exempt only the signature-verified webhook |
| IDOR | User-scoped queries always filter `userId` from the JWT, never from the request body |

## Denial of service

| Threat | Mitigation |
|---|---|
| API flooding | Tiered rate limiters (api/auth/createQuest/shop) |
| Payload bombs | 10 MB JSON body cap |
| Redis outage | Memory-fallback rate limiting + cache degradation; server boots without Redis |

## Elevation of privilege

| Threat | Mitigation |
|---|---|
| Normal user → admin APIs | `requireSuperadmin` on all admin routes; `role` column (SUPERADMIN/USER) |
| Free user → paid features | Server-side entitlement checks (`entitlements.ts`); client UI is never the gate |
| Expired subscription still honored | endDate checked on every entitlement read; auto-downgrade writes back |

## Security headers inventory (#235 audit)

Configured in `server/src/index.ts` via Helmet (CSP `connect-src` driven by `ALLOWED_ORIGINS` — ADR-003):

| Header | Status |
|---|---|
| `Content-Security-Policy` | ✅ default-src 'self'; connect-src from allowlist |
| `X-Frame-Options` / frameguard | ✅ deny |
| `X-Content-Type-Options` | ✅ nosniff |
| `Strict-Transport-Security` | ✅ (meaningful once served over TLS; enforced at the proxy/ingress) |
| `Referrer-Policy` | ✅ no-referrer |
| `Cross-Origin-*` headers | ✅ helmet defaults |

Residual notes: HSTS must also be set at the TLS terminator (nginx/ingress) to cover the browser's first-seen response; CORS is allowlist-driven, no wildcard in production.
