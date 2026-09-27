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

// Rate limiter definitions — single source of truth so the Redis-backed
// and memory-fallback limiters can never drift apart.
export type RateLimiterType = 'api' | 'auth' | 'createQuest' | 'shop';

export const RATE_LIMIT_CONFIG: Record<RateLimiterType, { points: number; duration: number; keyPrefix: string; description: string }> = {
  // General API rate limiter (100 requests per 15 minutes)
  api: { points: 100, duration: 900, keyPrefix: 'api_limit', description: 'General API' },
  // Auth rate limiter (5 requests per minute)
  auth: { points: 5, duration: 60, keyPrefix: 'auth_limit', description: 'Authentication' },
  // Create quest rate limiter (10 requests per minute)
  createQuest: { points: 10, duration: 60, keyPrefix: 'create_quest_limit', description: 'Quest creation' },
  // Shop purchase rate limiter (10 requests per minute)
  shop: { points: 10, duration: 60, keyPrefix: 'shop_limit', description: 'Shop purchases' },
};

// Rate limiters for different endpoints - will be initialized after Redis connects
let rateLimiters: Record<RateLimiterType, RateLimiterRedis> | null = null;

export function initRateLimiters() {
  if (!redisClient) {
    throw new Error('Redis client must be initialized before rate limiters');
  }

  rateLimiters = Object.fromEntries(
    (Object.keys(RATE_LIMIT_CONFIG) as RateLimiterType[]).map(type => [
      type,
      new RateLimiterRedis({
        storeClient: redisClient as any,
        keyPrefix: RATE_LIMIT_CONFIG[type].keyPrefix,
        points: RATE_LIMIT_CONFIG[type].points,
        duration: RATE_LIMIT_CONFIG[type].duration,
      }),
    ])
  ) as Record<RateLimiterType, RateLimiterRedis>;
}

// Fallback to memory-based rate limiter if Redis is not available
import { RateLimiterMemory } from 'rate-limiter-flexible';

export const fallbackRateLimiters: Record<RateLimiterType, RateLimiterMemory> = Object.fromEntries(
  (Object.keys(RATE_LIMIT_CONFIG) as RateLimiterType[]).map(type => [
    type,
    new RateLimiterMemory({
      points: RATE_LIMIT_CONFIG[type].points,
      duration: RATE_LIMIT_CONFIG[type].duration,
    }),
  ])
) as Record<RateLimiterType, RateLimiterMemory>;

// Get rate limiter (Redis or fallback)
export function getRateLimiter(type: RateLimiterType) {
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
