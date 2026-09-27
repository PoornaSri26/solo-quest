import { PrismaClient } from '@prisma/client';
import logger from './logger';
import { setGauge, incrementCounter } from './economy';

// ============================================================
// Economy reconciliation (report fixes #103/#112)
// ============================================================
// Recomputes each user's XP/gold from the EconomyLedger and
// compares against the cached denormalized balances in
// HunterStats. Drift beyond tolerance is recorded, exported as
// metrics, and flagged for investigation. Run 1 performs a
// baseline capture (no drift is reported) since pre-ledger
// balances have no ledger history to sum against.

/**
 * Ledger reasons that were in place from the start of ledger
 * bookkeeping. Kept explicit so future reasons can be excluded
 * from reconciliation (e.g. cosmetic entries) if ever needed.
 */
const COUNTED_REASONS = [
  'QUEST_COMPLETED',
  'TIERED_COMPLETION',
  'SHOP_PURCHASE',
  'STREAK_WARD',
  'MILESTONE_REWARD',
  'MASTERY_REWARD',
  'QUEST_PACK_PURCHASE',
  'DUNGEON_REWARD',
  'ADJUSTMENT',
] as const;

export interface DriftDetail {
  userId: string;
  xpBalance: number;
  ledgerXp: number;
  driftXp: number;
  goldBalance: number;
  ledgerGold: number;
  driftGold: number;
}

export interface ReconciliationResult {
  runAt: string;
  usersChecked: number;
  usersWithDrift: number;
  maxDriftXp: number;
  maxDriftGold: number;
  isBaseline: boolean;
  durationMs: number;
  drift: DriftDetail[];
}

const DRIFT_TOLERANCE = 0; // any drift is flagged; tolerance can be raised if float rounding ever becomes an issue

export async function runReconciliation(
  prisma: PrismaClient,
  options: { triggeredBy: 'scheduled' | 'admin' | 'first-run'; maxUsers?: number } = { triggeredBy: 'scheduled' }
): Promise<ReconciliationResult> {
  const startedAt = Date.now();

  // Baseline detection: if no ledger rows exist yet, this is the first
  // run against pre-ledger data. Record current balances as trusted and
  // seed ledger ADJUSTMENT rows so future runs can detect drift.
  const ledgerCount = await prisma.economyLedger.count();

  if (ledgerCount === 0) {
    return captureBaseline(prisma, options.triggeredBy, startedAt);
  }

  const maxUsers = options.maxUsers ?? 0; // 0 = all users

  const users = await prisma.hunterStats.findMany({
    select: { userId: true, exp: true, gold: true },
    ...(maxUsers > 0 ? { take: maxUsers } : {}),
  });

  // Aggregate ledger sums per user via groupBy (single query)
  const ledgerSums = await prisma.economyLedger.groupBy({
    by: ['userId'],
    where: { reason: { in: [...COUNTED_REASONS] } },
    _sum: { xpDelta: true, goldDelta: true },
  });

  const sumsByUser = new Map(
    ledgerSums.map(s => [s.userId, { xp: s._sum.xpDelta ?? 0, gold: s._sum.goldDelta ?? 0 }])
  );

  const drift: DriftDetail[] = [];
  let maxDriftXp = 0;
  let maxDriftGold = 0;

  for (const user of users) {
    const sums = sumsByUser.get(user.userId) ?? { xp: 0, gold: 0 };
    const driftXp = user.exp - sums.xp;
    const driftGold = user.gold - sums.gold;

    if (
      Math.abs(driftXp) > DRIFT_TOLERANCE ||
      Math.abs(driftGold) > DRIFT_TOLERANCE
    ) {
      drift.push({
        userId: user.userId,
        xpBalance: user.exp,
        ledgerXp: sums.xp,
        driftXp,
        goldBalance: user.gold,
        ledgerGold: sums.gold,
        driftGold,
      });
      if (Math.abs(driftXp) > Math.abs(maxDriftXp)) maxDriftXp = driftXp;
      if (Math.abs(driftGold) > Math.abs(maxDriftGold)) maxDriftGold = driftGold;
    }
  }

  const durationMs = Date.now() - startedAt;
  const result: ReconciliationResult = {
    runAt: new Date().toISOString(),
    usersChecked: users.length,
    usersWithDrift: drift.length,
    maxDriftXp,
    maxDriftGold,
    isBaseline: false,
    durationMs,
    drift: drift.slice(0, 100), // cap details payload
  };

  await prisma.reconciliationState.create({
    data: {
      usersChecked: users.length,
      usersWithDrift: drift.length,
      maxDriftXp,
      maxDriftGold,
      details: JSON.stringify(result.drift),
      triggeredBy: options.triggeredBy,
      durationMs,
    },
  });

  // Metrics for /metrics (report fix #136: same observability stack)
  setGauge('soloquest_reconciliation_users_checked', 'Users checked in last reconciliation run', [], [], users.length);
  setGauge('soloquest_reconciliation_users_with_drift', 'Users with economy drift in last run', [], [], drift.length);
  setGauge('soloquest_reconciliation_max_drift_xp', 'Max XP drift in last run', [], [], Math.abs(maxDriftXp));
  setGauge('soloquest_reconciliation_max_drift_gold', 'Max gold drift in last run', [], [], Math.abs(maxDriftGold));
  incrementCounter('soloquest_reconciliation_runs_total', 'Reconciliation runs', ['triggered_by', 'outcome'], [
    options.triggeredBy,
    drift.length > 0 ? 'drift_detected' : 'clean',
  ]);

  if (drift.length > 0) {
    // Report fix #112: drift is a security-relevant event — log at warn
    // so log-based alerting can pick it up.
    logger.warn('ECONOMY DRIFT DETECTED', {
      usersWithDrift: drift.length,
      maxDriftXp,
      maxDriftGold,
      sample: drift.slice(0, 5),
      triggeredBy: options.triggeredBy,
    });
  } else {
    logger.info(`Economy reconciliation clean: ${users.length} users, ${durationMs}ms`);
  }

  return result;
}

/**
 * First run against pre-ledger data: trust current balances, seed one
 * ADJUSTMENT ledger row per user so the ledger's running totals match
 * the balances exactly. All future drift is then real drift.
 */
async function captureBaseline(
  prisma: PrismaClient,
  triggeredBy: 'scheduled' | 'admin' | 'first-run',
  startedAt: number
): Promise<ReconciliationResult> {
  const stats = await prisma.hunterStats.findMany({
    select: { userId: true, exp: true, gold: true },
  });

  await prisma.economyLedger.createMany({
    data: stats
      .filter(s => s.exp !== 0 || s.gold !== 0)
      .map(s => ({
        userId: s.userId,
        reason: 'ADJUSTMENT',
        xpDelta: s.exp,
        goldDelta: s.gold,
        description: 'Baseline capture: pre-ledger balance imported at reconciliation start',
        rewardTableVersion: 1,
      })),
  });

  const durationMs = Date.now() - startedAt;
  await prisma.reconciliationState.create({
    data: {
      usersChecked: stats.length,
      usersWithDrift: 0,
      maxDriftXp: 0,
      maxDriftGold: 0,
      details: JSON.stringify([]),
      triggeredBy,
      durationMs,
    },
  });

  incrementCounter('soloquest_reconciliation_runs_total', 'Reconciliation runs', ['triggered_by', 'outcome'], [
    triggeredBy,
    'baseline_captured',
  ]);
  logger.info(`Economy baseline captured: ${stats.length} users seeded into ledger`);

  return {
    runAt: new Date().toISOString(),
    usersChecked: stats.length,
    usersWithDrift: 0,
    maxDriftXp: 0,
    maxDriftGold: 0,
    isBaseline: true,
    durationMs,
    drift: [],
  };
}

/**
 * Latest reconciliation summary for the admin dashboard.
 */
export async function getReconciliationStatus(prisma: PrismaClient) {
  const [latest, driftRuns] = await Promise.all([
    prisma.reconciliationState.findFirst({ orderBy: { runAt: 'desc' } }),
    prisma.reconciliationState.count({ where: { usersWithDrift: { gt: 0 } } }),
  ]);
  return { latest, totalRuns: await prisma.reconciliationState.count(), driftRuns };
}
