import { Queue, Worker, Job } from 'bullmq';
import logger from './logger';

// ============================================================
// Background job queue (report fixes #7/#321–#340)
// ============================================================
// BullMQ over the existing Redis instance (v6 job-scheduler API).
// When Redis is not configured (local dev, REDIS_URL unset) the
// scheduler falls back to in-process timers so dev still gets
// reconciliation and cleanup runs — matching the rate-limiter and
// cache fallback conventions used elsewhere in this codebase.

export const JOB_NAMES = {
  RECONCILE: 'economy:reconcile',
  CLEANUP: 'maintenance:cleanup',
} as const;

export interface QueueDeps {
  /** Runs the economy reconciliation (report #103) */
  runReconciliation: (triggeredBy: 'scheduled') => Promise<{ usersWithDrift: number; usersChecked: number }>;
  /** Deletes expired notifications; returns rows deleted */
  cleanupExpiredNotifications: () => Promise<number>;
}

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 30_000;
const LOCK_KEY = 'jobs:leader';
const LOCK_TTL_SECONDS = 90;

let reconcileQueue: Queue | null = null;
let cleanupQueue: Queue | null = null;
let reconcileWorker: Worker | null = null;
let cleanupWorker: Worker | null = null;
let fallbackTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;

const connection = () => ({ host: '127.0.0.1', port: 6379, ...(parseRedisUrl()) });

function parseRedisUrl(): { host?: string; port?: number; password?: string } {
  try {
    const url = new URL(process.env.REDIS_URL || '');
    return {
      host: url.hostname || undefined,
      port: url.port ? parseInt(url.port, 10) : undefined,
      password: url.password || undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Distributed leader lock (report fix #330): only one replica registers
 * the repeatable job schedules, so N instances don't enqueue N copies.
 * Uses a BullMQ queue's underlying Redis client with SET NX semantics.
 */
async function acquireLeadership(): Promise<boolean> {
  if (!reconcileQueue) return true; // fallback mode: single process
  try {
    const client = await (reconcileQueue as any).client;
    const holder = `${process.pid}-${Date.now()}`;
    const got = await client.set(LOCK_KEY, holder, 'EX', LOCK_TTL_SECONDS, 'NX');
    if (got === 'OK') {
      (global as any).__jobLeaderToken = holder;
      return true;
    }
    // Refresh if we already hold it
    const current = await client.get(LOCK_KEY);
    return current === (global as any).__jobLeaderToken;
  } catch (error) {
    logger.warn('Leader lock check failed; assuming leader:', error);
    return true;
  }
}

async function runCleanupJob(deps: QueueDeps): Promise<number> {
  const deleted = await deps.cleanupExpiredNotifications();
  logger.info(`Cleanup job: deleted ${deleted} expired notifications`);
  return deleted;
}

/**
 * Initialize the job system. Redis mode registers scheduled jobs via
 * upsertJobScheduler (idempotent across restarts); no-Redis mode runs
 * the same jobs on in-process intervals.
 */
export async function initJobs(deps: QueueDeps): Promise<void> {
  if (initialized) return;
  initialized = true;

  const hasRedis = !!process.env.REDIS_URL;

  if (!hasRedis) {
    logger.info('REDIS_URL not set: jobs running in in-process fallback mode');
    startFallbackLoop(deps);
    return;
  }

  try {
    reconcileQueue = new Queue(JOB_NAMES.RECONCILE, { connection: connection() as any });
    cleanupQueue = new Queue(JOB_NAMES.CLEANUP, { connection: connection() as any });

    // Workers: concurrency 1 — economy jobs must not run concurrently
    reconcileWorker = new Worker(
      JOB_NAMES.RECONCILE,
      async (job: Job) => {
        logger.info(`Reconcile job ${job.id} starting (attempt ${job.attemptsMade + 1})`);
        return deps.runReconciliation('scheduled');
      },
      { connection: connection() as any, concurrency: 1 }
    );
    reconcileWorker.on('failed', (job, err) => {
      logger.error(`Reconcile job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err);
    });

    cleanupWorker = new Worker(
      JOB_NAMES.CLEANUP,
      async (job: Job) => runCleanupJob(deps),
      { connection: connection() as any, concurrency: 1 }
    );
    cleanupWorker.on('failed', (job, err) => {
      logger.error(`Cleanup job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err);
    });

    // Register schedules — guarded by leader lock (fix #330).
    // upsertJobScheduler is idempotent: safe to re-run every boot.
    if (await acquireLeadership()) {
      await reconcileQueue.upsertJobScheduler(
        'hourly-reconcile',
        { pattern: '0 * * * *' }, // hourly, UTC (documented, fix #329)
        {
          name: JOB_NAMES.RECONCILE,
          opts: {
            attempts: MAX_ATTEMPTS,
            backoff: { type: 'exponential', delay: BACKOFF_MS },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        }
      );
      await cleanupQueue.upsertJobScheduler(
        'daily-cleanup',
        { pattern: '15 3 * * *' }, // 03:15 UTC daily
        {
          name: JOB_NAMES.CLEANUP,
          opts: {
            attempts: MAX_ATTEMPTS,
            backoff: { type: 'exponential', delay: BACKOFF_MS },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        }
      );
      logger.info('Job schedules registered (reconcile hourly, cleanup 03:15 UTC)');
    } else {
      logger.info('Another instance holds the job leader lock; skipping schedule registration');
    }

    // Backlog alerting (fix #334): warn when queues look unhealthy
    setInterval(async () => {
      try {
        for (const [name, q] of [['reconcile', reconcileQueue], ['cleanup', cleanupQueue]] as const) {
          if (!q) continue;
          const counts = await q.getJobCounts('waiting', 'failed');
          if (counts.waiting > 10 || counts.failed > 20) {
            logger.warn(`Job queue backlog alert [${name}]: waiting=${counts.waiting} failed=${counts.failed}`);
          }
        }
      } catch {
        // monitoring must never crash the server
      }
    }, 60_000).unref();
  } catch (error) {
    logger.error('BullMQ init failed, falling back to in-process job loop:', error);
    startFallbackLoop(deps);
  }
}

const RECONCILE_INTERVAL_MS = 60 * 60 * 1000; // hourly
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily

function startFallbackLoop(deps: QueueDeps): void {
  let lastReconcile = 0;
  let lastCleanup = 0;
  fallbackTimer = setInterval(async () => {
    const now = Date.now();
    try {
      if (now - lastReconcile >= RECONCILE_INTERVAL_MS) {
        lastReconcile = now;
        await deps.runReconciliation('scheduled');
      }
      if (now - lastCleanup >= CLEANUP_INTERVAL_MS) {
        lastCleanup = now;
        await runCleanupJob(deps);
      }
    } catch (error) {
      logger.error('Fallback job loop error:', error);
    }
  }, 60_000);
  // Don't hold the process open just for the fallback loop
  fallbackTimer.unref?.();
}

/** Queue an immediate reconciliation run (admin trigger). Returns false when no Redis queue is active. */
export async function queueImmediateReconcile(): Promise<boolean> {
  if (reconcileQueue) {
    await reconcileQueue.add(
      JOB_NAMES.RECONCILE,
      {},
      { priority: 1, attempts: MAX_ATTEMPTS, backoff: { type: 'exponential', delay: BACKOFF_MS } }
    );
    return true;
  }
  return false; // caller runs inline in fallback mode
}

/**
 * Graceful drain (fix #337): stop accepting new jobs and wait for
 * in-flight jobs to finish before the process exits.
 */
export async function closeJobs(): Promise<void> {
  if (fallbackTimer) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
  const workers = [reconcileWorker, cleanupWorker].filter(Boolean) as Worker[];
  const queues = [reconcileQueue, cleanupQueue].filter(Boolean) as Queue[];

  await Promise.allSettled([
    ...workers.map(w => w.close()),
    ...queues.map(q => q.close()),
  ]);

  reconcileQueue = null;
  cleanupQueue = null;
  reconcileWorker = null;
  cleanupWorker = null;
  initialized = false;
  logger.info('Job queue drained and closed');
}
