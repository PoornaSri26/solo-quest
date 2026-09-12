import { Request, Response, NextFunction } from 'express';
import logger from './logger';
import { env } from './env';

// Allowed origins for CSRF protection
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost', // Docker Compose internal
];

// Add environment-specific origins
if (env.NODE_ENV === 'production') {
  // In production, add your actual frontend domain
  // allowedOrigins.push('https://your-frontend-domain.com');
}

/**
 * CSRF protection middleware using Origin/Referer header validation
 * This is effective for token-based authentication APIs
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

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // Check Origin header first (preferred)
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      return next();
    }
    logger.warn(`CSRF violation: Invalid Origin header: ${origin}`);
    return res.status(403).json({ error: 'Invalid origin' });
  }

  // Fallback to Referer header
  if (referer) {
    const refererOrigin = new URL(referer).origin;
    if (allowedOrigins.includes(refererOrigin)) {
      return next();
    }
    logger.warn(`CSRF violation: Invalid Referer header: ${referer}`);
    return res.status(403).json({ error: 'Invalid referer' });
  }

  // In development, allow requests without Origin/Referer for testing
  if (env.NODE_ENV === 'development') {
    logger.warn('CSRF check skipped in development: No Origin/Referer header');
    return next();
  }

  logger.warn('CSRF violation: Missing Origin and Referer headers');
  res.status(403).json({ error: 'CSRF protection: Missing origin/referer' });
};

/**
 * Generate a CSRF token for cookie-based authentication (future use)
 * Currently not used as the app uses JWT token-based auth
 */
export const generateCsrfToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};
