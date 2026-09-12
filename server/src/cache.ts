import { createClient } from 'redis';
import logger from './logger';
import { env } from './env';

// Redis client for caching (shared with rate limiter)
let cacheClient: ReturnType<typeof createClient> | null = null;
let isSharedClient = false;

// Set shared client (called by rate limiter)
export function setSharedClient(client: ReturnType<typeof createClient>) {
  cacheClient = client;
  isSharedClient = true;
  logger.info('Cache Redis client set to shared client');
}

// Initialize Redis cache client (shares rate limiter's Redis client)
export async function initCacheClient() {
  if (cacheClient) {
    return cacheClient;
  }

  // Create new client (will be shared by rate limiter)
  try {
    cacheClient = createClient({
      url: env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Cache Redis reconnection failed after 10 retries');
            return new Error('Cache Redis reconnection failed');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    cacheClient.on('error', (err) => {
      logger.error('Cache Redis client error:', err);
    });

    cacheClient.on('connect', () => {
      logger.info('Cache Redis client connected');
    });

    await cacheClient.connect();
    return cacheClient;
  } catch (error) {
    logger.error('Failed to initialize cache Redis client:', error);
    throw error;
  }
}

// Close cache client (only if it's not shared)
export async function closeCacheClient() {
  if (cacheClient && !isSharedClient) {
    await cacheClient.quit();
    cacheClient = null;
    logger.info('Cache Redis client closed');
  } else {
    cacheClient = null;
    isSharedClient = false;
    logger.info('Cache Redis client reference cleared (shared client managed by rate limiter)');
  }
}

// Get cache client (for health checks)
export function getCacheClient() {
  return cacheClient;
}

// Default TTL for cache entries (5 minutes)
const DEFAULT_TTL = 300;

/**
 * Get value from cache
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  if (!cacheClient || !cacheClient.isOpen) {
    return null;
  }

  try {
    const value = await cacheClient.get(key);
    if (value) {
      return JSON.parse(value) as T;
    }
    return null;
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set value in cache with optional TTL
 */
export async function setCache<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
  if (!cacheClient || !cacheClient.isOpen) {
    return;
  }

  try {
    await cacheClient.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    logger.error('Cache set error:', error);
  }
}

/**
 * Delete by exact key
 */
export async function deleteFromCache(key: string): Promise<void> {
  if (!cacheClient || !cacheClient.isOpen) {
    return;
  }

  try {
    await cacheClient.del(key);
  } catch (error) {
    logger.error('Cache delete error:', error);
  }
}

/**
 * Delete multiple keys matching a pattern
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  if (!cacheClient || !cacheClient.isOpen) {
    return;
  }

  try {
    const keys = await cacheClient.keys(pattern);
    if (keys.length > 0) {
      await cacheClient.del(keys);
    }
  } catch (error) {
    logger.error('Cache pattern delete error:', error);
  }
}

/**
 * Invalidate user-specific cache
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await deleteCachePattern(`user:${userId}:*`);
  await deleteCachePattern(`quests:${userId}:*`);
  await deleteCachePattern(`gates:${userId}:*`);
  await deleteCachePattern(`stats:${userId}:*`);
}

/**
 * Cache helper with automatic fallback to fetch function
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  // Try to get from cache first
  const cached = await getFromCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch from source
  const value = await fetchFn();

  // Store in cache
  await setCache(key, value, ttl);

  return value;
}

/**
 * Cache statistics
 */
export async function getCacheStats(): Promise<{
  totalKeys: number;
  memoryUsage: string;
  hitRate?: number;
}> {
  if (!cacheClient || !cacheClient.isOpen) {
    return { totalKeys: 0, memoryUsage: '0B' };
  }

  try {
    const info = await cacheClient.info('stats');
    const memoryInfo = await cacheClient.info('memory');

    const totalKeys = parseInt((info.match(/keyspace_hits:(\d+)/) || [])[1] || '0', 10) +
                     parseInt((info.match(/keyspace_misses:(\d+)/) || [])[1] || '0', 10);

    const hits = parseInt((info.match(/keyspace_hits:(\d+)/) || [])[1] || '0', 10);
    const misses = parseInt((info.match(/keyspace_misses:(\d+)/) || [])[1] || '0', 10);
    const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;

    const memoryUsage = (memoryInfo.match(/used_memory_human:([^\r\n]+)/) || [])[1] || '0B';

    return {
      totalKeys,
      memoryUsage,
      hitRate,
    };
  } catch (error) {
    logger.error('Cache stats error:', error);
    return { totalKeys: 0, memoryUsage: '0B' };
  }
}

/**
 * Flush all cache (use with caution)
 */
export async function flushCache(): Promise<void> {
  if (!cacheClient || !cacheClient.isOpen) {
    return;
  }

  try {
    await cacheClient.flushDb();
    logger.info('Cache flushed');
  } catch (error) {
    logger.error('Cache flush error:', error);
  }
}
