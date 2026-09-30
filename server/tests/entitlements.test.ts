/**
 * Unit tests for subscription entitlements: tier hierarchy, gating
 * middleware, entitlement resolution, and usage limits. Prisma is mocked
 * with in-memory fakes — no database required.
 *
 * entitlements.ts constructs its own PrismaClient at module load, so the
 * mock factory returns a constructor that always yields the same fake
 * instance; the test grabs that instance with `new PrismaClient()`.
 */
jest.mock('@prisma/client', () => {
  const instance = {
    subscription: { findUnique: jest.fn(), update: jest.fn() },
    userSettings: { findUnique: jest.fn() },
    hunterStats: { findUnique: jest.fn() },
    quest: { count: jest.fn() },
    gate: { count: jest.fn() },
  };
  const PrismaClient = jest.fn(() => instance);
  return { PrismaClient };
});

import { PrismaClient } from '@prisma/client';
import {
  hasSubscriptionTier,
  requireSubscriptionTier,
  requirePaidSubscription,
  getUserEntitlements,
  checkUserLimits,
} from '../src/entitlements';

// Same fake instance the module under test holds (factory returns it from
// the constructor every time).
const prisma = new PrismaClient() as any;

const subscriptionFindUnique = prisma.subscription.findUnique as jest.Mock;
const subscriptionUpdate = prisma.subscription.update as jest.Mock;
const userSettingsFindUnique = prisma.userSettings.findUnique as jest.Mock;
const questCount = prisma.quest.count as jest.Mock;
const gateCount = prisma.gate.count as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

function sub(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub-1',
    userId: 'user-1',
    plan: 'hunter_pass',
    status: 'active',
    endDate: null,
    ...overrides,
  };
}

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as any;
}

// ============================================================
// hasSubscriptionTier
// ============================================================

describe('hasSubscriptionTier', () => {
  it('treats a user with no subscription as free tier', async () => {
    subscriptionFindUnique.mockResolvedValue(null);

    expect(await hasSubscriptionTier('u1', 'free')).toBe(true);
    expect(await hasSubscriptionTier('u1', 'hunter_pass')).toBe(false);
  });

  it('treats non-active subscriptions as free', async () => {
    subscriptionFindUnique.mockResolvedValue(sub({ status: 'past_due' }));

    expect(await hasSubscriptionTier('u1', 'free')).toBe(true);
    expect(await hasSubscriptionTier('u1', 'hunter_pass')).toBe(false);
  });

  it('downgrades an expired subscription to free/canceled', async () => {
    subscriptionFindUnique.mockResolvedValue(sub({ endDate: new Date(Date.now() - 864e5) }));

    expect(await hasSubscriptionTier('u1', 'free')).toBe(true);
    expect(await hasSubscriptionTier('u1', 'hunter_pass')).toBe(false);
    expect(subscriptionUpdate).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { plan: 'free', status: 'canceled' },
    });
  });

  it('does not downgrade a future-dated subscription', async () => {
    subscriptionFindUnique.mockResolvedValue(sub({ endDate: new Date(Date.now() + 864e5) }));

    expect(await hasSubscriptionTier('u1', 'hunter_pass')).toBe(true);
    expect(subscriptionUpdate).not.toHaveBeenCalled();
  });

  it('enforces the tier hierarchy free < hunter_pass < guild < enterprise', async () => {
    subscriptionFindUnique.mockResolvedValue(sub({ plan: 'guild' }));

    expect(await hasSubscriptionTier('u1', 'free')).toBe(true);
    expect(await hasSubscriptionTier('u1', 'hunter_pass')).toBe(true);
    expect(await hasSubscriptionTier('u1', 'guild')).toBe(true);
    expect(await hasSubscriptionTier('u1', 'enterprise')).toBe(false);
  });

  it('rejects unknown plans', async () => {
    subscriptionFindUnique.mockResolvedValue(sub({ plan: 'mystery_tier' }));

    expect(await hasSubscriptionTier('u1', 'free')).toBe(false);
  });
});

// ============================================================
// requireSubscriptionTier middleware
// ============================================================

describe('requireSubscriptionTier middleware', () => {
  it('401s when there is no authenticated user', async () => {
    const res = makeRes();
    const next = jest.fn();

    await requireSubscriptionTier('hunter_pass')({} as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts req.user.id as well as req.user.userId', async () => {
    subscriptionFindUnique.mockResolvedValue(sub({ plan: 'enterprise' }));
    const next = jest.fn();

    await requireSubscriptionTier('guild')({ user: { id: 'u1' } } as any, makeRes(), next);

    expect(next).toHaveBeenCalled();
    expect(subscriptionFindUnique).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('calls next() when the user has the tier', async () => {
    subscriptionFindUnique.mockResolvedValue(sub({ plan: 'enterprise' }));
    const next = jest.fn();

    await requireSubscriptionTier('hunter_pass')({ user: { userId: 'u1' } } as any, makeRes(), next);

    expect(next).toHaveBeenCalled();
  });

  it('403s with tier details when the user lacks the tier', async () => {
    subscriptionFindUnique.mockResolvedValue(null);
    const res = makeRes();
    const next = jest.fn();

    await requireSubscriptionTier('hunter_pass')({ user: { userId: 'u1' } } as any, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Premium feature',
        requiredTier: 'hunter_pass',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('500s when the entitlement lookup fails', async () => {
    subscriptionFindUnique.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    const next = jest.fn();

    await requireSubscriptionTier('free')({ user: { userId: 'u1' } } as any, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    expect(next).not.toHaveBeenCalled();
  });

  it('requirePaidSubscription gates on hunter_pass', async () => {
    subscriptionFindUnique.mockResolvedValue(null);
    const res = makeRes();

    await requirePaidSubscription({ user: { userId: 'u1' } } as any, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ============================================================
// getUserEntitlements
// ============================================================

describe('getUserEntitlements', () => {
  it('returns the free feature set when no subscription exists', async () => {
    subscriptionFindUnique.mockResolvedValue(null);
    userSettingsFindUnique.mockResolvedValue(null);

    const e = await getUserEntitlements('u1');

    expect(e.plan).toBe('free');
    expect(e.status).toBe('active');
    expect(e.features).toMatchObject({
      maxDailyDungeons: 1,
      maxGateSlots: 1,
      maxQuests: 10,
      streakFreezeTokens: 0,
      apiAccess: false,
      whiteLabel: false,
    });
    expect(e.settings).toMatchObject({
      simpleMode: false,
      penaltySeverity: 'forgiving',
      notificationPreference: 'adaptive',
    });
  });

  it('returns stored user settings when present', async () => {
    subscriptionFindUnique.mockResolvedValue(null);
    userSettingsFindUnique.mockResolvedValue({
      simpleMode: true,
      penaltySeverity: 'brutal',
      notificationPreference: 'off',
    });

    const e = await getUserEntitlements('u1');

    expect(e.settings).toMatchObject({ simpleMode: true, penaltySeverity: 'brutal' });
  });

  it('returns tier features for an active paid plan', async () => {
    subscriptionFindUnique.mockResolvedValue(sub({ plan: 'guild' }));
    userSettingsFindUnique.mockResolvedValue(null);

    const e = await getUserEntitlements('u1');

    expect(e.plan).toBe('guild');
    expect(e.status).toBe('active');
    expect(e.features).toMatchObject({ maxGateSlots: 10, apiAccess: true, whiteLabel: false });
  });

  it('returns enterprise features for an enterprise plan', async () => {
    subscriptionFindUnique.mockResolvedValue(sub({ plan: 'enterprise' }));
    userSettingsFindUnique.mockResolvedValue(null);

    const e = await getUserEntitlements('u1');

    expect(e.features).toMatchObject({ whiteLabel: true, maxQuests: 999 });
  });

  it('downgrades expired subscriptions to the free feature set', async () => {
    subscriptionFindUnique.mockResolvedValue(sub({ endDate: new Date(Date.now() - 864e5) }));
    userSettingsFindUnique.mockResolvedValue(null);

    const e = await getUserEntitlements('u1');

    expect(subscriptionUpdate).toHaveBeenCalled();
    expect(e.plan).toBe('free');
    expect(e.status).toBe('canceled');
    expect(e.features.maxQuests).toBe(10);
  });

  it('falls back to free features for an unrecognized plan name', async () => {
    subscriptionFindUnique.mockResolvedValue(sub({ plan: 'mystery_tier' }));
    userSettingsFindUnique.mockResolvedValue(null);

    const e = await getUserEntitlements('u1');

    expect(e.plan).toBe('mystery_tier');
    expect(e.features.maxQuests).toBe(10);
  });
});

// ============================================================
// checkUserLimits
// ============================================================

describe('checkUserLimits', () => {
  beforeEach(() => {
    subscriptionFindUnique.mockResolvedValue(null); // free tier defaults
    userSettingsFindUnique.mockResolvedValue(null);
  });

  it('create_quest: allowed under maxQuests, blocked at the cap', async () => {
    questCount.mockResolvedValue(9);
    expect(await checkUserLimits('u1', 'create_quest')).toBe(true);
    expect(questCount).toHaveBeenCalledWith({
      where: { userId: 'u1', status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
    });

    questCount.mockResolvedValue(10);
    expect(await checkUserLimits('u1', 'create_quest')).toBe(false);
  });

  it('create_gate: allowed under maxGateSlots, blocked at the cap', async () => {
    gateCount.mockResolvedValue(0);
    expect(await checkUserLimits('u1', 'create_gate')).toBe(true);

    gateCount.mockResolvedValue(1); // free tier: 1 gate slot
    expect(await checkUserLimits('u1', 'create_gate')).toBe(false);
  });

  it('use_streak_freeze: requires positive tokens', async () => {
    // Free tier has 0 streak freeze tokens.
    expect(await checkUserLimits('u1', 'use_streak_freeze')).toBe(false);
  });

  it('use_streak_freeze: allowed when the plan grants tokens', async () => {
    subscriptionFindUnique.mockResolvedValue(sub({ plan: 'hunter_pass' }));
    expect(await checkUserLimits('u1', 'use_streak_freeze')).toBe(true);
  });

  it('unknown actions are always allowed', async () => {
    expect(await checkUserLimits('u1', 'something_else')).toBe(true);
  });
});
