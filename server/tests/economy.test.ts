/**
 * Tests for the economy integrity module:
 * token revocation, idempotency store, metrics registry,
 * reward tables, and ledger input validation.
 */
// Mock env before importing economy (env.ts exits the process when
// DATABASE_URL/JWT_SECRET are unset, which they are under Jest)
jest.mock('../src/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: '5000',
    DATABASE_URL: 'file:./test.db',
    JWT_SECRET: 'test-secret-at-least-16ch',
    LOG_LEVEL: 'error',
  },
}));

import {
  DEFAULT_XP_BY_RANK,
  DEFAULT_GOLD_BY_RANK,
  getRewardTableVersion,
  getXpForRank,
  getGoldForRank,
  incrementCounter,
  setGauge,
  renderMetrics,
  resetMetrics,
  signToken,
  revokeTokenJti,
  revokeAllUserTokens,
  isTokenRevoked,
  getIdempotentResponse,
  saveIdempotentResponse,
  recordLedgerEntry,
} from '../src/economy';
import jwt from 'jsonwebtoken';

describe('reward tables', () => {
  it('covers all six ranks', () => {
    for (const rank of ['E', 'D', 'C', 'B', 'A', 'S']) {
      expect(DEFAULT_XP_BY_RANK[rank]).toBeDefined();
      expect(DEFAULT_GOLD_BY_RANK[rank]).toBeDefined();
    }
  });

  it('falls back to E-rank values for unknown ranks', () => {
    expect(getXpForRank('X')).toBe(DEFAULT_XP_BY_RANK.E);
    expect(getGoldForRank('X')).toBe(DEFAULT_GOLD_BY_RANK.E);
  });

  it('monotonically increases with rank', () => {
    const order = ['E', 'D', 'C', 'B', 'A', 'S'];
    for (let i = 1; i < order.length; i++) {
      expect(getXpForRank(order[i])).toBeGreaterThan(getXpForRank(order[i - 1]));
      expect(getGoldForRank(order[i])).toBeGreaterThan(getGoldForRank(order[i - 1]));
    }
  });

  it('exposes a reward table version for ledger stamping', () => {
    expect(getRewardTableVersion()).toBeGreaterThanOrEqual(1);
  });
});

describe('metrics registry', () => {
  beforeEach(() => resetMetrics());

  it('counts increments', () => {
    incrementCounter('test_total', 'Test counter', ['endpoint'], ['shop']);
    incrementCounter('test_total', 'Test counter', ['endpoint'], ['shop']);
    incrementCounter('test_total', 'Test counter', ['endpoint'], ['quest'], 5);
    const out = renderMetrics();
    expect(out).toContain('# TYPE test_total counter');
    expect(out).toContain('test_total{endpoint="shop"} 2');
    expect(out).toContain('test_total{endpoint="quest"} 5');
  });

  it('gauges hold the last set value', () => {
    setGauge('conns', 'Connections', [], [], 3);
    setGauge('conns', 'Connections', [], [], 7);
    expect(renderMetrics()).toContain('conns 7');
  });

  it('escapes special characters in label values', () => {
    incrementCounter('esc', 'Escape test', ['path'], ['a"b\\c']);
    expect(renderMetrics()).toContain('path="a\\"b\\\\c"');
  });
});

describe('token revocation (memory fallback)', () => {
  const secret = 'test-secret-at-least-16ch';

  it('issues tokens with a jti and validates them', () => {
    const token = signToken('user-1', 'USER');
    const decoded = jwt.verify(token, secret) as any;
    expect(decoded.userId).toBe('user-1');
    expect(typeof decoded.jti).toBe('string');
    expect(decoded.jti.length).toBeGreaterThan(0);
  });

  it('rejects a revoked jti', async () => {
    const token = signToken('user-2', 'USER');
    const decoded = jwt.verify(token, secret) as any;

    expect(await isTokenRevoked(decoded.jti, 'user-2', decoded.iat)).toBe(false);
    await revokeTokenJti(decoded.jti);
    expect(await isTokenRevoked(decoded.jti, 'user-2', decoded.iat)).toBe(true);
  });

  it('rejects pre-cutoff tokens after revokeAllUserTokens but not new ones', async () => {
    const oldToken = signToken('user-3', 'USER');
    const oldDecoded = jwt.verify(oldToken, secret) as any;

    await revokeAllUserTokens('user-3');

    // Token issued before the cutoff is revoked
    expect(await isTokenRevoked(undefined, 'user-3', oldDecoded.iat)).toBe(true);
  });

  it('does not cross-contaminate users', async () => {
    await revokeAllUserTokens('user-4');
    expect(await isTokenRevoked(undefined, 'user-5', 1)).toBe(false);
  });
});

describe('idempotency store (memory fallback)', () => {
  it('returns null for unknown keys', async () => {
    expect(await getIdempotentResponse('user-1', 'no-such-key-123')).toBeNull();
  });

  it('round-trips a saved response', async () => {
    await saveIdempotentResponse('user-1', 'abc-test-key-1', 200, JSON.stringify({ ok: true }));
    const cached = await getIdempotentResponse('user-1', 'abc-test-key-1');
    expect(cached).toEqual({ responseJson: JSON.stringify({ ok: true }), statusCode: 200 });
  });

  it('scopes keys per user', async () => {
    await saveIdempotentResponse('user-a', 'abc-shared-key', 200, '{"a":1}');
    expect(await getIdempotentResponse('user-b', 'abc-shared-key')).toBeNull();
  });
});

describe('ledger recorder', () => {
  it('writes an entry with defaults applied', async () => {
    const created: any[] = [];
    const tx = {
      economyLedger: {
        create: jest.fn(async (args: any) => {
          created.push(args);
          return args.data;
        }),
      },
    };
    await recordLedgerEntry(tx as any, {
      userId: 'u1',
      reason: 'QUEST_COMPLETED',
      xpDelta: 50,
      goldDelta: 20,
      description: 'test',
      referenceType: 'Quest',
      referenceId: 'q1',
    });
    expect(created[0].data.xpDelta).toBe(50);
    expect(created[0].data.goldDelta).toBe(20);
    expect(created[0].data.rewardTableVersion).toBe(getRewardTableVersion());
  });

  it('defaults deltas to zero', async () => {
    const tx = {
      economyLedger: {
        create: jest.fn(async (args: any) => args),
      },
    };
    await recordLedgerEntry(tx as any, {
      userId: 'u1',
      reason: 'ADJUSTMENT',
      description: 'manual fix',
    });
    expect(tx.economyLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ xpDelta: 0, goldDelta: 0 }),
      })
    );
  });
});
