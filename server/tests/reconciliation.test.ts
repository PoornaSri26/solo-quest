/**
 * Tests for DB-backed reward tables and economy reconciliation.
 * Uses in-memory fake Prisma stores — no database required.
 */
jest.mock('../src/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: '5000',
    DATABASE_URL: 'file:./test.db',
    JWT_SECRET: 'test-secret-at-least-16ch',
    LOG_LEVEL: 'error',
  },
}));

import { loadRewardTable, updateRewardValue, getXpForRank, getGoldForRank, REWARD_KEYS } from '../src/economy';
import { runReconciliation } from '../src/reconciliation';

// ============================================================
// Reward table loader
// ============================================================

describe('loadRewardTable', () => {
  it('seeds defaults when the store is empty', async () => {
    const store: any = {
      rewardConfig: {
        findMany: jest.fn(async () => []),
        upsert: jest.fn(async ({ where, create }: any) => create),
        update: jest.fn(async (args: any) => args.data),
      },
    };

    await loadRewardTable(store);

    // 12 keys seeded (6 XP ranks + 6 gold ranks)
    expect(store.rewardConfig.upsert).toHaveBeenCalledTimes(12);
    expect(getXpForRank('E')).toBe(10);
    expect(getGoldForRank('S')).toBe(200);
  });

  it('loads custom values from the store', async () => {
    const rows = [
      { key: 'QUEST_XP_E', value: 15, version: 2 },
      { key: 'QUEST_XP_S', value: 900, version: 3 },
      { key: 'QUEST_GOLD_B', value: 55, version: 3 },
    ];
    const store: any = {
      rewardConfig: {
        findMany: jest.fn(async () => rows),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };

    await loadRewardTable(store);

    expect(getXpForRank('E')).toBe(15);
    expect(getXpForRank('S')).toBe(900);
    expect(getGoldForRank('B')).toBe(55);
    // Untouched keys fall back to defaults
    expect(getGoldForRank('E')).toBe(5);
  });

  it('falls back to defaults without throwing when the store fails', async () => {
    const store: any = {
      rewardConfig: {
        findMany: jest.fn(async () => {
          throw new Error('DB down');
        }),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };

    await expect(loadRewardTable(store)).resolves.toBeUndefined();
    // Defaults still served
    expect(getXpForRank('C')).toBe(50);
  });
});

describe('updateRewardValue', () => {
  const makeStore = () => ({
    rewardConfig: {
      findMany: jest.fn(async () => [
        { key: 'QUEST_XP_E', value: 10, version: 1 },
      ]),
      upsert: jest.fn(async ({ where, update }: any) => ({ key: where.key, version: 1, ...update })),
      update: jest.fn(async () => ({ version: 2 })),
    },
  });

  it('rejects unknown keys', async () => {
    const store = makeStore();
    await expect(updateRewardValue(store as any, 'NOT_A_KEY', 100)).rejects.toThrow(/Unknown reward key/);
  });

  it('rejects invalid values (negative, non-integer, huge)', async () => {
    const store = makeStore();
    await expect(updateRewardValue(store as any, 'QUEST_XP_E', -5)).rejects.toThrow(/non-negative integer/);
    await expect(updateRewardValue(store as any, 'QUEST_XP_E', 1.5)).rejects.toThrow(/non-negative integer/);
    await expect(updateRewardValue(store as any, 'QUEST_XP_E', 2_000_000)).rejects.toThrow(/non-negative integer/);
    expect(store.rewardConfig.upsert).not.toHaveBeenCalled();
  });

  it('accepts valid keys and values', async () => {
    const store = makeStore();
    await expect(updateRewardValue(store as any, 'QUEST_XP_E', 12)).resolves.toBeDefined();
    expect(store.rewardConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'QUEST_XP_E' }, update: expect.objectContaining({ value: 12 }) })
    );
  });

  it('covers every rank in REWARD_KEYS', () => {
    expect(REWARD_KEYS).toHaveLength(12);
    for (const rank of ['E', 'D', 'C', 'B', 'A', 'S']) {
      expect(REWARD_KEYS).toContain(`QUEST_XP_${rank}`);
      expect(REWARD_KEYS).toContain(`QUEST_GOLD_${rank}`);
    }
  });
});

// ============================================================
// Reconciliation
// ============================================================

const makePrisma = (overrides: Partial<Record<string, any>> = {}) => ({
  economyLedger: {
    count: jest.fn(async () => 10),
    groupBy: jest.fn(async () => []),
    createMany: jest.fn(async () => ({ count: 0 })),
  },
  hunterStats: {
    findMany: jest.fn(async () => []),
  },
  reconciliationState: {
    create: jest.fn(async (args: any) => args.data),
    findFirst: jest.fn(async () => null),
    count: jest.fn(async () => 0),
  },
  ...overrides,
});

describe('runReconciliation', () => {
  it('captures a baseline when the ledger is empty (first run)', async () => {
    const prisma = makePrisma({
      economyLedger: {
        count: jest.fn(async () => 0),
        groupBy: jest.fn(),
        createMany: jest.fn(async ({ data }: any) => ({ count: data.length })),
      },
      hunterStats: {
        findMany: jest.fn(async () => [
          { userId: 'u1', exp: 500, gold: 120 },
          { userId: 'u2', exp: 0, gold: 0 },
        ]),
      },
    });

    const result = await runReconciliation(prisma as any, { triggeredBy: 'first-run' });

    expect(result.isBaseline).toBe(true);
    expect(result.usersChecked).toBe(2);
    expect(result.usersWithDrift).toBe(0);
    // Only the user with non-zero balances gets an ADJUSTMENT row
    expect(prisma.economyLedger.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ userId: 'u1', xpDelta: 500, goldDelta: 120 })],
    });
  });

  it('flags drift when balances exceed ledger sums', async () => {
    const prisma = makePrisma({
      hunterStats: {
        findMany: jest.fn(async () => [
          { userId: 'clean-user', exp: 100, gold: 50 },
          { userId: 'drifty-user', exp: 1000, gold: 0 },
        ]),
      },
      economyLedger: {
        count: jest.fn(async () => 5),
        groupBy: jest.fn(async () => [
          { userId: 'clean-user', _sum: { xpDelta: 100, goldDelta: 50 } },
          { userId: 'drifty-user', _sum: { xpDelta: 300, goldDelta: 0 } },
        ]),
        createMany: jest.fn(),
      },
    });

    const result = await runReconciliation(prisma as any, { triggeredBy: 'admin' });

    expect(result.isBaseline).toBe(false);
    expect(result.usersChecked).toBe(2);
    expect(result.usersWithDrift).toBe(1);
    expect(result.drift[0].userId).toBe('drifty-user');
    expect(result.drift[0].driftXp).toBe(700);
    expect(result.maxDriftXp).toBe(700);
    // Run is persisted
    expect(prisma.reconciliationState.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ usersWithDrift: 1, triggeredBy: 'admin' }),
    });
  });

  it('reports clean when all users match the ledger', async () => {
    const prisma = makePrisma({
      hunterStats: {
        findMany: jest.fn(async () => [{ userId: 'u1', exp: 42, gold: 7 }]),
      },
      economyLedger: {
        count: jest.fn(async () => 3),
        groupBy: jest.fn(async () => [{ userId: 'u1', _sum: { xpDelta: 42, goldDelta: 7 } }]),
        createMany: jest.fn(),
      },
    });

    const result = await runReconciliation(prisma as any, { triggeredBy: 'scheduled' });

    expect(result.usersWithDrift).toBe(0);
    expect(result.drift).toHaveLength(0);
  });

  it('treats users missing from the ledger as zero-sum', async () => {
    const prisma = makePrisma({
      hunterStats: {
        findMany: jest.fn(async () => [{ userId: 'no-ledger', exp: 10, gold: 10 }]),
      },
      economyLedger: {
        count: jest.fn(async () => 3),
        groupBy: jest.fn(async () => []),
        createMany: jest.fn(),
      },
    });

    const result = await runReconciliation(prisma as any, { triggeredBy: 'scheduled' });

    expect(result.usersWithDrift).toBe(1);
    expect(result.drift[0].ledgerXp).toBe(0);
    expect(result.drift[0].ledgerGold).toBe(0);
  });
});
