# SECURITY --- Solo Quest

Auth: JWT + bcrypt. Authorization: role-based (SUPERADMIN/USER) + ownership checks. Secrets in server/.env (never committed). Validation: Zod on server. Rate limiting: Redis-backed with memory fallback. HTTPS + Helmet headers. CSRF origin validation. PII redaction in logs. Economy server-side only.
