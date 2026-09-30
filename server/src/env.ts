import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  REDIS_URL: z.string().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  /**
   * Comma-separated allowlist of browser origins allowed to call the API.
   * Single source of truth for CORS, helmet CSP connectSrc, and CSRF
   * Origin/Referer validation so the three can never drift apart.
   * localhost entries are always included for development.
   */
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173,http://localhost:5000,http://localhost,http://127.0.0.1:5173,http://127.0.0.1,http://127.0.0.1:5000'),
});

function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    console.error('❌ Invalid environment variables:');
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
}

export const env = validateEnv();

/** Parsed origin allowlist (trimmed, deduped) shared by CORS/CSP/CSRF. */
export const allowedOrigins: string[] = Array.from(
  new Set(
    env.ALLOWED_ORIGINS.split(',')
      .map(o => o.trim())
      .filter(Boolean)
  )
);

/**
 * True for browser origins that identify the local machine: `localhost`,
 * `127.0.0.1`, or the `*.localhost` family — any port.
 */
export function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.localhost') ||
      hostname === '[::1]' ||
      hostname === '::1'
    );
  } catch {
    return false;
  }
}

/**
 * True for RFC 1918 private-network hosts (any port) — e.g. testing the app
 * from a phone via the dev machine's LAN IP (vite host: 0.0.0.0).
 */
export function isPrivateLanOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Origin validation shared by CORS, CSRF, and Socket.IO.
 *
 * - Production: strict allowlist only (ADR-003).
 * - Development/test: the allowlist always passes, plus localhost on any
 *   port (vite auto-increments when 5173 is busy) and private LAN IPs
 *   (mobile device testing). Non-local origins must still be allowlisted.
 */
export function isOriginAllowed(origin: string | undefined | null): boolean {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  if (env.NODE_ENV === 'production') return false;
  return isLocalhostOrigin(origin) || isPrivateLanOrigin(origin);
}
