# ADR-002 — Stripe is optional at boot; guarded lazy client

- **Status:** Accepted
- **Date:** 2026-09
- **Context:** The server originally imported and instantiated `Stripe` eagerly at module load. With `STRIPE_SECRET_KEY` unset (every dev machine and CI), the Stripe SDK threw `Neither apiKey nor config.authenticator provided` — the process died, and the only trace was a line in `logs/exceptions.log`. Monetization is not core to local development, so a missing key must not be fatal.
- **Decision:** `server/src/stripe.ts` exposes a lazy singleton (`getStripe()`) plus `isStripeEnabled()`. The client is only constructed when a key is present; every Stripe call site guards with `isStripeEnabled()` and degrades gracefully (subscription endpoints return a "billing not configured" response). A Proxy keeps `import { stripe }` working for call sites without eagerly constructing.
- **Consequences:**
  - Boot never depends on billing credentials.
  - A silently-misconfigured production deployment would serve a degraded billing surface — health checks should assert `isStripeEnabled()` in environments where billing is expected.
  - Webhook signature verification still requires `STRIPE_WEBHOOK_SECRET`; the webhook path returns 503 when unset.
