/**
 * Unit tests for the rate limiter module: Redis init lifecycle, limiter
 * construction, reconnect backoff strategy, and the memory fallback path.
 * The Redis client is mocked; rateLimiter.ts keeps module-level state, so
 * tests run in lifecycle order (init → use → close → fallback).
 */
jest.mock('redis', () => ({
  createClient: jest.fn(),
}));
jest.mock('../src/cache', () => ({
  setSharedClient: jest.fn(),
}));
jest.mock('../src/env', () => ({
  env: {
    NODE_ENV: 'test',
    REDIS_URL: 'redis://localhost:6379',
  },
}));

import { createClient } from 'redis';
import { setSharedClient } from '../src/cache';
import {
  initRedisClient,
  closeRedisClient,
  initRateLimiters,
  getRateLimiter,
  getRedisClient,
  RATE_LIMIT_CONFIG,
  fallbackRateLimiters,
} from '../src/rateLimiter';

const createClientMock = createClient as jest.Mock;
const setSharedClientMock = setSharedClient as jest.Mock;

function makeFakeRedis() {
  return {
    on: jest.fn(),
    connect: jest.fn(async () => {}),
    quit: jest.fn(async () => {}),
    isOpen: true,
  };
}

describe('rate limiter config', () => {
  it('defines all four limiter types with sane values', () => {
    expect(Object.keys(RATE_LIMIT_CONFIG).sort()).toEqual(['api', 'auth', 'createQuest', 'shop']);
    expect(RATE_LIMIT_CONFIG.api).toMatchObject({ points: 100, duration: 900 });
    expect(RATE_LIMIT_CONFIG.auth).toMatchObject({ points: 5, duration: 60 });
    expect(RATE_LIMIT_CONFIG.createQuest).toMatchObject({ points: 10, duration: 60 });
    expect(RATE_LIMIT_CONFIG.shop).toMatchObject({ points: 10, duration: 60 });
  });

  it('builds memory fallback limiters for every type at module load', () => {
    expect(Object.keys(fallbackRateLimiters).sort()).toEqual([
      'api',
      'auth',
      'createQuest',
      'shop',
    ]);
  });
});

describe('rate limiter lifecycle', () => {
  it('initRateLimiters throws before Redis is initialized', () => {
    expect(() => initRateLimiters()).toThrow('Redis client must be initialized');
  });

  it('getRateLimiter falls back to memory limiters when Redis is down', () => {
    expect(getRateLimiter('auth')).toBe(fallbackRateLimiters.auth);
  });

  it('initRedisClient creates, connects, and shares the Redis client', async () => {
    const fake = makeFakeRedis();
    createClientMock.mockReturnValue(fake);

    const client = await initRedisClient();

    expect(client).toBe(fake);
    expect(createClientMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'redis://localhost:6379' })
    );
    expect(fake.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(fake.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(fake.connect).toHaveBeenCalled();
    expect(setSharedClientMock).toHaveBeenCalledWith(fake);
    expect(getRedisClient()).toBe(fake);
  });

  it('initRedisClient is idempotent (returns the existing client)', async () => {
    const callsBefore = createClientMock.mock.calls.length;
    const again = await initRedisClient();

    expect(createClientMock.mock.calls.length).toBe(callsBefore);
    expect(again).toBe(getRedisClient());
  });

  it('exposes the reconnect strategy: backs off up to 3s, fails after 10 retries', () => {
    const config = createClientMock.mock.calls[0][0];
    const strategy = config.socket.reconnectStrategy;

    expect(strategy(1)).toBe(100);
    expect(strategy(5)).toBe(500);
    expect(strategy(10)).toBe(1000); // Math.min(10 * 100, 3000)
    expect(strategy(11)).toBeInstanceOf(Error);
    expect(strategy(40)).toBeInstanceOf(Error);
  });

  it('initRateLimiters constructs one Redis-backed limiter per type', () => {
    expect(() => initRateLimiters()).not.toThrow();
  });

  it('getRateLimiter returns the Redis-backed limiter when connected', () => {
    expect(getRateLimiter('api')).not.toBe(fallbackRateLimiters.api);
  });

  it('closeRedisClient quits and clears the client', async () => {
    const client = getRedisClient() as any;

    await closeRedisClient();

    expect(client.quit).toHaveBeenCalled();
    expect(getRedisClient()).toBeNull();
  });

  it('getRateLimiter falls back to memory again after close', () => {
    expect(getRateLimiter('shop')).toBe(fallbackRateLimiters.shop);
  });

  it('closeRedisClient is a no-op when nothing is open', async () => {
    await expect(closeRedisClient()).resolves.toBeUndefined();
  });
});
