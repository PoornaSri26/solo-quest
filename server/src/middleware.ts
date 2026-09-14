import { Request, Response, NextFunction } from 'express';
import logger from './logger';
import { env } from './env';

// Extend Express Request type
declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

/**
 * Request ID middleware for traceability
 * Generates a unique ID for each request and adds it to the response headers
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.id = Date.now().toString(36) + Math.random().toString(36).substring(2);
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Request logging middleware
 * Logs incoming requests and their response times
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
 * Body validation middleware
 * Sanitizes request bodies to prevent prototype pollution
 */
export const bodyValidationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (req.body && typeof req.body === 'object') {
      // Remove any prototype pollution attempts
      const sanitizedBody = JSON.parse(JSON.stringify(req.body));
      req.body = sanitizedBody;
    }
  }
  next();
};

/**
 * Request timing middleware for performance monitoring
 * Logs slow requests (over 100ms)
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
 * Request timeout handling
 * Times out requests after 30 seconds
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

  res.on('finish', () => clearTimeout(timeout));
  next();
};

/**
 * HTTP caching headers for static-like data
 * Adds appropriate cache headers based on the endpoint
 */
export const cachingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/shop')) {
    res.setHeader('Cache-Control', 'public, max-age=600'); // 10 minutes
  } else if (req.path.startsWith('/api/hunter/me') || req.path.startsWith('/api/gates')) {
    res.setHeader('Cache-Control', 'private, max-age=120'); // 2 minutes
  } else if (req.path.startsWith('/api/quests')) {
    res.setHeader('Cache-Control', 'private, max-age=60'); // 1 minute
  }
  next();
};

/**
 * HTTP keep-alive middleware
 * Enables connection reuse for better performance
 */
export const keepAliveMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=5, max=1000');
  next();
};

/**
 * Global error handling middleware
 * Catches and logs all errors, sends appropriate responses
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
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
    requestId: req.id,
  });
};

/**
 * 404 handler middleware
 * Handles requests to non-existent routes
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
 * Security headers middleware
 * Adds additional security headers beyond helmet
 */
export const securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

/**
 * Health check middleware
 * Simple health check endpoint
 */
export const healthCheckMiddleware = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};