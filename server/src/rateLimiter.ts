import { RateLimiterRedis } from 'rate-limiter-flexible';
import { createClient } from 'redis';
import logger from './logger';
import { env } from './env';
import { setSharedClient } from './cache';

// Redis client for rate limiting (shared with cache)
let redisClient: ReturnType<typeof createClient> | null = null;

// Initialize Redis client for rate limiting
export async function initRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = createClient({
      url: env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 retries');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    await redisClient.connect();

    // Share this client with the cache module
    setSharedClient(redisClient);

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis client:', error);
    throw error;
  }
}

// Close Redis client
export async function closeRedisClient() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis client closed');
  }
}

// Rate limiters for different endpoints - will be initialized after Redis connects
let rateLimiters: {
  api: RateLimiterRedis;
  auth: RateLimiterRedis;
  createQuest: RateLimiterRedis;
  shop: RateLimiterRedis;
} | null = null;

export function initRateLimiters() {
  if (!redisClient) {
    throw new Error('Redis client must be initialized before rate limiters');
  }

  rateLimiters = {
    // General API rate limiter (100 requests per 15 minutes)
    api: new RateLimiterRedis({
      storeClient: redisClient as any,
      keyPrefix: 'api_limit',
      points: 100,
      duration: 900, // 15 minutes
    }),

    // Auth rate limiter (5 requests per minute)
    auth: new RateLimiterRedis({
      storeClient: redisClient as any,
      keyPrefix: 'auth_limit',
      points: 5,
      duration: 60, // 1 minute
    }),

    // Create quest rate limiter (10 requests per minute)
    createQuest: new RateLimiterRedis({
      storeClient: redisClient as any,
      keyPrefix: 'create_quest_limit',
      points: 10,
      duration: 60, // 1 minute
    }),

    // Shop purchase rate limiter (10 requests per minute)
    shop: new RateLimiterRedis({
      storeClient: redisClient as any,
      keyPrefix: 'shop_limit',
      points: 10,
      duration: 60, // 1 minute
    }),
  };
}

// Fallback to memory-based rate limiter if Redis is not available
import { RateLimiterMemory } from 'rate-limiter-flexible';

export const fallbackRateLimiters = {
  api: new RateLimiterMemory({
    points: 100,
    duration: 900,
  }),
  auth: new RateLimiterMemory({
    points: 5,
    duration: 60,
  }),
  createQuest: new RateLimiterMemory({
    points: 10,
    duration: 60,
  }),
  shop: new RateLimiterMemory({
    points: 10,
    duration: 60,
  }),
};

// Get rate limiter (Redis or fallback)
export function getRateLimiter(type: 'api' | 'auth' | 'createQuest' | 'shop') {
  if (rateLimiters && redisClient && redisClient.isOpen) {
    return rateLimiters[type];
  }
  logger.warn('Redis not available, using memory-based rate limiter');
  return fallbackRateLimiters[type];
}

// Get Redis client (for health checks)
export function getRedisClient() {
  return redisClient;
}
