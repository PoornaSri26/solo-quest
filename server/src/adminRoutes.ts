/**
 * Superadmin API routes
 * All endpoints require the caller to have role === 'SUPERADMIN' (enforced by requireSuperadmin).
 *
 * Provides full platform control:
 *  - Platform overview stats (users, revenue, subscriptions, activity)
 *  - User management (list, view, promote, demote, disable, delete)
 *  - Payment & revenue stats
 *  - Subscription expiry monitoring
 *  - Recent activity feed
 *  - Analytics funnel / retention overview
 */
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import logger from './logger';
import { env } from './env';
import { updateRewardValue } from './economy';
import { runReconciliation, getReconciliationStatus } from './reconciliation';

const prisma = new PrismaClient();
const router = Router();

// ========================
// Auth helpers (mirror index.ts conventions)
// ========================

interface AuthedUser {
  userId: string;
  role?: string;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  return authHeader ? authHeader.split(' ')[1] : null;
}

function getAuthedUser(req: Request): AuthedUser | null {
  const token = extractToken(req);
  if (!token) return null;
  try {
    // Algorithm pinned to HS256 (algorithm-confusion hardening, review #8)
    return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as AuthedUser;
  } catch {
    return null;
  }
}

/**
 * Middleware: require a valid JWT belonging to a SUPERADMIN user.
 * Verifies the role against the database so revoked admins lose access immediately.
 */
export const requireSuperadmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = getAuthedUser(req);
    if (!user?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, deletedAt: true },
    });

    if (!dbUser || dbUser.deletedAt) {
      return res.status(401).json({ error: 'Account not found or deleted' });
    }

    if (dbUser.role !== 'SUPERADMIN') {
      logger.warn('Superadmin access denied', { userId: user.userId, path: req.path });
      return res.status(403).json({ error: 'Superadmin access required' });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    logger.error('Superadmin middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

router.use(requireSuperadmin);

// ========================
// Overview / Dashboard stats
// ========================

/**
 * GET /api/admin/overview
 * Aggregated platform stats for the superadmin dashboard.
 */
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      newUsers24h,
      newUsers7d,
      deletedUsers,
      totalQuests,
      completedQuests,
      failedQuests,
      activeQuests,
      totalGates,
      totalDungeons,
      totalPayments,
      completedPayments,
      failedPayments,
      revenueAgg,
      revenue30dAgg,
      subscriptionPlanGroups,
      subscriptionStatusGroups,
      paymentMethodGroups,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.hunterStats.count({ where: { lastActiveDate: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: dayAgo }, deletedAt: null } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo }, deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: { not: null } } }),
      prisma.quest.count({ where: { deletedAt: null } }),
      prisma.quest.count({ where: { status: 'COMPLETED', deletedAt: null } }),
      prisma.quest.count({ where: { status: 'FAILED', deletedAt: null } }),
      prisma.quest.count({ where: { status: { in: ['ACTIVE', 'IN_PROGRESS'] }, deletedAt: null } }),
      prisma.gate.count({ where: { deletedAt: null } }),
      prisma.dailyDungeon.count(),
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'COMPLETED' } }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: monthAgo } },
        _sum: { amount: true },
      }),
      prisma.subscription.groupBy({ by: ['plan'], _count: { plan: true } }),
      prisma.subscription.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.payment.groupBy({ by: ['paymentMethod'], _count: { paymentMethod: true }, where: { status: 'COMPLETED' } }),
    ]);

    const completedSubs = await prisma.subscription.count();
    const payingUsers = await prisma.subscription.count({
      where: { plan: { not: 'FREE' }, status: 'ACTIVE' },
    });

    res.json({
      users: {
        total: totalUsers,
        activeLast7d: activeUsers,
        newLast24h: newUsers24h,
        newLast7d: newUsers7d,
        deleted: deletedUsers,
        paying: payingUsers,
        conversionRate: completedSubs > 0 ? Math.round((payingUsers / totalUsers) * 10000) / 100 : 0,
      },
      quests: {
        total: totalQuests,
        completed: completedQuests,
        failed: failedQuests,
        active: activeQuests,
        completionRate: totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 10000) / 100 : 0,
      },
      engagement: {
        totalGates,
        totalDungeons,
      },
      revenue: {
        totalCents: revenueAgg._sum.amount || 0,
        last30dCents: revenue30dAgg._sum.amount || 0,
        totalPayments,
        completedPayments,
        failedPayments,
        paymentMethods: paymentMethodGroups.map((g) => ({
          method: g.paymentMethod,
          count: g._count.paymentMethod,
        })),
      },
      subscriptions: {
        byPlan: subscriptionPlanGroups.map((g) => ({ plan: g.plan, count: g._count.plan })),
        byStatus: subscriptionStatusGroups.map((g) => ({ status: g.status, count: g._count.status })),
      },
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    logger.error('Admin overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// User management
// ========================

/**
 * GET /api/admin/users?search=&page=&limit=&plan=&status=
 * Paginated, searchable user list with subscription + payment summaries.
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = ((req.query.search as string) || '').trim();
    const planFilter = req.query.plan as string | undefined;
    const statusFilter = req.query.status as string | undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { displayName: { contains: search } },
        { hunterId: { contains: search } },
      ];
    }
    if (planFilter) where.subscription = { plan: planFilter };
    if (statusFilter === 'deleted') where.deletedAt = { not: null };
    else if (statusFilter === 'active') where.deletedAt = null;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          hunterId: true,
          displayName: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          organizationId: true,
          subscription: {
            select: { plan: true, status: true, endDate: true, cancelAtPeriodEnd: true },
          },
          hunterStats: { select: { level: true, rank: true, streak: true, lastActiveDate: true } },
          _count: { select: { quests: true, payments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      users: users.map((u) => ({
        ...u,
        email: u.email, // full email visible to superadmin only
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Admin list users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/users/:id
 * Full detail view of a single user.
 */
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        hunterId: true,
        displayName: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        avatarUrl: true,
        hunterStats: true,
        subscription: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 20 },
        quests: { select: { id: true, title: true, status: true, rank: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { quests: true, gates: true, payments: true, notifications: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Admin get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Body: { role: 'USER' | 'SUPERADMIN' }
 * Promote/demote users. Superadmins cannot demote themselves (safety guard).
 */
router.patch('/users/:id/role', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (role !== 'USER' && role !== 'SUPERADMIN') {
      return res.status(400).json({ error: "role must be 'USER' or 'SUPERADMIN'" });
    }

    const authed = getAuthedUser(req);
    if (authed?.userId === id && role === 'USER') {
      return res.status(400).json({ error: 'You cannot demote your own superadmin account' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    logger.info(`Superadmin role change: ${user.email} -> ${role}`, { by: authed?.userId });
    res.json({ user: updated });
  } catch (error) {
    logger.error('Admin update role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Body: { action: 'disable' | 'restore' }
 * Soft-disables (anonymizes login) or restores a user account.
 */
router.patch('/users/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (action !== 'disable' && action !== 'restore') {
      return res.status(400).json({ error: "action must be 'disable' or 'restore'" });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const authed = getAuthedUser(req);
    if (authed?.userId === id && action === 'disable') {
      return res.status(400).json({ error: 'You cannot disable your own account' });
    }

    if (user.role === 'SUPERADMIN' && action === 'disable') {
      return res.status(400).json({ error: 'Cannot disable a superadmin account' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { deletedAt: action === 'disable' ? new Date() : null },
      select: { id: true, email: true, deletedAt: true },
    });

    logger.info(`Superadmin account ${action}: ${user.email}`, { by: authed?.userId });
    res.json({ user: updated });
  } catch (error) {
    logger.error('Admin update status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Hard delete of a user (cascades). Superadmins cannot delete themselves.
 */
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authed = getAuthedUser(req);

    if (authed?.userId === id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'SUPERADMIN') {
      return res.status(400).json({ error: 'Cannot delete a superadmin account. Demote first.' });
    }

    await prisma.user.delete({ where: { id } });
    logger.info(`Superadmin hard-deleted user: ${user.email}`, { by: authed?.userId });
    res.json({ success: true, message: `User ${user.email} permanently deleted` });
  } catch (error) {
    logger.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Payments & revenue
// ========================

/**
 * GET /api/admin/payments?page=&limit=&status=
 * Full payment ledger with user info.
 */
router.get('/payments', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const statusFilter = req.query.status as string | undefined;

    const where: any = {};
    if (statusFilter) where.status = statusFilter;

    const [total, payments, totals] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, displayName: true, hunterId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    res.json({
      payments,
      totals: { completedRevenueCents: totals._sum.amount || 0, completedCount: totals._count },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Admin payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/revenue/daily?days=30
 * Daily revenue time series for charts (last N days).
 */
router.get('/revenue/daily', async (req: Request, res: Response) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days as string) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const payments = await prisma.payment.findMany({
      where: { status: 'COMPLETED', createdAt: { gte: since } },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Bucket by day
    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const p of payments) {
      const key = new Date(p.createdAt).toISOString().slice(0, 10);
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) || 0) + p.amount);
      }
    }

    const series = Array.from(buckets.entries()).map(([date, cents]) => ({ date, cents }));
    res.json({ series, days });
  } catch (error) {
    logger.error('Admin revenue daily error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Subscriptions & expiry
// ========================

/**
 * GET /api/admin/subscriptions?filter=expiring|expired|active|canceled
 * Subscription monitor. 'expiring' returns subs ending within the next 7 days.
 */
router.get('/subscriptions', async (req: Request, res: Response) => {
  try {
    const filter = (req.query.filter as string) || 'all';
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const where: any = {};
    if (filter === 'expiring') {
      where.endDate = { gte: now, lte: in7Days };
      where.status = 'ACTIVE';
    } else if (filter === 'expired') {
      where.OR = [
        { endDate: { lt: now } },
        { status: 'EXPIRED' },
      ];
    } else if (filter === 'active') {
      where.status = 'ACTIVE';
    } else if (filter === 'canceled') {
      where.status = { in: ['CANCELED', 'PAST_DUE'] };
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, displayName: true, hunterId: true, role: true } },
      },
      orderBy: { endDate: 'asc' },
      take: 200,
    });

    const [expiringSoon, expiredCount, activeCount, canceledCount] = await Promise.all([
      prisma.subscription.count({ where: { endDate: { gte: now, lte: in7Days }, status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { OR: [{ endDate: { lt: now } }, { status: 'EXPIRED' }] } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { status: { in: ['CANCELED', 'PAST_DUE'] } } }),
    ]);

    res.json({
      subscriptions,
      counts: { expiringSoon, expired: expiredCount, active: activeCount, canceled: canceledCount },
    });
  } catch (error) {
    logger.error('Admin subscriptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/subscriptions/:userId
 * Body: { plan?, status?, endDate? } — manual override of a user's subscription.
 */
router.patch('/subscriptions/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { plan, status, endDate } = req.body;

    const existing = await prisma.subscription.findUnique({ where: { userId } });
    if (!existing) return res.status(404).json({ error: 'Subscription not found for user' });

    const data: any = {};
    if (plan !== undefined) {
      if (!['FREE', 'HUNTER_PASS', 'GUILD', 'ENTERPRISE'].includes(plan)) {
        return res.status(400).json({ error: 'Invalid plan' });
      }
      data.plan = plan;
    }
    if (status !== undefined) {
      if (!['ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING', 'EXPIRED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      data.status = status;
    }
    if (endDate !== undefined) {
      data.endDate = endDate ? new Date(endDate) : null;
    }

    const updated = await prisma.subscription.update({
      where: { userId },
      data,
      include: { user: { select: { id: true, email: true } } },
    });

    logger.info(`Superadmin subscription override for user ${userId}`, { changes: Object.keys(data) });
    res.json({ subscription: updated });
  } catch (error) {
    logger.error('Admin subscription update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Activity feed
// ========================

/**
 * GET /api/admin/activity?limit=50
 * Recent platform-wide activity: new users, quest completions, payments, level-ups.
 */
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

    const [newUsers, recentPayments, recentQuestCompletions, recentAnalytics] = await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true, displayName: true, email: true, createdAt: true, hunterId: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.payment.findMany({
        include: { user: { select: { displayName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.quest.findMany({
        where: { status: 'COMPLETED', deletedAt: null },
        select: { id: true, title: true, rank: true, completedAt: true, user: { select: { displayName: true } } },
        orderBy: { completedAt: 'desc' },
        take: limit,
      }),
      prisma.analyticsEvent.findMany({
        include: { user: { select: { displayName: true } } },
        orderBy: { timestamp: 'desc' },
        take: limit,
      }),
    ]);

    type ActivityItem = {
      type: 'user_registered' | 'payment' | 'quest_completed' | 'analytics_event';
      at: string;
      message: string;
      detail?: string;
    };

    const items: ActivityItem[] = [
      ...newUsers.map((u): ActivityItem => ({
        type: 'user_registered',
        at: u.createdAt.toISOString(),
        message: `${u.displayName} (${u.email}) joined the platform`,
      })),
      ...recentPayments.map((p): ActivityItem => ({
        type: 'payment',
        at: p.createdAt.toISOString(),
        message: `${p.user?.displayName || 'Unknown'} — payment ${p.status.toLowerCase()} ($${(p.amount / 100).toFixed(2)})`,
        detail: p.paymentIntentId || undefined,
      })),
      ...recentQuestCompletions
        .filter((q) => q.completedAt)
        .map((q): ActivityItem => ({
          type: 'quest_completed',
          at: q.completedAt!.toISOString(),
          message: `${q.user?.displayName || 'Unknown'} completed ${q.rank}-rank quest "${q.title}"`,
        })),
      ...recentAnalytics.map((e): ActivityItem => ({
        type: 'analytics_event',
        at: e.timestamp.toISOString(),
        message: `${e.user?.displayName || 'Unknown'} — ${e.eventType}`,
      })),
    ];

    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    res.json({ activity: items.slice(0, limit) });
  } catch (error) {
    logger.error('Admin activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Analytics (platform-wide)
// ========================

/**
 * GET /api/admin/analytics/funnel
 * Platform-wide onboarding funnel + retention summary.
 */
router.get('/analytics/funnel', async (_req: Request, res: Response) => {
  try {
    const [funnelData, totalUsers, d1, d7, d30] = await Promise.all([
      prisma.onboardingProgress.findMany({
        select: { currentStep: true, completedSteps: true, startedAt: true, completedAt: true },
      }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.retentionMetrics.count({ where: { day1Active: true } }),
      prisma.retentionMetrics.count({ where: { day7Active: true } }),
      prisma.retentionMetrics.count({ where: { day30Active: true } }),
    ]);

    const totalStarted = funnelData.length;
    const stepCounts: Record<string, number> = {};
    funnelData.forEach((progress) => {
      try {
        const steps = JSON.parse(progress.completedSteps || '[]');
        steps.forEach((step: string) => {
          stepCounts[step] = (stepCounts[step] || 0) + 1;
        });
        stepCounts[progress.currentStep] = (stepCounts[progress.currentStep] || 0) + 1;
      } catch {
        // skip malformed JSON
      }
    });

    const funnel = Object.entries(stepCounts).map(([step, count]) => ({
      step,
      count,
      percentage: totalStarted > 0 ? Math.round((count / totalStarted) * 1000) / 10 : 0,
    }));

    const rate = (count: number) => (totalUsers > 0 ? Math.round((count / totalUsers) * 1000) / 10 : 0);

    res.json({
      onboarding: {
        totalStarted,
        completed: funnelData.filter((p) => p.completedAt).length,
        funnel,
      },
      retention: {
        totalUsers,
        day1: { count: d1, rate: rate(d1) },
        day7: { count: d7, rate: rate(d7) },
        day30: { count: d30, rate: rate(d30) },
      },
    });
  } catch (error) {
    logger.error('Admin analytics funnel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Health / system status
// ========================

/**
 * GET /api/admin/system
 * System health snapshot for the admin dashboard.
 */
router.get('/system', async (_req: Request, res: Response) => {
  try {
    // Probe the database with a trivial query
    let dbHealthy = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbHealthy = false;
    }

    res.json({
      status: dbHealthy ? 'healthy' : 'degraded',
      database: dbHealthy ? 'connected' : 'unreachable',
      uptimeSeconds: Math.round(process.uptime()),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Admin system status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Economy: reward configuration + reconciliation
// ========================

/**
 * GET /api/admin/rewards
 * Current DB-backed reward table (report fix #86).
 */
router.get('/rewards', async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.rewardConfig.findMany({ orderBy: { key: 'asc' } });
    const version = rows.reduce((max, r) => Math.max(max, r.version), 1);
    res.json({ rewards: rows, tableVersion: version });
  } catch (error) {
    logger.error('Admin get rewards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/rewards/:key
 * Body: { value: number }
 * Tune one reward value; bumps the shared table version so ledger rows
 * stay traceable to the table that produced each reward.
 */
router.patch('/rewards/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 1_000_000) {
      return res.status(400).json({ error: 'value must be an integer between 0 and 1,000,000' });
    }

    const authed = getAuthedUser(req);
    const newVersion = await updateRewardValue(prisma as any, key, value, authed?.userId);
    const row = await prisma.rewardConfig.findUnique({ where: { key } });

    logger.info(`Reward config updated: ${key} = ${value} (table v${newVersion})`, { by: authed?.userId });
    res.json({ reward: row, tableVersion: newVersion });
  } catch (error: any) {
    if (error?.message?.startsWith('Unknown reward key')) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Admin update reward error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/reconciliation/run
 * Trigger an immediate economy reconciliation (report fixes #103/#112).
 */
router.post('/reconciliation/run', async (req: Request, res: Response) => {
  try {
    const authed = getAuthedUser(req);
    logger.info('Admin-triggered reconciliation starting', { by: authed?.userId });
    const result = await runReconciliation(prisma, { triggeredBy: 'admin' });
    res.json(result);
  } catch (error) {
    logger.error('Admin reconciliation run error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/reconciliation
 * Latest reconciliation status + run history summary.
 */
router.get('/reconciliation', async (_req: Request, res: Response) => {
  try {
    const status = await getReconciliationStatus(prisma);
    res.json(status);
  } catch (error) {
    logger.error('Admin reconciliation status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
