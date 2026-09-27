import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import logger from './logger';
import { env } from './env';

// ============================================================
// SOLO QUEST — Economy integrity & observability module
// ============================================================
// Implements the report's highest-leverage backend fixes:
//  1. Versioned reward tables (auditable game balance)
//  2. Transaction ledger for gold/XP (auditable economy)
//  3. JWT token revocation (Redis blocklist + memory fallback)
//  4. Idempotency keys for reward-granting endpoints
//  5. Lightweight metrics registry (Prometheus text format)
// ============================================================

// ------------------------------------------------------------
// 1. Reward tables — DB-backed (report fix #86) with in-code
//    defaults as seed values and fallback if the DB is unavailable.
// ------------------------------------------------------------
export const DEFAULT_XP_BY_RANK: Record<string, number> = {
  E: 10, D: 25, C: 50, B: 100, A: 200, S: 500,
};

export const DEFAULT_GOLD_BY_RANK: Record<string, number> = {
  E: 5, D: 10, C: 20, B: 40, A: 80, S: 200,
};

export const REWARD_KEYS: string[] = [
  ...Object.keys(DEFAULT_XP_BY_RANK).map(r => `QUEST_XP_${r}`),
  ...Object.keys(DEFAULT_GOLD_BY_RANK).map(r => `QUEST_GOLD_${r}`),
];

/**
 * Live reward table. `loadRewardTable()` populates this from the DB
 * (seeding defaults on first run); until then calls fall back to the
 * in-code defaults so the server never fails to reward.
 */
const rewardTable: { xp: Record<string, number>; gold: Record<string, number>; version: number; source: 'defaults' | 'database' } = {
  xp: { ...DEFAULT_XP_BY_RANK },
  gold: { ...DEFAULT_GOLD_BY_RANK },
  version: 1,
  source: 'defaults',
};

export const getRewardTableVersion = (): number => rewardTable.version;
export const getRewardTableSource = (): 'defaults' | 'database' => rewardTable.source;

export const getXpForRank = (rank: string): number => rewardTable.xp[rank] ?? DEFAULT_XP_BY_RANK[rank] ?? 10;
export const getGoldForRank = (rank: string): number => rewardTable.gold[rank] ?? DEFAULT_GOLD_BY_RANK[rank] ?? 5;

// Back-compat aliases for existing call sites in index.ts
export const BASE_XP_BY_RANK: Record<string, number> = new Proxy(rewardTable.xp, {
  get: (target, prop: string) => target[prop] ?? DEFAULT_XP_BY_RANK[prop],
});
export const BASE_GOLD_BY_RANK: Record<string, number> = new Proxy(rewardTable.gold, {
  get: (target, prop: string) => target[prop] ?? DEFAULT_GOLD_BY_RANK[prop],
});

interface RewardConfigStore {
  rewardConfig: {
    findMany: (args?: any) => Promise<Array<{ key: string; value: number; version: number }>>;
    findUnique: (args: any) => Promise<{ key: string; value: number; version: number } | null>;
    upsert: (args: any) => Promise<unknown>;
    update: (args: any) => Promise<{ version: number }>;
  };
  $transaction?: (fn: any) => Promise<any>;
}

/**
 * Load the reward table from the DB, seeding defaults if empty.
 * Falls back silently to in-code defaults if the store is unavailable
 * (test environments, DB down) — economy must never hard-fail on config.
 */
export async function loadRewardTable(store: RewardConfigStore): Promise<void> {
  try {
    const rows = await store.rewardConfig.findMany();
    if (rows.length === 0) {
      // First boot: seed defaults
      for (const [rank, value] of Object.entries(DEFAULT_XP_BY_RANK)) {
        await store.rewardConfig.upsert({
          where: { key: `QUEST_XP_${rank}` },
          update: {},
          create: { key: `QUEST_XP_${rank}`, value, version: 1 },
        });
      }
      for (const [rank, value] of Object.entries(DEFAULT_GOLD_BY_RANK)) {
        await store.rewardConfig.upsert({
          where: { key: `QUEST_GOLD_${rank}` },
          update: {},
          create: { key: `QUEST_GOLD_${rank}`, value, version: 1 },
        });
      }
      rewardTable.xp = { ...DEFAULT_XP_BY_RANK };
      rewardTable.gold = { ...DEFAULT_GOLD_BY_RANK };
      rewardTable.version = 1;
      rewardTable.source = 'database';
      logger.info('Reward table seeded into database (defaults)');
      return;
    }

    const xp: Record<string, number> = { ...DEFAULT_XP_BY_RANK };
    const gold: Record<string, number> = { ...DEFAULT_GOLD_BY_RANK };
    let version = 1;
    for (const row of rows) {
      if (row.key.startsWith('QUEST_XP_')) {
        xp[row.key.slice('QUEST_XP_'.length)] = row.value;
      } else if (row.key.startsWith('QUEST_GOLD_')) {
        gold[row.key.slice('QUEST_GOLD_'.length)] = row.value;
      }
      if (row.version > version) version = row.version;
    }
    rewardTable.xp = xp;
    rewardTable.gold = gold;
    rewardTable.version = version;
    rewardTable.source = 'database';
    logger.info(`Reward table loaded from database (v${version}, ${rows.length} keys)`);
  } catch (error) {
    logger.warn('Reward table load failed, using in-code defaults:', error);
  }
}

/**
 * Update one reward value. Bumps the shared version so ledger rows
 * written after this change are traceable to the new table.
 * Returns the new version.
 */
export async function updateRewardValue(
  store: RewardConfigStore,
  key: string,
  value: number,
  updatedBy?: string
): Promise<number> {
  if (!REWARD_KEYS.includes(key)) {
    throw new Error(`Unknown reward key: ${key}. Valid keys: ${REWARD_KEYS.join(', ')}`);
  }
  if (!Number.isInteger(value) || value < 0 || value > 1_000_000) {
    throw new Error('Reward value must be a non-negative integer <= 1,000,000');
  }
  const updated = await store.rewardConfig.upsert({
    where: { key },
    update: { value, updatedBy },
    create: { key, value, updatedBy },
  });
  await store.rewardConfig.update({
    where: { key },
    data: { version: { increment: 1 } },
  });
  // Reload the whole table so the in-memory copy stays consistent
  await loadRewardTable(store);
  return (updated as { version: number }).version + 1;
}

// ------------------------------------------------------------
// 2. Metrics registry (Prometheus text format)
// ------------------------------------------------------------
type MetricType = 'counter' | 'gauge';

interface MetricDefinition {
  type: MetricType;
  help: string;
  /** label key order for deterministic output */
  labelNames: string[];
  /** values keyed by sorted label values joined with \u0000 */
  values: Map<string, number>;
}

const metrics = new Map<string, MetricDefinition>();

function getOrCreateMetric(
  name: string,
  type: MetricType,
  help: string,
  labelNames: string[]
): MetricDefinition {
  let metric = metrics.get(name);
  if (!metric) {
    metric = { type, help, labelNames, values: new Map() };
    metrics.set(name, metric);
  }
  return metric;
}

const labelKey = (labelValues: (string | undefined)[]): string =>
  labelValues.map(v => v ?? '').join('\u0000');

export function incrementCounter(
  name: string,
  help: string,
  labelNames: string[],
  labelValues: (string | undefined)[],
  amount = 1
): void {
  const metric = getOrCreateMetric(name, 'counter', help, labelNames);
  const key = labelKey(labelValues);
  metric.values.set(key, (metric.values.get(key) ?? 0) + amount);
}

export function setGauge(
  name: string,
  help: string,
  labelNames: string[],
  labelValues: (string | undefined)[],
  value: number
): void {
  const metric = getOrCreateMetric(name, 'gauge', help, labelNames);
  metric.values.set(labelKey(labelValues), value);
}

/**
 * Render all metrics in Prometheus text exposition format (v0.0.4).
 * Labels are emitted in the order given at first registration.
 */
export function renderMetrics(): string {
  const lines: string[] = [];
  for (const [name, metric] of metrics) {
    lines.push(`# HELP ${name} ${metric.help}`);
    lines.push(`# TYPE ${name} ${metric.type}`);
    for (const [key, value] of metric.values) {
      if (metric.labelNames.length > 0) {
        const vals = key.split('\u0000');
        const rendered = metric.labelNames
          .map((ln, i) => `${ln}="${escapeLabelValue(vals[i] ?? '')}"`)
          .join(',');
        lines.push(`${name}{${rendered}} ${value}`);
      } else {
        lines.push(`${name} ${value}`);
      }
    }
  }
  return lines.join('\n') + '\n';
}

const escapeLabelValue = (v: string): string =>
  v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

/** Reset all metrics (used by tests). */
export function resetMetrics(): void {
  metrics.clear();
}

// ------------------------------------------------------------
// 3. JWT token revocation (jti-based blocklist)
// ------------------------------------------------------------
// Tokens carry a jti (JWT ID). Logout revokes the current token's
// jti; account deletion revokes all tokens issued before now for
// the user (iat-based cutoff). Redis when available, in-memory
// fallback otherwise (matches rateLimiter.ts conventions).
const REVOKED_JTI_PREFIX = 'revoked_jti:';
const REVOKED_USER_PREFIX = 'revoked_user:';

// Lazy-imported Redis client (avoids circular dependency with rateLimiter)
const getRedis = (): any | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./rateLimiter') as typeof import('./rateLimiter');
    return mod.getRedisClient();
  } catch {
    return null;
  }
};

// In-memory fallbacks (per-instance only — acceptable degradation,
// same tradeoff as the rate limiter's memory fallback)
const revokedJtiMemory = new Map<string, number>(); // jti -> expiresAt ms
const revokedUserCutoffs = new Map<string, { cutoff: number; expiresAt: number }>(); // userId -> iat cutoff (s)

const TTL_JTI = 8 * 24 * 60 * 60; // 8 days: > 7-day token lifetime
const TTL_USER_REVOCATION = 8 * 24 * 60 * 60;

export const getTokenTtlSeconds = (): number => 7 * 24 * 60 * 60; // 7d

const signJwt = (payload: object, options: jwt.SignOptions): string =>
  jwt.sign(payload, env.JWT_SECRET, options);

/** Mint a token with a jti so it can be revoked later. */
export function signToken(userId: string, role: string): string {
  return signJwt(
    { userId, role },
    { expiresIn: getTokenTtlSeconds(), jwtid: randomUUID().replace(/-/g, '') }
  );
}

const memSet = (map: Map<string, number>, key: string, ttlSec: number): void => {
  map.set(key, Date.now() + ttlSec * 1000);
  // Opportunistic cleanup to keep the fallback map bounded
  if (map.size > 10_000) {
    const now = Date.now();
    for (const [k, exp] of map) {
      if (exp <= now) map.delete(k);
    }
  }
};

export async function revokeTokenJti(jti: string): Promise<void> {
  try {
    const redis = getRedis();
    if (redis?.isOpen) {
      await redis.setEx(`${REVOKED_JTI_PREFIX}${jti}`, TTL_JTI, '1');
      return;
    }
  } catch (error) {
    logger.error('JTI revocation via Redis failed:', error);
  }
  memSet(revokedJtiMemory, jti, TTL_JTI);
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  // +1s so tokens minted in the same second as the revocation (iat ===
  // Math.floor(now)) are also dead — account deletion must fail closed.
  const cutoff = Math.floor(Date.now() / 1000) + 1;
  try {
    const redis = getRedis();
    if (redis?.isOpen) {
      await redis.setEx(`${REVOKED_USER_PREFIX}${userId}`, TTL_USER_REVOCATION, String(cutoff));
      return;
    }
  } catch (error) {
    logger.error('User revocation via Redis failed:', error);
  }
  revokedUserCutoffs.set(userId, { cutoff, expiresAt: Date.now() + TTL_USER_REVOCATION * 1000 });
}

export async function isTokenRevoked(jti: string | undefined, userId: string, iat: number | undefined): Promise<boolean> {
  const redis = getRedis();

  // 1. Per-token revocation
  if (jti) {
    try {
      if (redis?.isOpen) {
        const flagged = await redis.get(`${REVOKED_JTI_PREFIX}${jti}`);
        if (flagged) return true;
      } else if (revokedJtiMemory.has(jti)) {
        return true;
      }
    } catch (error) {
      logger.error('JTI revocation check failed:', error);
    }
  }

  // 2. Per-user cutoff revocation ("logout everywhere")
  try {
    if (redis?.isOpen) {
      const cutoffStr = await redis.get(`${REVOKED_USER_PREFIX}${userId}`);
      if (cutoffStr && iat !== undefined) {
        return iat < parseInt(cutoffStr, 10);
      }
      return false;
    }
  } catch (error) {
    logger.error('User revocation check failed:', error);
  }

  const entry = revokedUserCutoffs.get(userId);
  if (entry) {
    if (entry.expiresAt <= Date.now()) {
      revokedUserCutoffs.delete(userId);
      return false;
    }
    return iat !== undefined && iat < entry.cutoff;
  }
  return false;
}

// ------------------------------------------------------------
// 4. Idempotency-key store
// ------------------------------------------------------------
// Clients send Idempotency-Key on reward-granting POSTs. The first
// request under a key is processed; repeats within the TTL replay
// the recorded response instead of re-applying effects.
const IDEMPOTENCY_PREFIX = 'idempotency:';
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24h

const idempotencyMemory = new Map<string, { responseJson: string; statusCode: number; expiresAt: number }>();

export async function getIdempotentResponse(
  userId: string,
  key: string
): Promise<{ responseJson: string; statusCode: number } | null> {
  const redisKey = `${IDEMPOTENCY_PREFIX}${userId}:${key}`;
  try {
    const redis = getRedis();
    if (redis?.isOpen) {
      const raw = await redis.get(redisKey);
      if (raw) {
        return JSON.parse(raw);
      }
      return null;
    }
  } catch (error) {
    logger.error('Idempotency lookup failed:', error);
  }
  const entry = idempotencyMemory.get(redisKey);
  if (entry && entry.expiresAt > Date.now()) {
    return { responseJson: entry.responseJson, statusCode: entry.statusCode };
  }
  return null;
}

export async function saveIdempotentResponse(
  userId: string,
  key: string,
  statusCode: number,
  responseJson: string
): Promise<void> {
  const redisKey = `${IDEMPOTENCY_PREFIX}${userId}:${key}`;
  try {
    const redis = getRedis();
    if (redis?.isOpen) {
      await redis.setEx(redisKey, IDEMPOTENCY_TTL, JSON.stringify({ responseJson, statusCode }));
      return;
    }
  } catch (error) {
    logger.error('Idempotency save failed:', error);
  }
  idempotencyMemory.set(redisKey, {
    responseJson,
    statusCode,
    expiresAt: Date.now() + IDEMPOTENCY_TTL * 1000,
  });
}

// ------------------------------------------------------------
// 5. Transaction ledger recorder
// ------------------------------------------------------------
export type LedgerReason =
  | 'QUEST_COMPLETED'
  | 'QUEST_PENALTY'
  | 'SHOP_PURCHASE'
  | 'STREAK_WARD'
  | 'MILESTONE_REWARD'
  | 'MASTERY_REWARD'
  | 'QUEST_PACK_PURCHASE'
  | 'TIERED_COMPLETION'
  | 'DUNGEON_REWARD'
  | 'ADJUSTMENT';

export interface LedgerEntryInput {
  userId: string;
  reason: LedgerReason;
  xpDelta?: number;
  goldDelta?: number;
  description: string;
  referenceType?: string;
  referenceId?: string;
  rewardTableVersion?: number;
}

type TxClient = { economyLedger: { create: (args: any) => Promise<any> } };

/**
 * Record an economy ledger row. Call inside the same prisma.$transaction
 * as the balance mutation so the ledger is exactly as durable as the
 * balance change it describes.
 */
export async function recordLedgerEntry(tx: TxClient, entry: LedgerEntryInput): Promise<void> {
  await tx.economyLedger.create({
    data: {
      userId: entry.userId,
      reason: entry.reason,
      xpDelta: entry.xpDelta ?? 0,
      goldDelta: entry.goldDelta ?? 0,
      description: entry.description,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      rewardTableVersion: entry.rewardTableVersion ?? getRewardTableVersion(),
    },
  });
}

// ------------------------------------------------------------
// 6. Economy metrics helpers
// ------------------------------------------------------------
export function recordEconomyChange(
  endpoint: string,
  xpDelta: number,
  goldDelta: number
): void {
  incrementCounter(
    'soloquest_economy_gold_total',
    'Total gold granted (negative for spends)',
    ['endpoint'],
    [endpoint],
    Math.max(0, goldDelta)
  );
  incrementCounter(
    'soloquest_economy_gold_spent_total',
    'Total gold spent',
    ['endpoint'],
    [endpoint],
    Math.max(0, -goldDelta)
  );
  incrementCounter(
    'soloquest_economy_xp_total',
    'Total XP granted',
    ['endpoint'],
    [endpoint],
    Math.max(0, xpDelta)
  );
}
