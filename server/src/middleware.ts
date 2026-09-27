import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import logger from './logger';
import { env } from './env';

// Extend Express Request type
declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

/**
 * Request ID middleware for traceability.
 * Honors an incoming X-Request-ID (e.g. from a load balancer) so traces
 * can be correlated end-to-end; otherwise generates a UUID.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.headers['x-request-id'];
  req.id =
    typeof incoming === 'string' && incoming.length >= 8 && incoming.length <= 128
      ? incoming
      : randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Request logging middleware.
 * Logs incoming requests and their response times.
 */
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  logger.info(`${req.method} ${req.path}`, {
    requestId: req.id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode}`, {
      requestId: req.id,
      duration: `${duration}ms`,
    });
  });

  next();
};

/**
 * Request timing middleware for performance monitoring.
 * Logs slow requests (over 100ms).
 */
export const requestTimingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 100) {
      logger.info(`Slow request: ${req.method} ${req.path} - ${duration}ms`, {
        requestId: req.id,
      });
    }
  });
  next();
};

/**
 * Request timeout handling.
 * Sends a 504 if the response hasn't started within 30 seconds. The timer
 * is cleared on BOTH 'finish' and 'close' so aborted requests don't leak
 * dangling timers. (Note: this bounds response time; it cannot abort
 * in-flight async work — genuine cancellation needs AbortController at
 * the query layer.)
 */
export const requestTimeoutMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      logger.warn(`Request timeout: ${req.method} ${req.path}`, {
        requestId: req.id,
      });
      res.status(504).json({ error: 'Request timeout' });
    }
  }, 30000); // 30 second timeout

  const clear = () => clearTimeout(timeout);
  res.on('finish', clear);
  res.on('close', clear);
  next();
};

/**
 * HTTP caching headers for static-like data.
 * GET/HEAD only: cache directives on mutating responses (e.g. the
 * shop-purchase POST) would be wrong and, for shared caches, unsafe.
 */
export const cachingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (req.path.startsWith('/api/shop')) {
      res.setHeader('Cache-Control', 'public, max-age=600'); // 10 minutes
    } else if (req.path.startsWith('/api/hunter/me') || req.path.startsWith('/api/gates')) {
      res.setHeader('Cache-Control', 'private, max-age=120'); // 2 minutes
    } else if (req.path.startsWith('/api/quests')) {
      res.setHeader('Cache-Control', 'private, max-age=60'); // 1 minute
    }
  }
  next();
};

/**
 * Global error handling middleware.
 * Catches and logs all errors, sends appropriate responses.
 * Must be registered LAST, after notFoundMiddleware.
 */
export const errorHandlerMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    requestId: req.id,
    path: req.path,
    method: req.method,
  });

  // Don't leak error details in production
  const isDevelopment = env.NODE_ENV === 'development';

  if (res.headersSent) {
    // Headers already gone out — delegate to Express's default handler
    return next(err);
  }

  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
    requestId: req.id,
  });
};

/**
 * 404 handler middleware.
 * Handles requests to non-existent routes.
 * Must be registered after ALL routes but BEFORE errorHandlerMiddleware.
 */
export const notFoundMiddleware = (req: Request, res: Response) => {
  logger.warn('404 Not Found', {
    requestId: req.id,
    path: req.path,
    method: req.method,
  });
  res.status(404).json({ error: 'Not found', requestId: req.id });
};

/**
 * Health check middleware.
 * Simple health check endpoint.
 */
export const healthCheckMiddleware = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};
