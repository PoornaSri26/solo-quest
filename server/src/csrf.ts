import { Request, Response, NextFunction } from 'express';
import logger from './logger';
import { isOriginAllowed } from './env';

// Paths exempt from CSRF: server-to-server endpoints that authenticate via
// signature verification (Stripe webhook) rather than browser credentials.
// CSRF attacks work by riding a browser's ambient credentials — a signed
// webhook has none, and Stripe POSTs carry no Origin header.
export const CSRF_EXEMPT_PATHS = new Set(['/api/subscription/webhook']);

/**
 * CSRF protection middleware using Origin/Referer header validation.
 * Effective for token-based authentication APIs.
 * Origins come from the shared ALLOWED_ORIGINS env var (see env.ts) so
 * CORS, CSP, and CSRF can never drift apart.
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip for GET, HEAD, OPTIONS requests (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip for WebSocket upgrade requests
  if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
    return next();
  }

  // Skip signature-verified server-to-server endpoints
  if (CSRF_EXEMPT_PATHS.has(req.path) || CSRF_EXEMPT_PATHS.has(req.originalUrl.split('?')[0])) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // Check Origin header first (preferred)
  if (origin) {
    if (isOriginAllowed(origin)) {
      return next();
    }
    logger.warn(`CSRF violation: Invalid Origin header: ${origin}`, { requestId: (req as any).id });
    return res.status(403).json({ error: 'Invalid origin' });
  }

  // Fallback to Referer header
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (isOriginAllowed(refererOrigin)) {
        return next();
      }
    } catch {
      // malformed Referer — fall through to rejection
    }
    logger.warn(`CSRF violation: Invalid Referer header: ${referer}`, { requestId: (req as any).id });
    return res.status(403).json({ error: 'Invalid referer' });
  }

  // No Origin/Referer: in development allow for curl/testing convenience.
  // Production rejects — except the exempt webhook path handled above.
  if (env_NODE_ENV_IS_DEV()) {
    logger.warn('CSRF check skipped in development: No Origin/Referer header', { requestId: (req as any).id });
    return next();
  }

  logger.warn('CSRF violation: Missing Origin and Referer headers', { requestId: (req as any).id });
  res.status(403).json({ error: 'CSRF protection: Missing origin/referer' });
};

// Kept as a tiny function to avoid importing env (and thus failing in test
// environments where env vars are mocked differently) at module load time.
function env_NODE_ENV_IS_DEV(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Generate a CSRF token for cookie-based authentication (future use)
 * Currently not used as the app uses JWT token-based auth
 */
export const generateCsrfToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};
