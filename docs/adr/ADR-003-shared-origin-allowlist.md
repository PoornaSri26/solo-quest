# ADR-003 — One origin allowlist for CORS, CSP, and CSRF

- **Status:** Accepted
- **Date:** 2026-09
- **Context:** CORS headers, Helmet's CSP `connect-src`, and CSRF Origin/Referer validation all need the same list of trusted browser origins. Three independently configured lists inevitably drift — a frontend origin added to CORS but not CSRF yields requests that pass CORS yet fail CSRF with a confusing 403.
- **Decision:** `ALLOWED_ORIGINS` (comma-separated) in `server/src/env.ts` is the single source of truth. It is parsed once into `allowedOrigins` and imported by the CORS config, the Helmet CSP `connect-src`, and `server/src/csrf.ts`. localhost development origins are always included by default.
- **Consequences:**
  - Adding a deployment origin is a one-variable change, verified by `server/.env.example` and the Configuration section of the README.
  - Non-browser callers (mobile app via Capacitor, server-to-server) either match an allowlisted origin or use the CSRF-exempt webhook path (`/api/subscription/webhook`, authenticated by Stripe signature instead of browser credentials).
