import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import compression from 'compression';
import helmet from 'helmet';
import logger from './logger';
import { env, allowedOrigins, isOriginAllowed } from './env';
import { initRedisClient, closeRedisClient, getRateLimiter, initRateLimiters, RATE_LIMIT_CONFIG, type RateLimiterType } from './rateLimiter';
import { initCacheClient, closeCacheClient, getFromCache, setCache, deleteFromCache, deleteCachePattern, invalidateUserCache, getCacheStats } from './cache';
import { csrfProtection } from './csrf';
import {
  requestIdMiddleware,
  requestLoggingMiddleware,
  requestTimingMiddleware,
  requestTimeoutMiddleware,
  cachingMiddleware,
  errorHandlerMiddleware,
  notFoundMiddleware,
  healthCheckMiddleware,
} from './middleware';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { setupAnalyticsRoutes } from './analytics';
import {
  createCheckoutSession,
  handleWebhook,
  getUserSubscription,
  cancelSubscription,
  SUBSCRIPTION_PLANS,
  getStripe,
} from './stripe';
import {
  requireSubscriptionTier,
  requirePaidSubscription,
  getUserEntitlements,
  checkUserLimits,
} from './entitlements';
import {
  signToken,
  revokeTokenJti,
  revokeAllUserTokens,
  isTokenRevoked,
  recordLedgerEntry,
  recordEconomyChange,
  getIdempotentResponse,
  saveIdempotentResponse,
  setGauge,
  renderMetrics,
  incrementCounter,
  BASE_XP_BY_RANK,
  BASE_GOLD_BY_RANK,
  loadRewardTable,
  getRewardTableSource,
} from './economy';
import { runReconciliation } from './reconciliation';
import { initJobs, closeJobs, queueImmediateReconcile } from './jobs';

dotenv.config();

// Stripe client comes from ./stripe (guarded lazy singleton — a bare
// `new Stripe('')` throws an uncaughtException and killed the boot).
const stripe = getStripe();

const app = express();
const httpServer = createServer(app);
const port = parseInt(env.PORT, 10);

// Behind nginx / Kubernetes ingress (review #4): without this, req.ip is
// the proxy's IP for every request and rate limiting becomes one shared
// bucket for the entire app.
app.set('trust proxy', 1);

// Extend Express Request type
declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
    user?: any;
    idempotencyKey?: string;
  }
}

// Configure Prisma with connection pooling for minimal latency
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
  log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

const JWT_SECRET = env.JWT_SECRET;

// Retry logic wrapper for database operations
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

// Socket.IO setup with minimal latency configuration and heartbeat monitoring
const io = new SocketIOServer(httpServer, {
  cors: {
    // Same shared validation as Express CORS/CSRF (ADR-003) — no local
    // hardcoded list so it can never drift from ALLOWED_ORIGINS.
    origin: (origin, cb) => cb(null, isOriginAllowed(origin)),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
  pingTimeout: 10000,
  pingInterval: 5000,
  transports: ['websocket', 'polling'],
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6,
});

// Track active connections for monitoring
const activeConnections = new Map<string, { lastSeen: number }>();

// Heartbeat monitoring - clean up stale connections
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 60000; // 1 minute
  for (const [socketId, data] of activeConnections.entries()) {
    if (now - data.lastSeen > staleThreshold) {
      logger.info(`Stale connection detected: ${socketId}`);
      activeConnections.delete(socketId);
    }
  }
}, 30000); // Check every 30 seconds

// Socket.IO auth middleware — shares verifyAuthToken with Express (review #8)
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  const decoded = verifyAuthToken(token);
  if (!decoded) {
    return next(new Error('Invalid token'));
  }
  if (await isTokenRevoked(decoded.jti, decoded.userId, decoded.iat)) {
    return next(new Error('Token revoked'));
  }
  socket.data.userId = decoded.userId;
  next();
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  socket.join(`user:${userId}`);
  activeConnections.set(socket.id, { lastSeen: Date.now() });
  logger.info(`Socket connected: user ${userId}, socket: ${socket.id}`);

  // Update heartbeat on activity
  socket.on('ping', () => {
    activeConnections.set(socket.id, { lastSeen: Date.now() });
  });

  socket.on('disconnect', () => {
    activeConnections.delete(socket.id);
    logger.info(`Socket disconnected: user ${userId}, socket: ${socket.id}`);
  });
});

// Helper to emit to a specific user
// BigInt does not implement toJSON — any res.json() that touches a BigInt
// column (raids.targetExp/progressExp, guild.totalExp) throws
// "Do not know how to serialize a BigInt". Serialize as string instead.
// (BigInt.prototype is extensible; this global patch is idempotent.)
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Serialize a Raid row for JSON responses (BigInt columns → strings).
const serializeRaid = (raid: any) => ({
  ...raid,
  targetExp: raid.targetExp != null ? raid.targetExp.toString() : null,
  progressExp: raid.progressExp != null ? raid.progressExp.toString() : null,
});

// Guild shared boss fights (#96). Tiers are deterministic (no RNG): HP scales
// with tier and victory rewards are flat per eligible participant. Names are
// original (IP-adjacent monarch names are deliberately avoided, see #368).
const GUILD_BOSSES: { tier: number; name: string; hp: number }[] = [
  { tier: 1, name: 'Gatekeeper Hound', hp: 1500 },
  { tier: 2, name: 'Dire Beast of the Rift', hp: 4000 },
  { tier: 3, name: 'Rift Marshal', hp: 9000 },
  { tier: 4, name: 'Archon of the Deep Rift', hp: 16000 },
  { tier: 5, name: 'The Rift Sovereign', hp: 25000 },
];
const BOSS_STRIKE_WINDOW_DAYS = 7; // completions older than this cannot fuel strikes

// Strike damage derives from quest rank (E=1 … S=6 → 100–600 HP), never client input.
const BOSS_RANK_DAMAGE: Record<string, number> = { E: 1, D: 2, C: 3, B: 4, A: 5, S: 6 };
const bossStrikeDamage = (rank: string): bigint =>
  BigInt(BOSS_RANK_DAMAGE[rank] ?? 1) * BigInt(100);

/**
 * Attempt one boss strike for a completed quest (#96).
 *
 * Shared by POST /api/guilds/boss/strike (explicit) and the automatic hook
 * that runs after every verified quest completion. All-or-nothing:
 *  - 'no-guild' | 'no-boss'      → nothing happened, no state changed
 *  - 'ineligible'                → quest cannot strike (bad status/owner/age/reuse)
 *  - 'duplicate'                 → this quest already fueled a strike
 *  - { defeated, damage, ... }   → strike landed (boss state already persisted)
 *
 * Uses its own prisma client (not a tx) so callers can invoke it after their
 * reward transaction has committed.
 */
async function attemptBossStrike(
  userId: string,
  questId: string
): Promise<
  | { outcome: 'no-guild' | 'no-boss' | 'ineligible' | 'duplicate' }
  | { outcome: 'struck'; damage: string; hpRemaining: string; defeated: boolean; bossName: string; bossTier: number; guildId: string }
> {
  const socialStats = await withRetry(() => prisma.socialStats.findUnique({ where: { userId } }));
  if (!socialStats?.guildId) return { outcome: 'no-guild' };
  const guildId: string = socialStats.guildId;

  const strikeCutoff = new Date();
  strikeCutoff.setDate(strikeCutoff.getDate() - BOSS_STRIKE_WINDOW_DAYS);

  const quest = await withRetry(() => prisma.quest.findUnique({ where: { id: questId } }));
  if (
    !quest ||
    quest.userId !== userId ||
    quest.deletedAt !== null ||
    quest.status !== 'COMPLETED' ||
    !quest.completedAt ||
    quest.completedAt < strikeCutoff ||
    quest.bossStrikeUsed
  ) {
    return { outcome: 'ineligible' };
  }

  const boss = await withRetry(() =>
    prisma.raid.findFirst({
      where: { guildId, isBoss: true, status: 'ACTIVE' },
      include: { participants: true },
    })
  );
  if (!boss) return { outcome: 'no-boss' };

  const damage = bossStrikeDamage(quest.rank);

  const result = await withRetry(() =>
    prisma.$transaction(async (tx) => {
      // Claim the quest's strike atomically (guards concurrent/duplicate strikes).
      const claimed = await tx.quest.updateMany({
        where: { id: quest.id, bossStrikeUsed: false },
        data: { bossStrikeUsed: true },
      });
      if (claimed.count === 0) {
        return { duplicate: true as const };
      }

      // Ensure the striker is a participant (idempotent upsert).
      await tx.raidParticipant.upsert({
        where: { raidId_userId: { raidId: boss.id, userId } },
        create: { raidId: boss.id, userId, expContributed: damage },
        update: { expContributed: { increment: damage }, lastActiveAt: new Date() },
      });

      const updated = await tx.raid.update({
        where: { id: boss.id },
        data: { progressExp: { increment: damage } },
      });

      const hp = updated.targetExp;
      const dealt = updated.progressExp;
      const defeated = dealt >= hp;

      if (defeated) {
        await tx.raid.update({
          where: { id: boss.id },
          data: { status: 'COMPLETED', endDate: new Date(), progressExp: hp },
        });
      }

      return {
        duplicate: false as const,
        damage: damage.toString(),
        hpRemaining: (hp > dealt ? hp - dealt : BigInt(0)).toString(),
        defeated,
        bossName: updated.name,
        bossTier: updated.bossTier,
      };
    })
  );

  if (result.duplicate) return { outcome: 'duplicate' };
  return { outcome: 'struck', ...result, guildId };
}

const emitToUser = (userId: string, event: string, data: any) => {
  io.to(`user:${userId}`).emit(event, data);
};

// ============================================================
// Middleware pipeline (review #14: explicit, commented order —
// registration order IS execution order in Express)
// ============================================================

// 1. helmet — security headers/CSP. CSP connectSrc driven by the shared
//    allowlist so it covers the real frontend origin(s) in production.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...allowedOrigins],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
// 2. cors — same shared validation as CSRF/Socket.IO (review #3 + ADR-003).
//    Function form: strict allowlist in production; in development also
//    allows localhost on any port (vite auto-increments 5174, 5175 …) and
//    private LAN IPs (mobile device testing).
app.use(cors({
  origin: (origin, cb) => cb(null, isOriginAllowed(origin)),
  credentials: true,
}));
// 3. compression
app.use(compression());
// 4. body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// 5. request ID + logging
app.use(requestIdMiddleware);
app.use(requestLoggingMiddleware);

// Idempotency middleware (report fixes #1/#13): clients send an
// Idempotency-Key header on reward-granting POSTs. A repeated key
// within 24h replays the recorded response instead of re-applying
// rewards — neutralizes double-click and network-retry exploits.
// `optional` mode (older clients): a supplied key is honored and the
// response recorded, but requests without a key still process.
const idempotencyMiddleware = (optional = false) => async (req: any, res: any, next: any) => {
  const key = req.headers['idempotency-key'];
  if (typeof key === 'string' && key.length > 0) {
    if (key.length < 8 || key.length > 128) {
      return res.status(400).json({
        error: 'Idempotency-Key header must be 8-128 characters',
      });
    }
  } else if (!optional) {
    return res.status(400).json({
      error: 'Idempotency-Key header required (8-128 characters) for this endpoint',
    });
  }
  if (typeof key === 'string' && key.length > 0) {
    try {
      const userId = getUserId(req);
      const cached = await getIdempotentResponse(userId, key);
      if (cached) {
        res.setHeader('Idempotent-Replay', 'true');
        return res.status(cached.statusCode).json(JSON.parse(cached.responseJson));
      }
      req.idempotencyKey = key;
    } catch {
      // getUserId throws when auth didn't populate req.user — treat as unauthenticated
      return res.sendStatus(401);
    }
  }
  next();
};

/** Persist the response of an idempotent request so retries replay it. */
const captureIdempotentResponse = async (req: any, res: any, body: unknown): Promise<void> => {
  if (!req.idempotencyKey) return;
  try {
    await saveIdempotentResponse(getUserId(req), req.idempotencyKey, res.statusCode, JSON.stringify(body ?? null));
  } catch (error) {
    logger.error('Failed to persist idempotent response:', error);
  }
};

// 6. CSRF BEFORE rate limiting (review #13): origin validation is a cheap
//    stateless check — do it first so spoofed-origin floods don't burn
//    Redis rate-limit quota for legitimate users. csrf.ts exempts the
//    signature-verified Stripe webhook path itself.
app.use('/api/', csrfProtection);

// 7. Rate limiting — account-keyed where possible (review #11): once a
//    user is authenticated, share the bucket across their IPs (CGNAT/
//    corporate NAT users don't fight each other) while pre-auth routes
//    stay IP-keyed.
const createRateLimitMiddleware = (limiterType: RateLimiterType) => {
  return async (req: any, res: any, next: any) => {
    try {
      // Authenticated requests are keyed by user; fall back to IP pre-auth.
      let key: string = req.ip || req.connection?.remoteAddress || 'unknown';
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.decode(token) as { userId?: string; id?: string } | null;
          const claim = decoded?.userId || decoded?.id;
          if (claim) key = `user:${claim}`;
        } catch {
          // invalid token: keep IP key; the route's auth check will reject it
        }
      }
      const limiter = getRateLimiter(limiterType);
      await limiter.consume(key);
      next();
    } catch (rejRes: any) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      res.set('Retry-After', String(secs));
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: secs,
      });
    }
  };
};

// Export limiter configs for docs/monitoring without re-deriving them
export const rateLimitTiers = RATE_LIMIT_CONFIG;

app.use('/api/', createRateLimitMiddleware('api'));

// 8. Timing/timeout + GET-only cache headers
app.use(requestTimingMiddleware);
app.use(requestTimeoutMiddleware);
app.use(cachingMiddleware);

// Swagger API Documentation — non-production only (review #12): full API
// docs including auth flows shouldn't be exposed publicly in production.
if (env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// Analytics routes
setupAnalyticsRoutes(app);

// ============================================================
// Auth token verification — single shared helper (review #8): used by
// both the Express middleware and the Socket.IO handshake so token-shape
// changes only ever happen in one place. Algorithm is explicitly pinned
// to HS256 (algorithm-confusion hardening).
// ============================================================
const JWT_ALGORITHMS = ['HS256'] as const;

interface VerifiedToken {
  userId: string;
  role?: string;
  jti?: string;
  iat?: number;
}

const verifyAuthToken = (token: string): VerifiedToken | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [...JWT_ALGORITHMS] }) as any;
    const userId = decoded.userId || decoded.id;
    if (!userId || typeof userId !== 'string') return null;
    return {
      userId,
      role: decoded.role,
      jti: decoded.jti,
      iat: decoded.iat,
    };
  } catch {
    return null;
  }
};

// Auth middleware (declared early: used by routes below)
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  const user = verifyAuthToken(token);
  if (!user) return res.sendStatus(403);

  // Revocation check (report fix #8): a logged-out or invalidated
  // token must be rejected even though its signature is still valid.
  if (await isTokenRevoked(user.jti, user.userId, user.iat)) {
    return res.status(401).json({ error: 'Token revoked' });
  }

  req.user = user;
  next();
};

// Push notification token registration
app.post('/api/push/register', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { pushToken, platform } = req.body;

    if (!pushToken || !platform) {
      return res.status(400).json({ error: 'pushToken and platform are required' });
    }

    // Store or update push token
    await withRetry(() =>
      prisma.pushToken.upsert({
        where: { token: pushToken },
        update: {
          userId,
          platform,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          userId,
          token: pushToken,
          platform,
          isActive: true,
        },
      })
    );

    logger.info(`Push token registered for user ${userId} on ${platform}`);
    res.json({ success: true, message: 'Push token registered successfully' });
  } catch (error) {
    logger.error('Push token registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Superadmin routes (mounted under /api/admin)
import adminRoutes from './adminRoutes';
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', healthCheckMiddleware);

// Subscription and Payment Routes
/**
 * @swagger
 * /api/subscription/plans:
 *   get:
 *     summary: Get available subscription plans
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: Available plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plans:
 *                   type: object
 */
app.get('/api/subscription/plans', async (req, res) => {
  try {
    res.json({ plans: SUBSCRIPTION_PLANS });
  } catch (error) {
    logger.error('Get plans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/subscription:
 *   get:
 *     summary: Get current user's subscription status
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plan:
 *                   type: string
 *                 status:
 *                   type: string
 *                 endDate:
 *                   type: string
 *                   format: date-time
 */
app.get('/api/subscription', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const subscription = await getUserSubscription(userId);
    res.json(subscription);
  } catch (error) {
    logger.error('Get subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/subscription/checkout:
 *   post:
 *     summary: Create a checkout session for subscription
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan
 *               - billingCycle
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [hunter_pass, guild]
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly]
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                 sessionId:
 *                   type: string
 */
app.post('/api/subscription/checkout', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { plan, billingCycle } = req.body;

    if (!plan || !billingCycle) {
      return res.status(400).json({ error: 'Missing plan or billingCycle' });
    }

    const session = await createCheckoutSession(userId, plan, billingCycle);
    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    logger.error('Create checkout session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/subscription:
 *   get:
 *     summary: Get current subscription status
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plan:
 *                   type: string
 *                 status:
 *                   type: string
 *                 endDate:
 *                   type: string
 */
app.get('/api/subscription', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const subscription = await getUserSubscription(userId);
    res.json(subscription);
  } catch (error) {
    logger.error('Get subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/subscription/success:
 *   get:
 *     summary: Handle successful subscription checkout
 *     tags: [Subscription]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscription success page
 */
app.get('/api/subscription/success', async (req, res) => {
  try {
    const { session_id } = req.query;
    logger.info(`Subscription success for session: ${session_id}`);
    res.json({ success: true, message: 'Subscription successful' });
  } catch (error) {
    logger.error('Subscription success error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/subscription/canceled:
 *   get:
 *     summary: Handle canceled subscription checkout
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: Subscription canceled page
 */
app.get('/api/subscription/canceled', async (req, res) => {
  try {
    logger.info('Subscription checkout canceled');
    res.json({ success: false, message: 'Subscription canceled' });
  } catch (error) {
    logger.error('Subscription canceled error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/subscription/cancel:
 *   post:
 *     summary: Cancel current subscription
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription canceled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
app.post('/api/subscription/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    await cancelSubscription(userId);
    res.json({ message: 'Subscription canceled successfully' });
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/subscription/webhook:
 *   post:
 *     summary: Stripe webhook endpoint
 *     tags: [Subscription]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
/**
 * @swagger
 * /api/entitlements:
 *   get:
 *     summary: Get user's entitlements and feature limits
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Entitlements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plan:
 *                   type: string
 *                 status:
 *                   type: string
 *                 features:
 *                   type: object
 *                 settings:
 *                   type: object
 */
app.get('/api/entitlements', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const entitlements = await getUserEntitlements(userId);
    res.json(entitlements);
  } catch (error) {
    logger.error('Get entitlements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/entitlements/check/{action}:
 *   get:
 *     summary: Check if user can perform an action based on limits
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: action
 *         required: true
 *         schema:
 *           type: string
 *           enum: [create_quest, create_gate, use_streak_freeze]
 *     responses:
 *       200:
 *         description: Action check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 allowed:
 *                   type: boolean
 *                 reason:
 *                   type: string
 */
app.get('/api/entitlements/check/:action', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { action } = req.params;
    const allowed = await checkUserLimits(userId, action);
    
    res.json({ 
      allowed,
      reason: allowed ? 'Action allowed' : 'Subscription limit reached'
    });
  } catch (error) {
    logger.error('Check limits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/subscription/webhook:
 *   post:
 *     summary: Stripe webhook endpoint
 *     tags: [Subscription]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get user settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 simpleMode:
 *                   type: boolean
 *                 penaltySeverity:
 *                   type: string
 *                 notificationPreference:
 *                   type: string
 */
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      // Create default settings
      settings = await prisma.userSettings.create({
        data: {
          userId,
          simpleMode: false,
          penaltySeverity: 'forgiving',
          notificationPreference: 'adaptive',
        },
      });
    }

    // Deserialize avatarConfig for the client (#9)
    let avatarConfig: unknown = null;
    if (settings.avatarConfig) {
      try {
        avatarConfig = JSON.parse(settings.avatarConfig);
      } catch {
        avatarConfig = null;
      }
    }
    res.json({ ...settings, avatarConfig });
  } catch (error) {
    logger.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/settings:
 *   patch:
 *     summary: Update user settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               simpleMode:
 *                 type: boolean
 *               penaltySeverity:
 *                 type: string
 *                 enum: [forgiving, moderate, hardcore]
 *               notificationPreference:
 *                 type: string
 *                 enum: [adaptive, aggressive, minimal]
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.patch('/api/settings', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { simpleMode, penaltySeverity, notificationPreference, timezone, locale, avatarConfig } = req.body;

    // 3D avatar config validation (#9/#293): strict whitelist, hex-only colors,
    // size-capped. Malformed payloads are rejected rather than silently stored.
    let validatedAvatarConfig: Record<string, string> | undefined;
    if (avatarConfig !== undefined) {
      if (avatarConfig === null || typeof avatarConfig !== 'object' || Array.isArray(avatarConfig)) {
        return res.status(400).json({ error: 'avatarConfig must be an object' });
      }
      const HEX = /^#[0-9a-fA-F]{6}$/;
      const c = avatarConfig as Record<string, unknown>;
      const pickHex = (v: unknown, fallback: string): string => (typeof v === 'string' && HEX.test(v) ? v : fallback);
      validatedAvatarConfig = {
        bodyType: c.bodyType === 'slim' || c.bodyType === 'broad' || c.bodyType === 'regular' ? c.bodyType : 'regular',
        skinTone: pickHex(c.skinTone, '#c8a27e'),
        armorColor: pickHex(c.armorColor, '#4c4f69'),
        accentColor: pickHex(c.accentColor, '#7c6ef0'),
        hairStyle: ['short', 'swept', 'topknot', 'hood'].includes(c.hairStyle as string)
          ? (c.hairStyle as string)
          : 'short',
        hairColor: pickHex(c.hairColor, '#2a2f3a'),
        classSigil: ['sword', 'orb', 'tome', 'dagger', 'bow', 'none'].includes(c.classSigil as string)
          ? (c.classSigil as string)
          : 'none',
      };
    }

    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          simpleMode: simpleMode ?? false,
          penaltySeverity: penaltySeverity ?? 'forgiving',
          notificationPreference: notificationPreference ?? 'adaptive',
          timezone,
          locale,
          ...(validatedAvatarConfig !== undefined && { avatarConfig: JSON.stringify(validatedAvatarConfig) }),
        },
      });
    } else {
      settings = await prisma.userSettings.update({
        where: { id: settings.id },
        data: {
          ...(simpleMode !== undefined && { simpleMode }),
          ...(penaltySeverity !== undefined && { penaltySeverity }),
          ...(notificationPreference !== undefined && { notificationPreference }),
          ...(timezone !== undefined && { timezone }),
          ...(locale !== undefined && { locale }),
          ...(validatedAvatarConfig !== undefined && { avatarConfig: JSON.stringify(validatedAvatarConfig) }),
        },
      });
    }

    res.json(settings);
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Chronicle (story arc) persistence
// ------------------------
// Chapter acknowledgments live on UserSettings.storyProgress as a JSON blob
// ({ clearedIds: string[] }). Validated server-side against the known
// chapter-id prefix (ch-NN-) so arbitrary payloads are rejected; length-
// capped. This is presentation state, not economy — no rewards flow from it.
// ========================

const STORY_ID_PATTERN = /^ch-\d{2}-[a-z0-9-]+$/;
const STORY_PROGRESS_MAX_BYTES = 4096;

function parseStoryProgress(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.clearedIds)) return [];
    return parsed.clearedIds
      .filter((id: unknown): id is string => typeof id === 'string' && STORY_ID_PATTERN.test(id))
      .slice(0, 64);
  } catch {
    return [];
  }
}

/**
 * @swagger
 * /api/story:
 *   get:
 *     summary: Get the hunter's Chronicle progress (acknowledged chapters)
 *     tags: [Hunter]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chronicle progress
 */
app.get('/api/story', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { storyProgress: true },
    });
    const clearedIds = parseStoryProgress(settings?.storyProgress);
    res.json({ clearedIds });
  } catch (error) {
    logger.error('Get story error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/story:
 *   put:
 *     summary: Persist the hunter's Chronicle progress (acknowledged chapters)
 *     tags: [Hunter]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clearedIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Chronicle progress saved
 */
app.put('/api/story', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { clearedIds } = req.body ?? {};

    if (!Array.isArray(clearedIds)) {
      return res.status(400).json({ error: 'clearedIds must be an array' });
    }
    if (clearedIds.length > 64) {
      return res.status(400).json({ error: 'clearedIds too long (max 64)' });
    }
    for (const id of clearedIds) {
      if (typeof id !== 'string' || !STORY_ID_PATTERN.test(id)) {
        return res.status(400).json({ error: `invalid chapter id: ${String(id).slice(0, 32)}` });
      }
    }

    const payload = JSON.stringify({ clearedIds });
    if (payload.length > STORY_PROGRESS_MAX_BYTES) {
      return res.status(400).json({ error: 'story progress payload too large' });
    }

    // findUnique+create/update (not upsert): userId has a unique constraint,
    // and settings rows are created by /api/settings on first login anyway.
    const existing = await prisma.userSettings.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (existing) {
      await prisma.userSettings.update({
        where: { id: existing.id },
        data: { storyProgress: payload },
      });
    } else {
      await prisma.userSettings.create({
        data: { userId, storyProgress: payload },
      });
    }

    res.json({ ok: true, clearedIds });
  } catch (error) {
    logger.error('Update story error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/subscription/webhook:
 *   post:
 *     summary: Stripe webhook endpoint
 *     tags: [Subscription]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
// ========================
// Gameplay Systems routes (class, mood, adaptive, quest-of-day, snooze, reflection, loot)
// ========================

/**
 * @swagger
 * /api/hunter/class:
 *   post:
 *     summary: Choose or change hunter archetype (Warrior, Mage, Scholar, Assassin, Ranger)
 *     tags: [Hunter]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hunterClass
 *             properties:
 *               hunterClass:
 *                 type: string
 *                 enum: [NONE, WARRIOR, MAGE, SCHOLAR, ASSASSIN, RANGER]
 *     responses:
 *       200:
 *         description: Class updated
 *       400:
 *         description: Invalid class
 */
app.post('/api/hunter/class', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { hunterClass } = req.body;

    const validClasses = ['NONE', 'WARRIOR', 'MAGE', 'SCHOLAR', 'ASSASSIN', 'RANGER'];
    if (!validClasses.includes(hunterClass)) {
      return res.status(400).json({ error: 'Invalid class' });
    }

    const updated = await withRetry(() => prisma.hunterStats.update({
      where: { userId },
      data: { hunterClass },
      select: { id: true, hunterClass: true, level: true, rank: true },
    }));

    await invalidateUserCache(userId);
    emitToUser(userId, 'stats:updated', updated);

    const notif = await withRetry(() => prisma.notification.create({
      data: {
        userId,
        message: hunterClass === 'NONE' ? 'Class reset.' : `Class selected: ${hunterClass}. Your path is set, Hunter.`,
        type: 'ACHIEVEMENT',
      },
      select: { id: true, message: true, type: true, createdAt: true },
    }));
    emitToUser(userId, 'notification:new', notif);

    res.json(updated);
  } catch (error) {
    logger.error('Set class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/hunter/check-in:
 *   post:
 *     summary: Self-report energy/mood (1-5) for adaptive difficulty
 *     tags: [Hunter]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               energy:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               mood:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Check-in saved with adaptive rank suggestion
 */
app.post('/api/hunter/check-in', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { energy, mood } = req.body;

    const e = Number(energy);
    const m = Number(mood);
    if (!Number.isInteger(e) || e < 1 || e > 5 || !Number.isInteger(m) || m < 1 || m > 5) {
      return res.status(400).json({ error: 'energy and mood must be integers 1-5' });
    }

    await withRetry(() => prisma.hunterStats.update({
      where: { userId },
      data: { lastEnergyLevel: e, lastMoodLevel: m, lastCheckInAt: new Date() },
    }));
    await invalidateUserCache(userId);

    const suggestion = suggestRankForEnergy(e);
    res.json({ energy: e, mood: m, suggestion });
  } catch (error) {
    logger.error('Check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/quests/suggested:
 *   get:
 *     summary: Adaptive quest suggestions + quest of the day, based on energy and quest history
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Suggested quests with reasoning and a curated quest of the day
 */
app.get('/api/quests/suggested', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    const stats = await withRetry(() => prisma.hunterStats.findUnique({
      where: { userId },
      select: { lastEnergyLevel: true, level: true, rank: true },
    }));

    const energy = stats?.lastEnergyLevel ?? 3;
    const suggestion = suggestRankForEnergy(energy);
    const rankOrder = ['E', 'D', 'C', 'B', 'A', 'S'];
    const minIdx = rankOrder.indexOf(suggestion.minRank);
    const maxIdx = rankOrder.indexOf(suggestion.maxRank);
    const allowedRanks = rankOrder.slice(minIdx, maxIdx + 1);

    const candidates = await withRetry(() => prisma.quest.findMany({
      where: { userId, status: 'ACTIVE', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }));

    const inBand = candidates.filter(q => allowedRanks.includes(q.rank));
    const suggested = (inBand.length >= 3 ? inBand : candidates).slice(0, 5);

    // Quest of the day: deterministic pick from active quests (#87)
    const questOfTheDay = candidates.length > 0
      ? candidates[hashString(new Date().toISOString().slice(0, 10) + userId) % candidates.length]
      : null;

    res.json({
      energy,
      suggestion,
      reason: energy
        ? `Based on your last check-in (energy ${energy}/5).`
        : 'Default suggestion — check in with your energy to personalize this.',
      quests: suggested,
      questOfTheDay,
    });
  } catch (error) {
    logger.error('Suggested quests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/quests/{id}/snooze:
 *   post:
 *     summary: Snooze a quest instead of binary complete/fail (#73)
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hours:
 *                 type: number
 *                 description: Hours to postpone (default 24, max 168)
 *     responses:
 *       200:
 *         description: Quest snoozed
 *       400:
 *         description: Snooze limit reached
 */
app.post('/api/quests/:id/snooze', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const hours = Math.min(Math.max(Number(req.body?.hours) || 24, 1), 168);

    const quest = await withRetry(() => prisma.quest.findFirst({ where: { id, userId, deletedAt: null } }));
    if (!quest) return res.status(404).json({ error: 'Quest not found' });
    if (!['ACTIVE', 'IN_PROGRESS'].includes(quest.status)) {
      return res.status(400).json({ error: 'Only active quests can be snoozed' });
    }
    if (quest.snoozeCount >= 3) {
      return res.status(400).json({ error: 'Snooze limit reached (3). Complete it or let it fail.' });
    }

    const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    const updated = await withRetry(() => prisma.quest.update({
      where: { id },
      data: {
        snoozedUntil,
        snoozeCount: { increment: 1 },
        ...(quest.deadline ? { deadline: new Date(Math.max(new Date(quest.deadline).getTime(), snoozedUntil.getTime())) } : {}),
      },
    }));

    await deleteCachePattern(`quests:${userId}:*`);
    emitToUser(userId, 'quest:updated', updated);

    res.json({ quest: updated, message: `Snoozed until ${snoozedUntil.toISOString()}` });
  } catch (error) {
    logger.error('Snooze quest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/quests/{id}/reflection:
 *   post:
 *     summary: Record a reflection on why a quest failed (#66)
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reflection
 *             properties:
 *               reflection:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Reflection saved
 */
app.post('/api/quests/:id/reflection', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { reflection } = req.body;

    if (!reflection || typeof reflection !== 'string' || !reflection.trim()) {
      return res.status(400).json({ error: 'Reflection text is required' });
    }
    if (reflection.length > 1000) {
      return res.status(400).json({ error: 'Reflection must be 1000 characters or fewer' });
    }

    const quest = await withRetry(() => prisma.quest.findFirst({ where: { id, userId } }));
    if (!quest) return res.status(404).json({ error: 'Quest not found' });

    const updated = await withRetry(() => prisma.quest.update({
      where: { id },
      data: { reflection: reflection.trim() },
    }));

    res.json(updated);
  } catch (error) {
    logger.error('Reflection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/hunter/streak-ward:
 *   post:
 *     summary: Purchase a streak freeze ward with gold (#21/#61)
 *     tags: [Hunter]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ward purchased
 *       400:
 *         description: Insufficient gold or inventory full
 */
const STREAK_WARD_COST = 75;
const MAX_STREAK_WARDS = 3;

app.post('/api/hunter/streak-ward', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    const result = await prisma.$transaction(async (tx) => {
      const stats = await tx.hunterStats.findUnique({
        where: { userId },
        select: { id: true, gold: true, streakWards: true, streak: true },
      });
      if (!stats) throw new Error('USER_NOT_FOUND');
      if (stats.gold < STREAK_WARD_COST) throw new Error('INSUFFICIENT_GOLD');
      if (stats.streakWards >= MAX_STREAK_WARDS) throw new Error('WARDS_FULL');

      return tx.hunterStats.update({
        where: { userId },
        data: { gold: stats.gold - STREAK_WARD_COST, streakWards: { increment: 1 } },
        select: { id: true, gold: true, streakWards: true },
      });
    });

    // Ledger entry for the gold spend
    await withRetry(() =>
      prisma.$transaction(async (tx) =>
        recordLedgerEntry(tx as any, {
          userId,
          reason: 'STREAK_WARD',
          goldDelta: -STREAK_WARD_COST,
          description: `Purchased Streak Ward (${result.streakWards}/${MAX_STREAK_WARDS})`,
        })
      )
    );
    recordEconomyChange('streak_ward', 0, -STREAK_WARD_COST);

    await invalidateUserCache(userId);
    emitToUser(userId, 'stats:updated', result);

    const notif = await withRetry(() => prisma.notification.create({
      data: { userId, message: `Streak Ward purchased for ${STREAK_WARD_COST} gold. Your streak is insured.`, type: 'REWARD' },
      select: { id: true, message: true, type: true, createdAt: true },
    }));
    emitToUser(userId, 'notification:new', notif);

    res.json({ stats: result, message: `Streak Ward acquired (${result.streakWards}/${MAX_STREAK_WARDS}).` });
  } catch (error: any) {
    if (error?.message === 'INSUFFICIENT_GOLD') {
      return res.status(400).json({ error: `Insufficient gold (need ${STREAK_WARD_COST})` });
    }
    if (error?.message === 'WARDS_FULL') {
      return res.status(400).json({ error: `Ward inventory full (max ${MAX_STREAK_WARDS})` });
    }
    if (error?.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }
    logger.error('Streak ward error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/quests/{id}/flavor:
 *   get:
 *     summary: Get procedurally generated flavor text for a quest (#25)
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Flavor text
 */
app.get('/api/quests/:id/flavor', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const quest = await withRetry(() => prisma.quest.findFirst({
      where: { id, userId },
      select: { title: true, category: true, rank: true },
    }));
    if (!quest) return res.status(404).json({ error: 'Quest not found' });

    res.json({ flavor: generateFlavorText(quest.category, quest.rank, quest.title) });
  } catch (error) {
    logger.error('Flavor text error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// GDPR / Data Ownership Routes (data export + account deletion)
// ========================

/**
 * @swagger
 * /api/account/export:
 *   get:
 *     summary: Export all of the authenticated user's data (GDPR/CCPA data portability)
 *     tags: [Account]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full JSON export of the user's data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Internal server error
 */
app.get('/api/account/export', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    const [user, stats, quests, gates, dungeons, notifications, inventory, milestoneProgress, masteryProgress, userMementos, questDecisions, resourceUsage, knowledge, socialStats, subscription, payments, settings] =
      await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, displayName: true, hunterId: true, avatarUrl: true, createdAt: true, organizationId: true } }),
        prisma.hunterStats.findUnique({ where: { userId } }),
        prisma.quest.findMany({ where: { userId } }),
        prisma.gate.findMany({ where: { userId } }),
        prisma.dailyDungeon.findMany({ where: { userId } }),
        prisma.notification.findMany({ where: { userId } }),
        prisma.userInventory.findMany({ where: { userId } }),
        prisma.milestoneProgress.findMany({ where: { userId } }),
        prisma.masteryChallengeProgress.findMany({ where: { userId } }),
        prisma.userMemento.findMany({ where: { userId } }),
        prisma.questDecision.findMany({ where: { userId } }),
        prisma.resourceUsage.findMany({ where: { userId } }),
        prisma.knowledgeProgress.findUnique({ where: { userId } }),
        prisma.socialStats.findUnique({ where: { userId } }),
        prisma.subscription.findUnique({ where: { userId } }),
        prisma.payment.findMany({ where: { userId } }),
        prisma.userSettings.findUnique({ where: { userId } }),
      ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      format: 'solo-quest-data-export-v1',
      profile: user,
      stats,
      quests,
      gates,
      dailyDungeons: dungeons,
      notifications,
      inventory,
      milestoneProgress,
      masteryChallengeProgress: masteryProgress,
      unlockedMementos: userMementos,
      questDecisions,
      resourceUsage,
      knowledge,
      socialStats,
      subscription,
      payments,
      settings,
    };

    res.setHeader('Content-Disposition', `attachment; filename="solo-quest-export-${userId}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportPayload);
  } catch (error) {
    logger.error('Data export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/account:
 *   delete:
 *     summary: Soft-delete the authenticated user's account (GDPR right to erasure)
 *     description: Anonymizes PII and marks the account deleted. Economy history is retained in anonymized form for fraud prevention.
 *     tags: [Account]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
app.delete('/api/account', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Anonymize PII while keeping referential/economy history intact (fraud prevention)
    const anonSuffix = userId.slice(0, 8);
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted-${anonSuffix}@deleted.soloquest.invalid`,
        displayName: 'Deleted Hunter',
        avatarUrl: null,
        passwordHash: 'deleted',
      },
    });

    // Revoke all tokens issued before now ("logout everywhere"),
    // not just the current one — the user no longer exists.
    await revokeAllUserTokens(userId);
    logger.info(`All tokens revoked for deleted user ${userId}`, { requestId: req.id });

    // Revoke all active sessions/sockets for this user
    emitToUser(userId, 'account:deleted', { message: 'Account deleted' });

    logger.info(`Account soft-deleted and anonymized: user ${userId}`);
    res.json({ message: 'Account deleted successfully. Your personal data has been anonymized.' });
  } catch (error) {
    logger.error('Account deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/subscription/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe not initialized' });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      env.STRIPE_WEBHOOK_SECRET || ''
    );

    await handleWebhook(event);
    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

// HTTP request metrics for the /metrics endpoint
app.use((req: any, res: any, next: any) => {
  res.on('finish', () => {
    try {
      incrementCounter(
        'soloquest_http_requests_total',
        'Total HTTP requests',
        ['method', 'route', 'status'],
        [req.method, req.route?.path || req.path, String(res.statusCode)]
      );
    } catch {
      // metrics must never break a request
    }
  });
  next();
});

// Prometheus-style metrics endpoint (report fix #6)
app.get('/metrics', async (req, res) => {
  try {
    setGauge(
      'soloquest_websocket_connections',
      'Currently connected WebSocket clients',
      [],
      [],
      activeConnections.size
    );
    setGauge(
      'soloquest_process_uptime_seconds',
      'Process uptime in seconds',
      [],
      [],
      Math.floor(process.uptime())
    );
    const cacheStats = await getCacheStats();
    setGauge('soloquest_cache_keys', 'Cache key count', [], [], cacheStats.totalKeys);
    if (cacheStats.hitRate !== undefined) {
      setGauge('soloquest_cache_hit_rate_percent', 'Cache hit rate percentage', [], [], cacheStats.hitRate);
    }
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(renderMetrics());
  } catch (error) {
    logger.error('Metrics endpoint error:', error);
    res.status(500).send('# metrics unavailable');
  }
});

// NOTE: notFoundMiddleware and errorHandlerMiddleware are registered at the
// VERY END of this file (after the last route). Express dispatches strictly
// in registration order — registering them here would 404 every route
// defined below (review critical #1).

// Helper to get user ID from request
const getUserId = (req: any): string => {
  if (req.user && typeof req.user === 'object') {
    if ('userId' in req.user) {
      return (req.user as { userId: string }).userId;
    }
    if ('id' in req.user) {
      return (req.user as { id: string }).id;
    }
  }
  if (typeof req.user === 'string') {
    return req.user;
  }
  throw new Error('Invalid user object');
};

// ========================
// Game Logic Helpers
// ========================

const BASE_XP = 100;

const xpRequiredForLevel = (level: number): number => {
  return Math.floor(BASE_XP * Math.pow(level, 1.5));
};

const calculateLevelAndProgress = (xp: number) => {
  let level = 1;
  while (xp >= xpRequiredForLevel(level + 1)) {
    level++;
  }
  const xpForNextLevel = xpRequiredForLevel(level + 1);
  const xpForCurrentLevel = xpRequiredForLevel(level);
  // Clamp at 0: new hunters start below the curve's level-1 threshold (100 XP),
  // which previously produced a negative progressPercent
  const xpInCurrentLevel = Math.max(0, xp - xpForCurrentLevel);
  const xpToNext = Math.max(0, xpForNextLevel - xp); // Actual remaining XP needed
  const levelBandWidth = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = levelBandWidth === 0 ? 100 : Math.min(100, Math.max(0, (xpInCurrentLevel / levelBandWidth) * 100));
  return { level, xpToNext, progressPercent };
};

const getRankFromLevel = (level: number): string => {
  if (level <= 4) return 'E';
  if (level <= 9) return 'D';
  if (level <= 14) return 'C';
  if (level <= 19) return 'B';
  if (level <= 24) return 'A';
  return 'S';
};

// Anti-grind mechanics: Calculate diminishing returns for repeated quest completion
const calculateDiminishingReturns = (
  questType: string,
  recentCompletions: Array<{ type: string; timestamp: number }>,
  baseReward: number
): number => {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  // Count completions of this quest type in the last 24 hours
  const recentCount = recentCompletions.filter(
    q => q.type === questType && (now - q.timestamp) < oneDayMs
  ).length;
  
  // Apply diminishing returns: 100%, 80%, 60%, 40%, 20% of base reward
  const multiplier = Math.max(0.2, 1 - (recentCount * 0.2));
  return Math.floor(baseReward * multiplier);
};

// Dynamic difficulty adjustment based on player performance
const calculateDynamicDifficulty = (
  playerLevel: number,
  recentSuccessRate: number,
  questRank: string
): number => {
  const rankMultiplier: Record<string, number> = {
    E: 0.5, D: 0.7, C: 1.0, B: 1.3, A: 1.6, S: 2.0,
  };
  
  const successAdjustment = recentSuccessRate > 0.8 ? 1.2 : 
                           recentSuccessRate < 0.4 ? 0.8 : 1.0;
  
  const levelScaling = Math.min(1.5, 1 + (playerLevel * 0.02));
  
  return (rankMultiplier[questRank] || 1.0) * successAdjustment * levelScaling;
};

// Dual-purpose quest system for emergent gameplay
const calculateDualPurposeBonus = (
  completionContext: {
    isDaily: boolean;
    contributesToStreak: boolean;
    unlocksLore: boolean;
    completesAchievement: boolean;
  }
): { xpBonus: number; goldBonus: number } => {
  let xpBonus = 0;
  let goldBonus = 0;
  
  const purposesServed = Object.values(completionContext).filter(Boolean).length;
  
  if (purposesServed >= 2) {
    xpBonus += 15;
    goldBonus += 10;
  }
  
  if (purposesServed >= 3) {
    xpBonus += 25;
    goldBonus += 20;
  }
  
  return { xpBonus, goldBonus };
};

// Side quest variety system
const calculateVarietyBonus = (
  recentQuestTypes: string[],
  currentQuestType: string
): number => {
  const uniqueTypes = new Set(recentQuestTypes).size;
  const totalRecent = recentQuestTypes.length;
  
  if (uniqueTypes >= 4 && totalRecent >= 5) {
    return 20;
  }
  
  if (uniqueTypes >= 3 && totalRecent >= 4) {
    return 10;
  }
  
  const sameTypeCount = recentQuestTypes.filter(t => t === currentQuestType).length;
  if (sameTypeCount >= 3) {
    return -10;
  }
  
  return 0;
};

// Progression scaling for balanced rewards
const calculateScaledReward = (
  baseReward: number,
  playerLevel: number,
  questRank: string
): number => {
  const levelScaling = Math.min(2.0, 1 + (playerLevel * 0.05));
  
  const rankMultiplier: Record<string, number> = {
    E: 0.8, D: 0.9, C: 1.0, B: 1.2, A: 1.5, S: 2.0,
  };
  
  return Math.floor(baseReward * levelScaling * (rankMultiplier[questRank] || 1.0));
};

// Reward tables moved to economy.ts (versioned single source of truth,
// report fix #3) — aliased here so existing call sites stay untouched.
const baseXpByRank: Record<string, number> = BASE_XP_BY_RANK;
const baseGoldByRank: Record<string, number> = BASE_GOLD_BY_RANK;

// ========================
// Gameplay Systems Helpers (combo, loot, speedrun, stats, flavor, adaptive)
// ========================

/** Map quest categories to the character stat they train. */
const categoryToStat: Record<string, string> = {
  Combat: 'statStrength',
  Fitness: 'statStrength',
  Health: 'statEndurance',
  Survival: 'statEndurance',
  Intel: 'statIntelligence',
  Study: 'statIntelligence',
  Work: 'statIntelligence',
  Craft: 'statAgility',
  Chores: 'statAgility',
  Social: 'statLuck',
  Wildcard: 'statLuck',
};

/**
 * Daily combo/momentum multiplier (#4). Resets each day; caps at 1.5x.
 * comboCount = completions already made today BEFORE this one.
 */
const calculateComboMultiplier = (comboCount: number, lastComboDate: Date | null, now = new Date()): number => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const comboDay = lastComboDate ? new Date(lastComboDate) : null;
  const isSameDay = comboDay !== null && !Number.isNaN(comboDay.getTime()) && comboDay.setHours(0, 0, 0, 0) === today.getTime();
  const effectiveCombo = isSameDay ? comboCount : 0;
  return Math.min(1.5, 1 + effectiveCombo * 0.1);
};

/**
 * Randomized loot drops (#13) — variable-ratio reinforcement.
 * ~35% base chance, boosted by high rank. Drop pool is cosmetic-flavored, no pay-to-win.
 */
const LOOT_TABLE: Array<{ id: string; name: string; rarity: string; emoji: string }> = [
  { id: 'essence', name: 'Mana Essence', rarity: 'common', emoji: '💧' },
  { id: 'shard', name: 'Crystal Shard', rarity: 'common', emoji: '🔷' },
  { id: 'ember', name: 'Hunter Ember', rarity: 'common', emoji: '🔥' },
  { id: 'relic', name: 'Ancient Relic', rarity: 'rare', emoji: '🗿' },
  { id: 'grimoire', name: 'Sealed Grimoire', rarity: 'rare', emoji: '📖' },
  { id: 'core', name: 'Gate Core', rarity: 'epic', emoji: '🔮' },
];

const rollLootDrop = (rank: string, rng: () => number = Math.random): { dropped: boolean; item?: typeof LOOT_TABLE[0] } => {
  const rankBoost: Record<string, number> = { E: 0, D: 0.02, C: 0.05, B: 0.08, A: 0.12, S: 0.18 };
  const chance = 0.35 + (rankBoost[rank] ?? 0);
  if (rng() >= chance) return { dropped: false };
  // Weighted pick: commons are more likely
  const weights: Record<string, number> = { common: 5, rare: 3, epic: 1 };
  const pool = LOOT_TABLE.flatMap(item => Array(weights[item.rarity] ?? 1).fill(item) as typeof LOOT_TABLE);
  const item = pool[Math.floor(rng() * pool.length)];
  return { dropped: true, item };
};

/**
 * Speedrun bonus (#34): completing ahead of a deadline pays a fast-completion bonus.
 * ratio < 0.5 => +25%, < 0.75 => +10%, otherwise none.
 */
const calculateSpeedrunBonus = (quest: { createdAt: Date | string; deadline?: Date | string | null }, now = new Date()): number => {
  if (!quest.deadline) return 0;
  const created = new Date(quest.createdAt).getTime();
  const deadline = new Date(quest.deadline).getTime();
  if (Number.isNaN(created) || Number.isNaN(deadline) || deadline <= created) return 0;
  const ratio = (now.getTime() - created) / (deadline - created);
  if (ratio < 0.5) return 0.25;
  if (ratio < 0.75) return 0.1;
  return 0;
};

/** Growth applied to the stat trained by the quest's category (#3). */
const calculateStatGrowth = (category: string, rank: string): number => {
  const rankGrowth: Record<string, number> = { E: 1, D: 1, C: 2, B: 2, A: 3, S: 5 };
  return categoryToStat[category] ? (rankGrowth[rank] ?? 1) : 0;
};

/** HP recovery based on quest rank - higher ranks restore more HP. */
const calculateHpRecovery = (rank: string): number => {
  const rankRecovery: Record<string, number> = { E: 2, D: 3, C: 4, B: 5, A: 7, S: 10 };
  return rankRecovery[rank] ?? 2;
};

/** Procedural flavor text (#25) — deterministic per quest, no storage needed. */
const FLAVOR_OPENERS: Record<string, string[]> = {
  Combat: ['A shadow stirs', 'Steel your nerves', 'The arena calls'],
  Intel: ['A riddle beckons', 'Knowledge is a blade', 'The archive hums'],
  Craft: ['Shape the raw chaos', 'Your forge awaits', 'Precision is power'],
  Survival: ['Endure the trial', 'The wilds test you', 'Breath by breath'],
  Social: ['Allies are strength', 'A word opens doors', 'The guild watches'],
  Wildcard: ['Fate deals a hand', 'Expect nothing', 'Chance favors you'],
};

const FLAVOR_CLOSERS = [
  'Complete it to claim the rewards.',
  'The System will judge your effort.',
  'Rise to the challenge, Hunter.',
  'Victory awaits beyond the gate.',
];

const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const generateFlavorText = (category: string, rank: string, title: string): string => {
  const openers = FLAVOR_OPENERS[category] ?? FLAVOR_OPENERS.Wildcard;
  const opener = openers[hashString(title) % openers.length];
  const closer = FLAVOR_CLOSERS[hashString(title + rank) % FLAVOR_CLOSERS.length];
  return `${opener} — a Rank ${rank} challenge. ${closer}`;
};

/**
 * Adaptive difficulty (#2, #78): suggest a quest rank band from self-reported energy (1-5).
 * Low energy => easier quests so users keep momentum; high energy => stretch goals.
 */
const suggestRankForEnergy = (energy: number): { minRank: string; maxRank: string; label: string } => {
  if (energy <= 2) return { minRank: 'E', maxRank: 'D', label: 'Take it easy — low-rank quests only.' };
  if (energy === 3) return { minRank: 'D', maxRank: 'C', label: 'Steady pace — D and C-rank quests.' };
  if (energy === 4) return { minRank: 'C', maxRank: 'A', label: 'Good energy — C to A-rank quests.' };
  return { minRank: 'B', maxRank: 'S', label: 'Peak condition — hunt big game today!' };
};

/**
 * Streak insurance (#21/#61): compute a failure penalty, consuming a streak ward
 * if the hunter has one. A ward shields the streak (and only the streak) from the
 * penalty; HP loss still applies. Forgiving mode never touches streaks or wards.
 */
const applyFailurePenalty = (
  stats: { hp: number; hpMax: number; streak: number; streakWards: number; exp: number },
  penaltySeverity: string
): { hp: number; streak: number; streakWards: number; wardUsed: boolean } => {
  if (penaltySeverity === 'forgiving') {
    return { hp: stats.hp, streak: stats.streak, streakWards: stats.streakWards, wardUsed: false };
  }

  const hpPenalty = penaltySeverity === 'hardcore' ? 10 : 5;
  const newHp = Math.max(stats.hp - hpPenalty, 0);

  // Ward shields the streak: consume one instead of resetting it
  if (stats.streakWards > 0) {
    return { hp: newHp, streak: stats.streak, streakWards: stats.streakWards - 1, wardUsed: true };
  }
  return { hp: newHp, streak: 0, streakWards: stats.streakWards, wardUsed: false };
};

// ========================
// Health check
// ========================

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========================
// Auth routes
// ========================

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - displayName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               displayName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/auth/register', createRateLimitMiddleware('auth'), async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Input validation
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (typeof displayName !== 'string' || displayName.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid display name' });
    }

    const existingUser = await withRetry(() => prisma.user.findUnique({ where: { email } }));
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await withRetry(() => prisma.user.create({
      data: {
        email: email.trim(),
        displayName: displayName.trim(),
        passwordHash,
        hunterId: `HNT-${Math.floor(1000 + Math.random() * 9000)}`,
      }
    }));

    await withRetry(() => prisma.hunterStats.create({
      data: {
        userId: user.id,
        level: 1,
        exp: 0,
        expToNext: 100,
        rank: 'E',
        hp: 100,
        hpMax: 100,
        gold: 50,
        streak: 0,
        longestStreak: 0,
        statStrength: 5,
        statAgility: 5,
        statIntelligence: 5,
        statEndurance: 5,
        statLuck: 5,
      }
    }));

    await withRetry(() => prisma.dailyDungeon.create({
      data: {
        userId: user.id,
        name: 'Morning Protocol',
        shift: 'MORNING',
        active: true,
      }
    }));

    const token = signToken(user.id, user.role);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        hunterId: user.hunterId,
        role: user.role,
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', createRateLimitMiddleware('auth'), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const user = await withRetry(() => prisma.user.findUnique({ where: { email } }));
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.deletedAt) {
      return res.status(401).json({ error: 'This account has been deleted' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user.id, user.role);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        hunterId: user.hunterId,
        role: user.role,
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Revoke the current access token (logout)
 *     description: Adds the token's jti to the revocation blocklist so it cannot be reused even though its signature remains valid until expiry.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token revoked
 */
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const payload = req.user as { jti?: string } | undefined;
    if (payload?.jti) {
      await revokeTokenJti(payload.jti);
      logger.info('Token revoked on logout', { requestId: req.id });
    }
    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Hunter routes
// ========================

/**
 * @swagger
 * /api/hunter/me:
 *   get:
 *     summary: Get current hunter profile and stats
 *     tags: [Hunter]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hunter profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hunter:
 *                   $ref: '#/components/schemas/Hunter'
 *                 stats:
 *                   $ref: '#/components/schemas/HunterStats'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/hunter/me', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const cacheKey = `user:${userId}`;

    const cached = await getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const user = await withRetry(() => prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        hunterId: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        deletedAt: true,
        role: true,
        hunterStats: {
          select: {
            level: true,
            exp: true,
            expToNext: true,
            rank: true,
            hp: true,
            hpMax: true,
            gold: true,
            streak: true,
            longestStreak: true,
            streakWards: true,
            statStrength: true,
            statAgility: true,
            statIntelligence: true,
            statEndurance: true,
            statLuck: true,
            hunterClass: true,
            comboCount: true,
            lastEnergyLevel: true,
            lastMoodLevel: true,
            lastCheckInAt: true,
            progressPercent: true,
            userId: true,
            lastActiveDate: true,
          }
        }
      }
    }));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if ((user as any).deletedAt) {
      return res.status(401).json({ error: 'Account deleted' });
    }

    const userData = {
      id: user.id,
      hunterId: user.hunterId,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      role: (user as any).role || 'USER',
      stats: user.hunterStats
    };

    await setCache(cacheKey, userData, 2 * 60 * 1000); // Cache for 2 minutes
    res.json(userData);
  } catch (error) {
    logger.error('Get hunter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Hunter log heatmap (#30): per-day quest completion counts for the last year.
// Uses the existing @@index([userId, completedAt]) — no scan of the quest table body.
app.get('/api/hunter/activity-log', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const cacheKey = `activity-log:${userId}`;

    const cached = await getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 364); // 365 calendar days including today

    const grouped = await withRetry(() =>
      prisma.quest.groupBy({
        by: ['completedAt'],
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: since, not: null },
          deletedAt: null,
        },
        _count: { _all: true },
      })
    );

    // SQLite stores timestamps with ms precision — normalize each completion to
    // its local calendar day (UTC-agnostic: client renders its own local grid).
    const byDay = new Map<string, number>();
    for (const row of grouped) {
      const d = row.completedAt;
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      byDay.set(key, (byDay.get(key) ?? 0) + row._count._all);
    }

    const response = {
      days: Array.from(byDay.entries()).map(([date, count]) => ({ date, count })),
      generatedAt: new Date().toISOString(),
    };

    // Hourly cache: the log only changes when a quest completes.
    await setCache(cacheKey, response, 60 * 60 * 1000);
    res.json(response);
  } catch (error) {
    logger.error('Activity log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/hunter/me', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { displayName, avatarUrl } = req.body;

    // Input validation
    if (displayName !== undefined && (typeof displayName !== 'string' || displayName.trim().length === 0)) {
      return res.status(400).json({ error: 'Invalid display name' });
    }

    const user = await withRetry(() => prisma.user.update({
      where: { id: userId },
      data: {
        displayName: displayName ? displayName.trim() : undefined,
        avatarUrl: avatarUrl ?? undefined,
      }
    }));

    // Invalidate cache for this user
    await invalidateUserCache(userId);

    res.json({
      id: user.id,
      hunterId: user.hunterId,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    logger.error('Update hunter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Quest routes
// ========================

/**
 * @swagger
 * /api/quests:
 *   get:
 *     summary: Get all quests for authenticated user
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Quests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Quest'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/quests', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { status, gateId, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Validate pagination parameters
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    const cacheKey = `quests:${userId}:${status || 'all'}:${gateId || 'none'}:${page}:${limit}`;
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const where: any = { userId };
    if (status) where.status = status as any;
    if (gateId) where.gateId = gateId as string;

    const [quests, total] = await Promise.all([
      withRetry(() => prisma.quest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          title: true,
          rank: true,
          category: true,
          status: true,
          deadline: true,
          notes: true,
          gateId: true,
          isBossQuest: true,
          expReward: true,
          goldReward: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          gate: {
            select: {
              id: true,
              name: true,
              rank: true,
            }
          },
          subtasks: {
            select: {
              id: true,
              title: true,
              completed: true,
              position: true,
            }
          }
        }
      })),
      withRetry(() => prisma.quest.count({ where }))
    ]);

    const response = {
      data: quests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      }
    };

    await setCache(cacheKey, response, 1 * 60 * 1000); // Cache for 1 minute
    res.json(response);
  } catch (error) {
    logger.error('Get quests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/quests:
 *   post:
 *     summary: Create a new quest
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - rank
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               rank:
 *                 type: string
 *                 enum: [E, D, C, B, A, S]
 *               deadline:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Quest created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quest'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/quests', authenticateToken, createRateLimitMiddleware('createQuest'), async (req, res) => {
  try {
    const userId = getUserId(req);
    const { title, rank, category, status, deadline, notes, gateId, isBossQuest, expReward, goldReward } = req.body;

    // Input validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const questRank = rank || 'E';
    // Always calculate rewards server-side based on rank to prevent economy exploits
    const calculatedExpReward = baseXpByRank[questRank] ?? 10;
    const calculatedGoldReward = baseGoldByRank[questRank] ?? 5;

    const quest = await withRetry(() => prisma.quest.create({
      data: {
        userId,
        title: title.trim(),
        rank: questRank,
        category: category || 'Wildcard',
        status: status || 'SHADOW',
        deadline: deadline ? new Date(deadline) : undefined,
        notes: notes?.trim(),
        gateId: gateId || null,
        isBossQuest: !!isBossQuest,
        expReward: calculatedExpReward,
        goldReward: calculatedGoldReward,
      },
      include: { gate: true, subtasks: true }
    }));

    // Invalidate quest caches for this user
    await deleteCachePattern(`quests:${userId}:*`);

    emitToUser(userId, 'quest:created', quest);
    res.status(201).json(quest);
  } catch (error) {
    logger.error('Create quest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/quests/:id', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { title, rank, category, status, deadline, notes, gateId, isBossQuest, completedAt } = req.body;

    // Input validation
    if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
      return res.status(400).json({ error: 'Invalid title' });
    }

    const existingQuest = await withRetry(() => prisma.quest.findFirst({ where: { id, userId } }));
    if (!existingQuest) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    // Calculate rewards server-side if rank is being changed
    const newRank = rank ?? existingQuest.rank;
    const newExpReward = baseXpByRank[newRank] ?? 10;
    const newGoldReward = baseGoldByRank[newRank] ?? 5;

    let quest = await withRetry(() => prisma.quest.update({
      where: { id },
      data: {
        title: title ? title.trim() : undefined,
        rank: rank ?? undefined,
        category: category ?? undefined,
        // Status is intentionally excluded for COMPLETED transitions: the reward
        // transaction below claims the completion atomically (#183 race guard).
        // ARCHIVED is handled separately (no rewards, just status change).
        status: (status === 'COMPLETED' || status === 'ARCHIVED') ? undefined : status,
        deadline: deadline ? new Date(deadline) : undefined,
        notes: notes ? notes.trim() : undefined,
        gateId: gateId ?? undefined,
        isBossQuest: isBossQuest ?? undefined,
        expReward: newExpReward,
        goldReward: newGoldReward,
        completedAt: status === 'COMPLETED' ? undefined : (completedAt ? new Date(completedAt) : undefined),
        updatedAt: new Date(),
      },
      include: { gate: true, subtasks: true }
    }));

    // Invalidate quest caches for this user
    await deleteCachePattern(`quests:${userId}:*`);

    // Handle ARCHIVED status (no rewards, just status change)
    if (status === 'ARCHIVED' && existingQuest.status !== 'ARCHIVED') {
      await prisma.quest.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });
      emitToUser(userId, 'quest:updated', { ...quest, status: 'ARCHIVED' });
      return res.json(quest);
    }

    // If quest was completed, award rewards server-side with transaction
    if (status === 'COMPLETED' && existingQuest.status !== 'COMPLETED') {
      // Idempotent-replay guard (report fix #88): a repeated completion with
      // the same Idempotency-Key replays the original response instead of
      // re-running the reward path. (The atomic claim below is the backstop
      // for clients that don't send keys — double-clicks claim zero rows.)
      if (typeof req.headers['idempotency-key'] === 'string' && req.headers['idempotency-key'].length >= 8) {
        const replay = await getIdempotentResponse(userId, req.headers['idempotency-key']);
        if (replay) {
          res.setHeader('Idempotent-Replay', 'true');
          return res.status(replay.statusCode).json(JSON.parse(replay.responseJson));
        }
        req.idempotencyKey = req.headers['idempotency-key'];
      }

      await prisma.$transaction(async (tx) => {
        // Atomic completion claim (#183): only the first request that flips the
        // status wins the rewards; concurrent duplicate requests claim zero rows.
        const claimed = await tx.quest.updateMany({
          where: { id: existingQuest.id, status: { not: 'COMPLETED' } },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        if (claimed.count === 0) return;

        const stats = await tx.hunterStats.findUnique({ where: { userId } });
        if (stats) {
          // Get recent quest completions for anti-grind and variety calculations
          const recentQuests = await tx.quest.findMany({
            where: {
              userId,
              status: 'COMPLETED',
              completedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            },
            select: { category: true, completedAt: true },
            orderBy: { completedAt: 'desc' },
            take: 10
          });

          const recentCompletions = recentQuests.map(q => ({
            type: q.category,
            timestamp: q.completedAt ? new Date(q.completedAt).getTime() : Date.now()
          }));

          const recentQuestTypes = recentQuests.map(q => q.category);

          // Apply game design improvements
          let finalXpReward = existingQuest.expReward;
          let finalGoldReward = existingQuest.goldReward;

          // Anti-grind mechanics
          finalXpReward = calculateDiminishingReturns(
            existingQuest.category,
            recentCompletions,
            finalXpReward
          );

          // Side quest variety bonus
          const varietyBonus = calculateVarietyBonus(recentQuestTypes, existingQuest.category);
          finalXpReward += varietyBonus;
          finalGoldReward += Math.floor(varietyBonus / 2);

          // Progression scaling
          finalXpReward = calculateScaledReward(finalXpReward, stats.level, existingQuest.rank);
          finalGoldReward = calculateScaledReward(finalGoldReward, stats.level, existingQuest.rank);

          // Daily combo/momentum multiplier (#4)
          const nowDate = new Date();
          const comboMult = calculateComboMultiplier(stats.comboCount, stats.comboDate, nowDate);
          finalXpReward = Math.round(finalXpReward * comboMult);
          finalGoldReward = Math.round(finalGoldReward * comboMult);

          // Speedrun bonus (#34)
          const speedrunBonusRate = calculateSpeedrunBonus(
            { createdAt: existingQuest.createdAt, deadline: existingQuest.deadline },
            nowDate
          );
          if (speedrunBonusRate > 0) {
            finalXpReward = Math.round(finalXpReward * (1 + speedrunBonusRate));
            finalGoldReward = Math.round(finalGoldReward * (1 + speedrunBonusRate));
          }

          // Randomized loot drop (#13)
          const loot = rollLootDrop(existingQuest.rank);

          // Category-trained stat growth (#3)
          const statField = categoryToStat[existingQuest.category];
          const statGain = calculateStatGrowth(existingQuest.category, existingQuest.rank);
          
          // Combo bookkeeping: continue streak-of-day or start a new one
          const todayStart = new Date(nowDate);
          todayStart.setHours(0, 0, 0, 0);

          // HP recovery only on first quest completion of the day to prevent HP farming
          const lastActiveDateForStreak = stats.lastActiveDate ? new Date(stats.lastActiveDate) : null;
          const isFirstQuestToday = !lastActiveDateForStreak || 
            new Date(lastActiveDateForStreak.setHours(0, 0, 0, 0)).getTime() !== todayStart.getTime();
          
          const hpRecovery = isFirstQuestToday ? calculateHpRecovery(existingQuest.rank) : 0;

          const comboDay = stats.comboDate ? new Date(stats.comboDate) : null;
          const isSameDay = comboDay && !Number.isNaN(comboDay.getTime()) && comboDay.setHours(0, 0, 0, 0) === todayStart.getTime();
          const newComboCount = isSameDay ? stats.comboCount + 1 : 1;

          // Streak bookkeeping: increment daily streak on quest completion
          // Check if this is the first quest completed today to determine streak increment
          const yesterday = new Date(todayStart);
          yesterday.setDate(yesterday.getDate() - 1);
          
          // Dual-purpose bonus: determine if this quest contributes to streak
          // A quest contributes if it's a daily quest OR if the user was active yesterday
          const lastActiveDateCopy = lastActiveDateForStreak ? new Date(lastActiveDateForStreak) : null;
          const wasActiveYesterday = lastActiveDateCopy !== null && 
            new Date(lastActiveDateCopy.setHours(0, 0, 0, 0)).getTime() === yesterday.getTime();
          const contributesToStreak = existingQuest.deadline !== null || wasActiveYesterday;
          
          const dualPurposeBonus = calculateDualPurposeBonus({
            isDaily: existingQuest.deadline !== null,
            contributesToStreak: contributesToStreak,
            unlocksLore: false, // Could be expanded with lore system
            completesAchievement: false // Could be expanded with achievement system
          });
          finalXpReward += dualPurposeBonus.xpBonus;
          finalGoldReward += dualPurposeBonus.goldBonus;
          
          // Calculate new streak value
          let newStreak = stats.streak;
          if (lastActiveDateForStreak) {
            lastActiveDateForStreak.setHours(0, 0, 0, 0);
            // If last active was yesterday or today, continue streak
            if (lastActiveDateForStreak.getTime() === yesterday.getTime() || lastActiveDateForStreak.getTime() === todayStart.getTime()) {
              // Only increment if this is the first quest completed today
              if (lastActiveDateForStreak.getTime() !== todayStart.getTime()) {
                newStreak = stats.streak + 1;
              }
            } else if (lastActiveDateForStreak.getTime() < yesterday.getTime()) {
              // Streak broken - start new streak
              newStreak = 1;
            }
          } else {
            // First ever quest
            newStreak = 1;
          }

          const newExp = stats.exp + finalXpReward;
          const newGold = stats.gold + finalGoldReward;
          const { level, xpToNext, progressPercent } = calculateLevelAndProgress(newExp);
          const newRank = getRankFromLevel(level);
          const oldLevel = stats.level;

          const updatedStats = await tx.hunterStats.update({
            where: { userId },
            data: {
              exp: newExp,
              expToNext: xpToNext,
              progressPercent: progressPercent,
              gold: newGold,
              level,
              rank: newRank,
              hp: Math.min(stats.hp + hpRecovery, stats.hpMax),
              comboCount: newComboCount,
              comboDate: nowDate,
              streak: newStreak,
              longestStreak: Math.max(stats.longestStreak, newStreak),
              ...(statField && statGain > 0 ? { [statField]: { increment: statGain } } : {}),
              lastActiveDate: nowDate,
            },
          });

          // Ledger entry (report fix #2): the reward is now auditable and
          // reconcilable against the cached HunterStats balances.
          await recordLedgerEntry(tx as any, {
            userId,
            reason: 'QUEST_COMPLETED',
            xpDelta: finalXpReward,
            goldDelta: finalGoldReward,
            description: `Completed quest "${existingQuest.title}" (rank ${existingQuest.rank})`,
            referenceType: 'Quest',
            referenceId: existingQuest.id,
          });

          // Persist loot drop on the quest record for the client to render
          if (loot.dropped && loot.item) {
            await tx.quest.update({
              where: { id: existingQuest.id },
              data: { lootDropped: JSON.stringify(loot.item) },
            });
          }

          // Invalidate user cache
          await invalidateUserCache(userId);

          recordEconomyChange('quest_completion', finalXpReward, finalGoldReward);

          emitToUser(userId, 'stats:updated', updatedStats);

          // Enhanced notification with bonus breakdown
          let bonusMessage = '';
          if (comboMult > 1) bonusMessage += ` Combo x${comboMult.toFixed(1)}`;
          if (speedrunBonusRate > 0) bonusMessage += ` Speedrun +${Math.round(speedrunBonusRate * 100)}%`;
          if (varietyBonus > 0) bonusMessage += ` Variety +${varietyBonus} XP`;
          if (dualPurposeBonus.xpBonus > 0) bonusMessage += ` Dual-purpose +${dualPurposeBonus.xpBonus} XP`;
          if (loot.dropped && loot.item) bonusMessage += ` Loot: ${loot.item.emoji} ${loot.item.name} (${loot.item.rarity})`;
          if (statField && statGain > 0) bonusMessage += ` ${statField.replace('stat', '')} +${statGain}`;
          
          const notif = await tx.notification.create({
            data: {
              userId,
              message: `Quest "${existingQuest.title}" completed! XP +${finalXpReward}${bonusMessage}. Gold +${finalGoldReward}.`,
              type: 'REWARD',
            },
          });
          emitToUser(userId, 'notification:new', notif);

          // Push the loot drop as its own real-time event for the battle-payoff UI
          if (loot.dropped && loot.item) {
            emitToUser(userId, 'loot:dropped', loot.item);
          }

          if (level > oldLevel) {
            const levelNotif = await tx.notification.create({
              data: {
                userId,
                message: `Level Up! You are now Level ${level} (Rank ${newRank})!`,
                type: 'REWARD',
              },
            });
            emitToUser(userId, 'level:up', { level, rank: newRank });
            emitToUser(userId, 'notification:new', levelNotif);
          }
        }
      });
    }

    // If quest failed, apply penalty based on user settings
    if (status === 'FAILED' && existingQuest.status !== 'FAILED') {
      // Get user settings for penalty severity
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
      });

      const penaltySeverity = userSettings?.penaltySeverity || 'forgiving';

      // Only apply penalties if not in forgiving mode
      if (penaltySeverity !== 'forgiving') {
        await prisma.$transaction(async (tx) => {
          const stats = await tx.hunterStats.findUnique({ where: { userId } });
          if (stats) {
            const { level, xpToNext, progressPercent } = calculateLevelAndProgress(stats.exp);
            
            // Streak ward insurance (#21/#61): a ward shields the streak from the reset
            const penalty = applyFailurePenalty(stats, penaltySeverity);

            const updatedStats = await tx.hunterStats.update({
              where: { userId },
              data: {
                hp: penalty.hp,
                streak: penalty.streak,
                streakWards: penalty.streakWards,
                level,
                expToNext: xpToNext,
                progressPercent: progressPercent,
              },
            });

            // Invalidate user cache
            await invalidateUserCache(userId);

            emitToUser(userId, 'stats:updated', updatedStats);

            const notif = await tx.notification.create({
              data: {
                userId,
                message: penalty.wardUsed
                  ? `Quest "${existingQuest.title}" failed. A Streak Ward absorbed the penalty — your ${penalty.streak}-day streak survives (${penalty.streakWards} ward${penalty.streakWards === 1 ? '' : 's'} left). HP -${penaltySeverity === 'hardcore' ? 10 : 5}.`
                  : `Quest "${existingQuest.title}" failed. ${penaltySeverity === 'hardcore' ? 'HP -10, streak reset' : penaltySeverity === 'moderate' ? 'Streak reset' : 'No penalties'}.`,
                type: 'PENALTY',
              },
            });
            emitToUser(userId, 'notification:new', notif);
          }
        });

        // Re-fetch: the completion claim inside the transaction changed the quest row
        // (quest existence was verified at the top of the handler, hence the assertion)
        quest = await withRetry(() => prisma.quest.findUnique({
          where: { id },
          include: { gate: true, subtasks: true },
        })) as typeof quest;
      }
    }

    emitToUser(userId, 'quest:updated', quest);

    // Guild boss auto-strike (#96): a fresh completion automatically lands one
    // strike on the guild's active boss — no manual quest-ID input needed.
    // Runs after the reward transaction committed; the shared helper re-checks
    // eligibility atomically, so this is safe on replays and double calls.
    if (status === 'COMPLETED' && existingQuest.status !== 'COMPLETED' && quest) {
      try {
        const strike = await attemptBossStrike(userId, quest.id);
        if (strike.outcome === 'struck') {
          emitToUser(userId, 'boss:updated', {
            bossId: undefined,
            damage: strike.damage,
            hpRemaining: strike.hpRemaining,
            defeated: strike.defeated,
            by: userId,
          });
          const notif = await withRetry(() => prisma.notification.create({
            data: {
              userId,
              message: strike.defeated
                ? `${strike.bossName} has been defeated! Your guild brought it down.`
                : `Your strike hit ${strike.bossName} for ${strike.damage} damage (${strike.hpRemaining} HP remaining).`,
              type: 'BOSS',
            },
          }));
          emitToUser(userId, 'notification:new', notif);
        }
        // Other outcomes (no guild / no boss / stale quest) are silently fine:
        // completion must always succeed regardless of boss state.
      } catch (strikeError) {
        // A boss-strike failure must never fail the quest completion.
        logger.error('Auto boss strike error:', strikeError);
      }
    }

    // Record the completion response for idempotent replay if a key was sent
    await captureIdempotentResponse(req, res, quest);

    res.json(quest);
  } catch (error) {
    logger.error('Update quest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/quests/:id', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const existingQuest = await withRetry(() => prisma.quest.findFirst({ where: { id, userId } }));
    if (!existingQuest) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    // Prevent deletion of overdue quests to avoid failure penalty
    if (existingQuest.deadline && existingQuest.status !== 'COMPLETED') {
      const now = new Date();
      const deadline = new Date(existingQuest.deadline);
      if (now > deadline) {
        // Get user settings for penalty severity
        const userSettings = await prisma.userSettings.findUnique({
          where: { userId },
        });

        const penaltySeverity = userSettings?.penaltySeverity || 'forgiving';

        // Auto-fail the overdue quest first
        await prisma.$transaction(async (tx) => {
          // Only apply penalties if not in forgiving mode
          if (penaltySeverity !== 'forgiving') {
            const stats = await tx.hunterStats.findUnique({ where: { userId } });
            if (stats) {
              const { level, xpToNext, progressPercent } = calculateLevelAndProgress(stats.exp);

              // Streak ward insurance (#21/#61): a ward shields the streak here too
              const penalty = applyFailurePenalty(stats, penaltySeverity);

              await tx.hunterStats.update({
                where: { userId },
                data: {
                  hp: penalty.hp,
                  streak: penalty.streak,
                  streakWards: penalty.streakWards,
                  level,
                  expToNext: xpToNext,
                  progressPercent: progressPercent,
                },
              });
            }
          }
          
          await tx.quest.update({
            where: { id },
            data: { status: 'FAILED' },
          });
        });
        
        return res.status(400).json({ 
          error: 'Cannot delete overdue quest. It has been auto-failed.',
          penaltySeverity,
          message: penaltySeverity === 'forgiving' ? 'No penalties applied' : 'Penalties applied based on your settings'
        });
      }
    }

    await withRetry(() => prisma.questSubtask.deleteMany({ where: { questId: id } }));
    await withRetry(() => prisma.quest.delete({ where: { id } }));

    res.status(204).send();
  } catch (error) {
    logger.error('Delete quest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Quest Subtask routes
// ========================

app.post('/api/quests/:questId/subtasks', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { questId } = req.params;
    const { title } = req.body;

    // Input validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const quest = await withRetry(() => prisma.quest.findFirst({ where: { id: questId, userId } }));
    if (!quest) return res.status(404).json({ error: 'Quest not found' });

    const maxPos = await withRetry(() => prisma.questSubtask.aggregate({
      where: { questId },
      _max: { position: true },
    }));

    const subtask = await withRetry(() => prisma.questSubtask.create({
      data: { questId, title: title.trim(), position: (maxPos._max.position ?? -1) + 1 },
    }));

    res.status(201).json(subtask);
  } catch (error) {
    logger.error('Create subtask error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/quests/:questId/subtasks/:id', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { questId, id } = req.params;
    const { title, completed } = req.body;

    // Input validation
    if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
      return res.status(400).json({ error: 'Invalid title' });
    }

    const quest = await withRetry(() => prisma.quest.findFirst({ where: { id: questId, userId } }));
    if (!quest) return res.status(404).json({ error: 'Quest not found' });

    const subtask = await withRetry(() => prisma.questSubtask.update({
      where: { id },
      data: { title: title ? title.trim() : undefined, completed: completed ?? undefined },
    }));

    res.json(subtask);
  } catch (error) {
    logger.error('Update subtask error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/quests/:questId/subtasks/:id', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { questId, id } = req.params;

    const quest = await withRetry(() => prisma.quest.findFirst({ where: { id: questId, userId } }));
    if (!quest) return res.status(404).json({ error: 'Quest not found' });

    await withRetry(() => prisma.questSubtask.delete({ where: { id } }));
    res.status(204).send();
  } catch (error) {
    logger.error('Delete subtask error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Gate routes
// ========================

/**
 * @swagger
 * /api/gates:
 *   get:
 *     summary: Get all gates for authenticated user
 *     tags: [Gates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Gate'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/gates', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Validate pagination parameters
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    const cacheKey = `gates:${userId}:${page}:${limit}`;
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const [gates, total] = await Promise.all([
      withRetry(() => prisma.gate.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          name: true,
          rank: true,
          deadline: true,
          status: true,
          createdAt: true,
          quests: {
            select: {
              id: true,
              status: true,
            }
          }
        }
      })),
      withRetry(() => prisma.gate.count({ where: { userId } }))
    ]);

    // Compute progress for each gate
    const gatesWithProgress = gates.map(gate => {
      const total = gate.quests.length;
      const completed = gate.quests.filter(q => q.status === 'COMPLETED').length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { ...gate, progress };
    });

    const response = {
      data: gatesWithProgress,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      }
    };

    await setCache(cacheKey, response, 2 * 60 * 1000); // Cache for 2 minutes
    res.json(response);
  } catch (error) {
    logger.error('Get gates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/gates', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, rank, deadline, status } = req.body;

    // Input validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const gate = await withRetry(() => prisma.gate.create({
      data: {
        userId,
        name: name.trim(),
        rank: rank || 'E',
        deadline: deadline ? new Date(deadline) : undefined,
        status: status || 'ACTIVE',
      },
      include: { quests: true }
    }));

    // Invalidate gates cache for this user
    await deleteCachePattern(`gates:${userId}:*`);

    res.status(201).json({ ...gate, progress: 0 });
  } catch (error) {
    logger.error('Create gate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/gates/:id', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { name, rank, deadline, status } = req.body;

    // Input validation
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Invalid name' });
    }

    const existingGate = await withRetry(() => prisma.gate.findFirst({ where: { id, userId } }));
    if (!existingGate) {
      return res.status(404).json({ error: 'Gate not found' });
    }

    const gate = await withRetry(() => prisma.gate.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        rank: rank ?? undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        status: status ?? undefined,
      },
      include: { quests: true }
    }));

    const total = gate.quests.length;
    const completed = gate.quests.filter(q => q.status === 'COMPLETED').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Auto-transition gate status based on completion
    let newStatus = status;
    if (total > 0 && completed === total && gate.status === 'ACTIVE') {
      newStatus = 'CLEARED';
    } else if (gate.deadline && new Date(gate.deadline) < new Date() && gate.status === 'ACTIVE') {
      newStatus = 'COLLAPSED';
    }

    // Update status if it changed
    if (newStatus && newStatus !== gate.status) {
      await withRetry(() => prisma.gate.update({
        where: { id },
        data: { status: newStatus },
      }));
      gate.status = newStatus;
    }

    const gateWithProgress = { ...gate, progress };

    // Invalidate gates cache for this user
    await deleteCachePattern(`gates:${userId}:*`);

    emitToUser(userId, 'gate:updated', gateWithProgress);
    res.json(gateWithProgress);
  } catch (error) {
    logger.error('Update gate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/gates/:id', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const existingGate = await withRetry(() => prisma.gate.findFirst({ where: { id, userId } }));
    if (!existingGate) {
      return res.status(404).json({ error: 'Gate not found' });
    }

    await withRetry(() => prisma.quest.updateMany({ where: { gateId: id }, data: { gateId: null } }));
    await withRetry(() => prisma.gate.delete({ where: { id } }));

    // Invalidate gates cache for this user
    await deleteCachePattern(`gates:${userId}:*`);

    res.status(204).send();
  } catch (error) {
    logger.error('Delete gate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Daily Dungeon routes
// ========================

/**
 * @swagger
 * /api/dungeon:
 *   get:
 *     summary: Get daily dungeon for authenticated user
 *     tags: [Dungeon]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily dungeon retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyDungeon'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/dungeon', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const dungeon = await withRetry(() => prisma.dailyDungeon.findFirst({
      where: { userId, active: true },
      include: { tasks: { orderBy: { position: 'asc' } } }
    }));

    if (!dungeon) {
      const newDungeon = await withRetry(() => prisma.dailyDungeon.create({
        data: { userId, name: 'Morning Protocol', shift: 'MORNING', active: true },
        include: { tasks: true }
      }));
      return res.json(newDungeon);
    }

    // Check if we need to reset tasks for new day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastLog = await withRetry(() => prisma.dungeonLog.findFirst({
      where: { dungeonId: dungeon.id },
      orderBy: { date: 'desc' }
    }));

    if (lastLog) {
      const lastLogDate = new Date(lastLog.date);
      lastLogDate.setHours(0, 0, 0, 0);
      
      // If last completion was before today, reset tasks for new day
      if (lastLogDate < today) {
        await withRetry(() => prisma.dungeonTask.updateMany({
          where: { dungeonId: dungeon.id },
          data: { completed: false },
        }));
      }
    }

    res.json(dungeon);
  } catch (error) {
    logger.error('Get dungeon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/dungeon/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { title, rank } = req.body;

    // Input validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let dungeon = await withRetry(() => prisma.dailyDungeon.findFirst({ 
      where: { userId, active: true },
      select: { id: true }
    }));
    if (!dungeon) {
      dungeon = await withRetry(() => prisma.dailyDungeon.create({
        data: { userId, name: 'Morning Protocol', shift: 'MORNING', active: true },
        select: { id: true }
      }));
    }

    const maxPos = await withRetry(() => prisma.dungeonTask.aggregate({
      where: { dungeonId: dungeon.id },
      _max: { position: true },
    }));

    const task = await withRetry(() => prisma.dungeonTask.create({
      data: {
        dungeonId: dungeon.id,
        title: title.trim(),
        rank: rank || 'E',
        position: (maxPos._max.position ?? -1) + 1,
        completed: false,
      },
      select: {
        id: true,
        title: true,
        rank: true,
        position: true,
        completed: true,
      }
    }));

    res.status(201).json(task);
  } catch (error) {
    logger.error('Create dungeon task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/dungeon/tasks/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const task = await withRetry(() => prisma.dungeonTask.findUnique({
      where: { id },
      include: { dungeon: true },
    }));

    if (!task || task.dungeon.userId !== userId) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updatedTask = await withRetry(() => prisma.dungeonTask.update({
      where: { id },
      data: { completed: !task.completed },
    }));

    res.json(updatedTask);
  } catch (error) {
    logger.error('Toggle dungeon task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/dungeon/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const task = await withRetry(() => prisma.dungeonTask.findUnique({
      where: { id },
      include: { dungeon: true },
    }));

    if (!task || task.dungeon.userId !== userId) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await withRetry(() => prisma.dungeonTask.delete({ where: { id } }));
    res.status(204).send();
  } catch (error) {
    logger.error('Delete dungeon task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/dungeon/complete', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    const dungeon = await withRetry(() => prisma.dailyDungeon.findFirst({
      where: { userId, active: true },
      select: {
        id: true,
        tasks: {
          select: {
            id: true,
            completed: true,
          }
        }
      }
    }));

    if (!dungeon) {
      return res.status(404).json({ error: 'No active dungeon' });
    }

    // Check if dungeon was already completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingLog = await withRetry(() => prisma.dungeonLog.findFirst({
      where: {
        dungeonId: dungeon.id,
        date: {
          gte: today
        }
      }
    }));

    if (existingLog) {
      return res.status(400).json({ error: 'Dungeon already completed today' });
    }

    const totalTasks = dungeon.tasks.length;
    const completedTasks = dungeon.tasks.filter(t => t.completed).length;

    const log = await withRetry(() => prisma.dungeonLog.create({
      data: {
        dungeonId: dungeon.id,
        completedCount: completedTasks,
        totalCount: totalTasks,
        cleared: completedTasks === totalTasks && totalTasks > 0,
      },
      select: {
        id: true,
        completedCount: true,
        totalCount: true,
        cleared: true,
        date: true,
      }
    }));

    const stats = await withRetry(() => prisma.hunterStats.findUnique({ 
      where: { userId },
      select: {
        id: true,
        exp: true,
        gold: true,
        hp: true,
        hpMax: true,
        streak: true,
        longestStreak: true,
        level: true,
        rank: true,
        lastActiveDate: true,
      }
    }));
    if (stats) {
      const cleared = completedTasks === totalTasks && totalTasks > 0;
      const xpGain = cleared ? 50 : Math.floor(25 * (completedTasks / Math.max(totalTasks, 1)));
      const goldGain = cleared ? 25 : Math.floor(10 * (completedTasks / Math.max(totalTasks, 1)));
      const hpGain = cleared ? 10 : 0;
      
      // Dungeon completion does NOT increment streak - quest completion handles that
      // This prevents double-counting streak increments when both quest and dungeon are completed
      const newStreak = stats.streak;

      const newExp = stats.exp + xpGain;
      const { level, xpToNext, progressPercent } = calculateLevelAndProgress(newExp);
      const newRank = getRankFromLevel(level);
      const oldLevel = stats.level;

      // Transaction: balance update + ledger entry together so the dungeon
      // reward stays reconcilable (report fix #87)
      const updatedStats = await withRetry(() =>
        prisma.$transaction(async (tx) => {
          const updated = await tx.hunterStats.update({
            where: { userId },
            data: {
              exp: newExp,
              expToNext: xpToNext,
              gold: stats.gold + goldGain,
              hp: Math.min(stats.hp + hpGain, stats.hpMax),
              level,
              rank: newRank,
              streak: newStreak,
              longestStreak: Math.max(stats.longestStreak, newStreak),
              lastActiveDate: new Date(),
            },
            select: {
              id: true,
              level: true,
              exp: true,
              expToNext: true,
              progressPercent: true,
              rank: true,
              hp: true,
              hpMax: true,
              gold: true,
              streak: true,
              longestStreak: true,
            }
          });
          await recordLedgerEntry(tx as any, {
            userId,
            reason: 'DUNGEON_REWARD',
            xpDelta: xpGain,
            goldDelta: goldGain,
            description: cleared ? 'Daily dungeon cleared' : `Daily dungeon ended (${completedTasks}/${totalTasks} tasks)`,
          });
          return updated;
        })
      );
      recordEconomyChange('dungeon_completion', xpGain, goldGain);

      const notif = await withRetry(() => prisma.notification.create({
        data: {
          userId,
          message: cleared
            ? `Daily Dungeon cleared! XP +${xpGain}. Gold +${goldGain}. HP +${hpGain}.`
            : `Daily Dungeon ended. ${completedTasks}/${totalTasks} completed. XP +${xpGain}.`,
          type: 'REWARD',
        },
        select: { id: true, message: true, type: true, createdAt: true }
      }));

      // Invalidate user cache
      await invalidateUserCache(userId);

      emitToUser(userId, 'stats:updated', updatedStats);
      emitToUser(userId, 'dungeon:cleared', { log, xpGain, goldGain, hpGain });
      emitToUser(userId, 'notification:new', notif);

      if (level > oldLevel) {
        const levelNotif = await withRetry(() => prisma.notification.create({
          data: {
            userId,
            message: `Level Up! You are now Level ${level} (Rank ${newRank})!`,
            type: 'REWARD',
          },
          select: { id: true, message: true, type: true, createdAt: true }
        }));
        emitToUser(userId, 'level:up', { level, rank: newRank });
        emitToUser(userId, 'notification:new', levelNotif);
      }

      // Don't reset tasks immediately - let them reset on next day's dungeon creation
    }

    res.json({ log, message: 'Dungeon completed' });
  } catch (error) {
    logger.error('Complete dungeon error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Notifications routes
// ========================

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { unreadOnly } = req.query;

    const where: any = { userId };
    if (unreadOnly === 'true') where.read = false;

    const notifications = await withRetry(() => prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        message: true,
        type: true,
        read: true,
        createdAt: true,
      }
    }));

    res.json(notifications);
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const notification = await withRetry(() => prisma.notification.findFirst({ where: { id, userId } }));
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await withRetry(() => prisma.notification.update({
      where: { id },
      data: { read: true }
    }));

    res.json(updated);
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    await withRetry(() => prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    }));
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Mark all read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Shop routes
// ========================

/**
 * @swagger
 * /api/shop:
 *   get:
 *     summary: Get all available shop items
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shop items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ShopItem'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/shop', authenticateToken, async (req, res) => {
  try {
    const cacheKey = 'shop:items';
    const cached = await getFromCache(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const shopItems = await withRetry(() => prisma.shopItem.findMany({ orderBy: { name: 'asc' } }));
    await setCache(cacheKey, shopItems, 10 * 60 * 1000); // Cache for 10 minutes
    res.json(shopItems);
  } catch (error) {
    logger.error('Get shop items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/shop/purchase/{itemId}:
 *   post:
 *     summary: Purchase an item from the shop
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop item ID
 *     responses:
 *       200:
 *         description: Item purchased successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryItem'
 *       400:
 *         description: Insufficient gold or invalid item
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/shop/purchase/:itemId', authenticateToken, createRateLimitMiddleware('shop'), idempotencyMiddleware(false), async (req, res) => {
  try {
    const userId = getUserId(req);
    const { itemId } = req.params;

    const item = await withRetry(() => prisma.shopItem.findUnique({ 
      where: { id: itemId },
      select: { id: true, name: true, costGold: true }
    }));
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const existing = await withRetry(() => prisma.userInventory.findFirst({ 
      where: { userId, itemId },
      select: { id: true }
    }));
    if (existing) return res.status(400).json({ error: 'Item already owned' });

    // Fast-path duplicate-ownership pre-check done above; the transaction
    // below also relies on the @@unique([userId, itemId]) constraint so a
    // concurrent duplicate purchase fails atomically instead of double-charging.
    const result = await prisma.$transaction(async (tx) => {
      // Check and deduct gold atomically
      const stats = await tx.hunterStats.findUnique({ 
        where: { userId },
        select: { id: true, gold: true, exp: true, level: true }
      });
      
      if (!stats || stats.gold < item.costGold) {
        throw new Error('Insufficient gold');
      }

      // Deduct gold using a guarded decrement: the where-clause re-checks
      // the balance so two concurrent purchases can't both pass the earlier
      // findUnique check and overdraw the account (race condition).
      let updatedStats;
      try {
        updatedStats = await tx.hunterStats.update({
          where: { userId, gold: { gte: item.costGold } },
          data: { gold: { decrement: item.costGold } },
          select: { id: true, gold: true, level: true, rank: true, exp: true }
        });
      } catch {
        throw new Error('Insufficient gold');
      }

      // Add to inventory
      const inventoryItem = await tx.userInventory.create({
        data: { userId, itemId },
        select: {
          id: true,
          equipped: true,
          acquiredAt: true,
          item: {
            select: {
              id: true,
              name: true,
              category: true,
              costGold: true,
            }
          }
        }
      });

      // Ledger entry in the same transaction as the spend
      await recordLedgerEntry(tx as any, {
        userId,
        reason: 'SHOP_PURCHASE',
        goldDelta: -item.costGold,
        description: `Purchased "${item.name}"`,
        referenceType: 'ShopItem',
        referenceId: itemId,
      });

      // Create notification
      const notif = await tx.notification.create({
        data: {
          userId,
          message: `Purchased "${item.name}" for ${item.costGold} gold!`,
          type: 'REWARD',
        },
        select: { id: true, message: true, type: true, createdAt: true }
      });

      return { updatedStats, inventoryItem, notif };
    });

    // Invalidate user cache
    await invalidateUserCache(userId);

    recordEconomyChange('shop_purchase', 0, -item.costGold);

    emitToUser(userId, 'stats:updated', result.updatedStats);
    emitToUser(userId, 'notification:new', result.notif);

    const responseBody = { inventory: result.inventoryItem, stats: result.updatedStats };
    await captureIdempotentResponse(req, res, responseBody);
    res.json(responseBody);
  } catch (error) {
    logger.error('Purchase item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Inventory routes
// ========================

app.get('/api/user/inventory', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const inventory = await withRetry(() => prisma.userInventory.findMany({
      where: { userId },
      select: {
        id: true,
        equipped: true,
        acquiredAt: true,
        item: {
          select: {
            id: true,
            name: true,
            category: true,
            costGold: true,
            description: true,
          }
        }
      },
      orderBy: { acquiredAt: 'desc' }
    }));
    res.json(inventory);
  } catch (error) {
    logger.error('Get user inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/user/inventory/:id/equip', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const invItem = await withRetry(() => prisma.userInventory.findFirst({ 
      where: { id, userId },
      include: { item: true }
    }));
    if (!invItem) return res.status(404).json({ error: 'Inventory item not found' });

    // Use transaction to ensure atomic equip/unequip
    const updated = await prisma.$transaction(async (tx) => {
      // If equipping, first unequip all other items in the same category
      if (!invItem.equipped) {
        // Get all inventory items in the same category except the current one
        const sameCategoryItems = await tx.userInventory.findMany({
          where: {
            userId,
            id: { not: id },
          },
          include: { item: true },
        });

        // Filter and unequip items with the same category
        for (const item of sameCategoryItems) {
          if (item.item.category === invItem.item.category) {
            await tx.userInventory.update({
              where: { id: item.id },
              data: { equipped: false },
            });
          }
        }
      }

      // Then toggle the requested item
      return await tx.userInventory.update({
        where: { id },
        data: { equipped: !invItem.equipped },
        include: { item: true },
      });
    });

    res.json(updated);
  } catch (error) {
    logger.error('Toggle equip error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Health Check
// ========================

app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    const services: any = {
      database: 'connected',
    };

    // Check Redis if configured
    if (env.REDIS_URL) {
      try {
        // Check cache Redis
        const cacheStats = await getCacheStats();
        services.cache = 'connected';
        services.cacheStats = {
          totalKeys: cacheStats.totalKeys,
          memoryUsage: cacheStats.memoryUsage,
          hitRate: cacheStats.hitRate,
        };

        // Rate limiter uses the same Redis infrastructure
        services.rateLimiter = 'connected';
      } catch (error) {
        services.cache = 'disconnected';
        services.rateLimiter = 'disconnected';
      }
    } else {
      services.rateLimiter = 'not-configured';
      services.cache = 'not-configured';
    }

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
      version: process.env.npm_package_version || '1.0.0',
    };

    logger.info('Health check passed', healthStatus);
    res.json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ========================
// Stats routes
// ========================

app.get('/api/stats/weekly', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dungeonLogs = await withRetry(() => prisma.dungeonLog.findMany({
      where: { dungeon: { userId }, date: { gte: sevenDaysAgo } },
      select: { date: true, completedCount: true, totalCount: true },
      orderBy: { date: 'asc' }
    }));

    const completedQuests = await withRetry(() => prisma.quest.findMany({
      where: { userId, status: 'COMPLETED', completedAt: { gte: sevenDaysAgo } },
      select: { completedAt: true }
    }));

    const dailyActivity = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 6 + i);
      date.setHours(0, 0, 0, 0);
      return date;
    }).map(date => ({
      date: date.toISOString().split('T')[0],
      dungeonsCompleted: 0,
      dungeonsTotal: 0,
      questsCompleted: 0
    }));

    dungeonLogs.forEach(log => {
      const dateStr = log.date.toISOString().split('T')[0];
      const dayIndex = dailyActivity.findIndex(day => day.date === dateStr);
      if (dayIndex >= 0) {
        dailyActivity[dayIndex].dungeonsCompleted += log.completedCount;
        dailyActivity[dayIndex].dungeonsTotal += log.totalCount;
      }
    });

    completedQuests.forEach(quest => {
      if (quest.completedAt) {
        const dateStr = new Date(quest.completedAt).toISOString().split('T')[0];
        const dayIndex = dailyActivity.findIndex(day => day.date === dateStr);
        if (dayIndex >= 0) {
          dailyActivity[dayIndex].questsCompleted++;
        }
      }
    });

    res.json({ dailyActivity });
  } catch (error) {
    logger.error('Get weekly stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/quests/summary', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    const [total, completed, active, failed] = await Promise.all([
      withRetry(() => prisma.quest.count({ where: { userId } })),
      withRetry(() => prisma.quest.count({ where: { userId, status: 'COMPLETED' } })),
      withRetry(() => prisma.quest.count({ where: { userId, status: { in: ['ACTIVE', 'IN_PROGRESS'] } } })),
      withRetry(() => prisma.quest.count({ where: { userId, status: 'FAILED' } }))
    ]);

    res.json({ total, completed, active, failed });
  } catch (error) {
    logger.error('Get quest summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// MMM Framework - Milestones, Mastery, Mementos
// ========================

app.get('/api/milestones', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    const milestones = await withRetry(() =>
      prisma.milestone.findMany({
        include: {
          progress: {
            where: { userId },
          },
        },
      })
    );

    res.json(milestones);
  } catch (error) {
    logger.error('Get milestones error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/milestones/progress', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    const progress = await withRetry(() =>
      prisma.milestoneProgress.findMany({
        where: { userId },
        include: {
          milestone: true,
        },
      })
    );

    res.json(progress);
  } catch (error) {
    logger.error('Get milestone progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/milestones/:id/complete', authenticateToken, idempotencyMiddleware(true), async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const milestone = await withRetry(() =>
      prisma.milestone.findUnique({
        where: { id },
      })
    );

    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // Check if already completed
    const existingProgress = await withRetry(() =>
      prisma.milestoneProgress.findUnique({
        where: {
          userId_milestoneId: {
            userId,
            milestoneId: id,
          },
        },
      })
    );

    if (existingProgress?.completed) {
      return res.status(400).json({ error: 'Milestone already completed' });
    }

    const [progress, stats] = await withRetry(() =>
      prisma.$transaction([
        prisma.milestoneProgress.upsert({
          where: {
            userId_milestoneId: {
              userId,
              milestoneId: id,
            },
          },
          update: {
            completed: true,
            completedAt: new Date(),
          },
          create: {
            userId,
            milestoneId: id,
            completed: true,
            completedAt: new Date(),
          },
        }),
        prisma.hunterStats.findUnique({
          where: { userId },
        }),
      ])
    );

    if (stats) {
      await withRetry(() =>
        prisma.$transaction(async (tx) => {
          const updated = await tx.hunterStats.update({
            where: { userId },
            data: {
              exp: { increment: milestone.xpReward },
              gold: { increment: milestone.goldReward },
            },
          });
          await recordLedgerEntry(tx as any, {
            userId,
            reason: 'MILESTONE_REWARD',
            xpDelta: milestone.xpReward,
            goldDelta: milestone.goldReward,
            description: `Completed milestone "${milestone.name}"`,
            referenceType: 'Milestone',
            referenceId: milestone.id,
          });
          return updated;
        })
      );

      recordEconomyChange('milestone', milestone.xpReward, milestone.goldReward);

      emitToUser(userId, 'stats:updated', {
        exp: stats.exp + milestone.xpReward,
        gold: stats.gold + milestone.goldReward,
      });
    }

    if (milestone.mementoId) {
      await withRetry(() =>
        prisma.userMemento.create({
          data: {
            userId,
            mementoId: milestone.mementoId!,
          },
        })
      );
    }

    const milestoneResponse = { success: true, milestone, reward: { xp: milestone.xpReward, gold: milestone.goldReward } };
    await captureIdempotentResponse(req, res, milestoneResponse);
    res.json(milestoneResponse);
  } catch (error) {
    logger.error('Complete milestone error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/milestones', authenticateToken, async (req, res) => {
  try {
    const { name, description, requirement, xpReward, goldReward, mementoId } = req.body;

    const milestone = await withRetry(() =>
      prisma.milestone.create({
        data: {
          name,
          description,
          requirement,
          xpReward,
          goldReward,
          mementoId,
        },
      })
    );

    res.json({ success: true, milestone });
  } catch (error) {
    logger.error('Create milestone error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/milestones/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, requirement, xpReward, goldReward, mementoId } = req.body;

    const milestone = await withRetry(() =>
      prisma.milestone.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(requirement && { requirement }),
          ...(xpReward !== undefined && { xpReward }),
          ...(goldReward !== undefined && { goldReward }),
          ...(mementoId !== undefined && { mementoId }),
        },
      })
    );

    res.json({ success: true, milestone });
  } catch (error) {
    logger.error('Update milestone error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/milestones/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await withRetry(() =>
      prisma.milestone.delete({
        where: { id },
      })
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Delete milestone error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/mastery-challenges', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    const challenges = await withRetry(() =>
      prisma.masteryChallenge.findMany({
        include: {
          progress: {
            where: { userId },
          },
        },
      })
    );

    res.json(challenges);
  } catch (error) {
    logger.error('Get mastery challenges error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/mastery-challenges/progress', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    const progress = await withRetry(() =>
      prisma.masteryChallengeProgress.findMany({
        where: { userId },
        include: {
          challenge: true,
        },
      })
    );

    res.json(progress);
  } catch (error) {
    logger.error('Get mastery challenge progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/mastery-challenges', authenticateToken, async (req, res) => {
  try {
    const { name, description, requirement, xpReward, goldReward, difficulty } = req.body;

    const challenge = await withRetry(() =>
      prisma.masteryChallenge.create({
        data: {
          name,
          description,
          requirement,
          xpReward,
          goldReward,
          difficulty,
        },
      })
    );

    res.json({ success: true, challenge });
  } catch (error) {
    logger.error('Create mastery challenge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/mastery-challenges/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, requirement, xpReward, goldReward, difficulty } = req.body;

    const challenge = await withRetry(() =>
      prisma.masteryChallenge.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(requirement && { requirement }),
          ...(xpReward !== undefined && { xpReward }),
          ...(goldReward !== undefined && { goldReward }),
          ...(difficulty && { difficulty }),
        },
      })
    );

    res.json({ success: true, challenge });
  } catch (error) {
    logger.error('Update mastery challenge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/mastery-challenges/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await withRetry(() =>
      prisma.masteryChallenge.delete({
        where: { id },
      })
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Delete mastery challenge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/mastery-challenges/:id/attempt', authenticateToken, idempotencyMiddleware(true), async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { score } = req.body;

    const challenge = await withRetry(() =>
      prisma.masteryChallenge.findUnique({
        where: { id },
      })
    );

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const existingProgress = await withRetry(() =>
      prisma.masteryChallengeProgress.findUnique({
        where: {
          userId_challengeId: {
            userId,
            challengeId: id,
          },
        },
      })
    );

    const newBestScore = existingProgress?.bestScore
      ? Math.max(existingProgress.bestScore, score || 0)
      : score || 0;

    const completed = score && score >= 80;

    const progress = await withRetry(() =>
      prisma.masteryChallengeProgress.upsert({
        where: {
          userId_challengeId: {
            userId,
            challengeId: id,
          },
        },
        update: {
          attempts: { increment: 1 },
          bestScore: newBestScore,
          completed,
          completedAt: completed ? new Date() : undefined,
        },
        create: {
          userId,
          challengeId: id,
          attempts: 1,
          bestScore: newBestScore,
          completed,
          completedAt: completed ? new Date() : undefined,
        },
      })
    );

    if (completed && !existingProgress?.completed) {
      await withRetry(() =>
        prisma.$transaction(async (tx) => {
          const updated = await tx.hunterStats.update({
            where: { userId },
            data: {
              exp: { increment: challenge.xpReward },
              gold: { increment: challenge.goldReward },
            },
          });
          await recordLedgerEntry(tx as any, {
            userId,
            reason: 'MASTERY_REWARD',
            xpDelta: challenge.xpReward,
            goldDelta: challenge.goldReward,
            description: `Completed mastery challenge "${challenge.name}"`,
            referenceType: 'MasteryChallenge',
            referenceId: challenge.id,
          });
          return updated;
        })
      );

      recordEconomyChange('mastery_challenge', challenge.xpReward, challenge.goldReward);
    }

    const progressResponse = { success: true, progress };
    await captureIdempotentResponse(req, res, progressResponse);
    res.json(progressResponse);
  } catch (error) {
    logger.error('Attempt mastery challenge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/mementos', authenticateToken, async (req, res) => {
  try {
    const mementos = await withRetry(() =>
      prisma.memento.findMany({
        include: {
          milestones: true,
        },
      })
    );

    res.json(mementos);
  } catch (error) {
    logger.error('Get mementos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/mementos/user', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    const userMementos = await withRetry(() =>
      prisma.userMemento.findMany({
        where: { userId },
        include: {
          memento: true,
        },
      })
    );

    res.json(userMementos);
  } catch (error) {
    logger.error('Get user mementos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/mementos', authenticateToken, async (req, res) => {
  try {
    const { name, description, icon, rarity, category } = req.body;

    const memento = await withRetry(() =>
      prisma.memento.create({
        data: {
          name,
          description,
          icon,
          rarity,
          category,
        },
      })
    );

    res.json({ success: true, memento });
  } catch (error) {
    logger.error('Create memento error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/mementos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, rarity, category } = req.body;

    const memento = await withRetry(() =>
      prisma.memento.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(icon && { icon }),
          ...(rarity && { rarity }),
          ...(category && { category }),
        },
      })
    );

    res.json({ success: true, memento });
  } catch (error) {
    logger.error('Update memento error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/mementos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await withRetry(() =>
      prisma.memento.delete({
        where: { id },
      })
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Delete memento error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Three-type Dilemma Triangle
// ========================

app.post('/api/quests/:id/decision', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { decisionType, choice } = req.body;

    if (!['SCARCITY', 'TRADEOFF', 'PREDICTION'].includes(decisionType)) {
      return res.status(400).json({ error: 'Invalid decision type' });
    }

    const quest = await withRetry(() =>
      prisma.quest.findUnique({
        where: { id },
      })
    );

    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    if (quest.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized for this quest' });
    }

    const decision = await withRetry(() =>
      prisma.questDecision.create({
        data: {
          userId,
          questId: id,
          decisionType,
          choice,
          timestamp: new Date(),
        },
      })
    );

    res.json({ success: true, decision });
  } catch (error) {
    logger.error('Record quest decision error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/quests/:id/decisions', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const decisions = await withRetry(() =>
      prisma.questDecision.findMany({
        where: {
          userId,
          questId: id,
        },
        orderBy: {
          timestamp: 'desc',
        },
      })
    );

    res.json(decisions);
  } catch (error) {
    logger.error('Get quest decisions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Dual-use Resource Management
// ========================

app.post('/api/resources/use', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { resourceType, amount, purpose } = req.body;

    if (!['GOLD', 'HP', 'TIME'].includes(resourceType)) {
      return res.status(400).json({ error: 'Invalid resource type' });
    }

    if (!['SHOP_PURCHASE', 'QUEST_BOOST', 'TIME_EXTENSION', 'DIFFICULTY_MODIFIER'].includes(purpose)) {
      return res.status(400).json({ error: 'Invalid purpose' });
    }

    const stats = await withRetry(() =>
      prisma.hunterStats.findUnique({
        where: { userId },
      })
    );

    if (!stats) {
      return res.status(404).json({ error: 'Hunter stats not found' });
    }

    if (resourceType === 'GOLD' && stats.gold < amount) {
      return res.status(400).json({ error: 'Insufficient gold' });
    }

    if (resourceType === 'HP' && stats.hp < amount) {
      return res.status(400).json({ error: 'Insufficient HP' });
    }

    await withRetry(() =>
      prisma.$transaction([
        prisma.resourceUsage.create({
          data: {
            userId,
            resourceType,
            amount,
            purpose,
            timestamp: new Date(),
          },
        }),
        prisma.hunterStats.update({
          where: { userId },
          data: {
            ...(resourceType === 'GOLD' && { gold: { decrement: amount } }),
            ...(resourceType === 'HP' && { hp: { decrement: amount } }),
          },
        }),
      ])
    );

    io.to(userId).emit('statsUpdated', {
      ...(resourceType === 'GOLD' && { gold: stats.gold - amount }),
      ...(resourceType === 'HP' && { hp: stats.hp - amount }),
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Use resource error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/resources/usage', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    const usage = await withRetry(() =>
      prisma.resourceUsage.findMany({
        where: { userId },
        orderBy: {
          timestamp: 'desc',
        },
        take: 50,
      })
    );

    res.json(usage);
  } catch (error) {
    logger.error('Get resource usage error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Elastic Failure System
// ========================

app.post('/api/quests/:id/recover', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const quest = await withRetry(() =>
      prisma.quest.findUnique({
        where: { id },
      })
    );

    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    if (quest.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized for this quest' });
    }

    if (quest.status !== 'FAILED') {
      return res.status(400).json({ error: 'Quest is not in failed state' });
    }

    const updatedQuest = await withRetry(() =>
      prisma.quest.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          expReward: Math.floor(quest.expReward * 0.7),
          goldReward: Math.floor(quest.goldReward * 0.7),
        },
      })
    );

    res.json({ success: true, quest: updatedQuest });
  } catch (error) {
    logger.error('Recover quest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Tiered Risk/Reward Completion
// ========================

app.post('/api/quests/:id/complete-tiered', authenticateToken, createRateLimitMiddleware('shop'), idempotencyMiddleware(false), async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { completionQuality } = req.body;

    if (!['PERFECT', 'GOOD', 'POOR'].includes(completionQuality)) {
      return res.status(400).json({ error: 'Invalid completion quality' });
    }

    const quest = await withRetry(() =>
      prisma.quest.findUnique({
        where: { id },
      })
    );

    if (!quest) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    if (quest.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized for this quest' });
    }

    if (quest.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Quest already completed' });
    }

    const qualityMultipliers = {
      PERFECT: 1.5,
      GOOD: 1.0,
      POOR: 0.5,
    };

    const multiplier = qualityMultipliers[completionQuality as keyof typeof qualityMultipliers];
    const xpEarned = Math.floor(quest.expReward * multiplier);
    const goldEarned = Math.floor(quest.goldReward * multiplier);

    // Atomic completion claim (mirrors PATCH /api/quests/:id, report fix #13):
    // only the first request that flips the status wins the rewards; a
    // concurrent duplicate claims zero rows and gets no double payout.
    const result = await withRetry(() =>
      prisma.$transaction(async (tx) => {
        const claimed = await tx.quest.updateMany({
          where: { id, userId, status: { not: 'COMPLETED' } },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        if (claimed.count === 0) {
          return null;
        }

        const stats = await tx.hunterStats.update({
          where: { userId },
          data: {
            exp: { increment: xpEarned },
            gold: { increment: goldEarned },
            lastActiveDate: new Date(),
          },
        });

        await recordLedgerEntry(tx as any, {
          userId,
          reason: 'TIERED_COMPLETION',
          xpDelta: xpEarned,
          goldDelta: goldEarned,
          description: `Tiered completion of quest "${quest.title}" (quality ${completionQuality})`,
          referenceType: 'Quest',
          referenceId: id,
        });

        return { stats };
      })
    );

    if (!result) {
      // Lost the race: quest was completed concurrently
      return res.status(400).json({ error: 'Quest already completed' });
    }

    recordEconomyChange('tiered_completion', xpEarned, goldEarned);

    emitToUser(userId, 'stats:updated', result.stats);

    const updatedQuest = await withRetry(() => prisma.quest.findUnique({ where: { id } }));

    const responseBody = {
      success: true,
      quest: updatedQuest,
      rewards: { xp: xpEarned, gold: goldEarned },
      quality: completionQuality,
    };
    await captureIdempotentResponse(req, res, responseBody);
    res.json(responseBody);
  } catch (error) {
    logger.error('Complete quest tiered error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Knowledge Progression
// ========================

app.get('/api/knowledge', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    const knowledge = await withRetry(() =>
      prisma.knowledgeProgress.findUnique({
        where: { userId },
      })
    );

    if (!knowledge) {
      const newKnowledge = await withRetry(() =>
        prisma.knowledgeProgress.create({
          data: {
            userId,
            questPatternsLearned: 0,
            optimalRoutesDiscovered: 0,
            shortcutsUnlocked: 0,
            efficiencyRating: 0,
            lastUpdated: new Date(),
          },
        })
      );
      return res.json(newKnowledge);
    }

    res.json(knowledge);
  } catch (error) {
    logger.error('Get knowledge progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/knowledge', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { questPatternsLearned, optimalRoutesDiscovered, shortcutsUnlocked, efficiencyRating } = req.body;

    const knowledge = await withRetry(() =>
      prisma.knowledgeProgress.upsert({
        where: { userId },
        update: {
          ...(questPatternsLearned !== undefined && { questPatternsLearned }),
          ...(optimalRoutesDiscovered !== undefined && { optimalRoutesDiscovered }),
          ...(shortcutsUnlocked !== undefined && { shortcutsUnlocked }),
          ...(efficiencyRating !== undefined && { efficiencyRating }),
          lastUpdated: new Date(),
        },
        create: {
          userId,
          questPatternsLearned: questPatternsLearned || 0,
          optimalRoutesDiscovered: optimalRoutesDiscovered || 0,
          shortcutsUnlocked: shortcutsUnlocked || 0,
          efficiencyRating: efficiencyRating || 0,
          lastUpdated: new Date(),
        },
      })
    );

    res.json({ success: true, knowledge });
  } catch (error) {
    logger.error('Update knowledge progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/knowledge', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req.body);
    const { questPatternsLearned, optimalRoutesDiscovered, shortcutsUnlocked, efficiencyRating } = req.body;

    const knowledge = await withRetry(() =>
      prisma.knowledgeProgress.create({
        data: {
          userId,
          questPatternsLearned: questPatternsLearned || 0,
          optimalRoutesDiscovered: optimalRoutesDiscovered || 0,
          shortcutsUnlocked: shortcutsUnlocked || 0,
          efficiencyRating: efficiencyRating || 0,
          lastUpdated: new Date(),
        },
      })
    );

    res.json({ success: true, knowledge });
  } catch (error) {
    logger.error('Create knowledge progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/knowledge', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    await withRetry(() =>
      prisma.knowledgeProgress.delete({
        where: { userId },
      })
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Delete knowledge progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Social Features
// ========================

app.get('/api/social/stats', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    const socialStats = await withRetry(() =>
      prisma.socialStats.findUnique({
        where: { userId },
      })
    );

    if (!socialStats) {
      const newSocialStats = await withRetry(() =>
        prisma.socialStats.create({
          data: {
            userId,
            friendsAdded: 0,
            questsShared: 0,
            achievementsShared: 0,
            leaderboardRank: 0,
            socialScore: 0,
            lastUpdated: new Date(),
          },
        })
      );
      return res.json(newSocialStats);
    }

    res.json(socialStats);
  } catch (error) {
    logger.error('Get social stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/social/stats', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { friendsAdded, questsShared, achievementsShared, leaderboardRank, socialScore } = req.body;

    const socialStats = await withRetry(() =>
      prisma.socialStats.upsert({
        where: { userId },
        update: {
          ...(friendsAdded !== undefined && { friendsAdded }),
          ...(questsShared !== undefined && { questsShared }),
          ...(achievementsShared !== undefined && { achievementsShared }),
          ...(leaderboardRank !== undefined && { leaderboardRank }),
          ...(socialScore !== undefined && { socialScore }),
          lastUpdated: new Date(),
        },
        create: {
          userId,
          friendsAdded: friendsAdded || 0,
          questsShared: questsShared || 0,
          achievementsShared: achievementsShared || 0,
          leaderboardRank: leaderboardRank || 0,
          socialScore: socialScore || 0,
          lastUpdated: new Date(),
        },
      })
    );

    res.json({ success: true, socialStats });
  } catch (error) {
    logger.error('Update social stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/social/stats', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req.body);
    const { friendsAdded, questsShared, achievementsShared, leaderboardRank, socialScore } = req.body;

    const socialStats = await withRetry(() =>
      prisma.socialStats.create({
        data: {
          userId,
          friendsAdded: friendsAdded || 0,
          questsShared: questsShared || 0,
          achievementsShared: achievementsShared || 0,
          leaderboardRank: leaderboardRank || 0,
          socialScore: socialScore || 0,
          lastUpdated: new Date(),
        },
      })
    );

    res.json({ success: true, socialStats });
  } catch (error) {
    logger.error('Create social stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/social/stats', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    await withRetry(() =>
      prisma.socialStats.delete({
        where: { userId },
      })
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Delete social stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/leaderboard', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const leaderboard = await withRetry(() =>
      prisma.hunterStats.findMany({
        take: parseInt(limit as string),
        orderBy: {
          level: 'desc',
        },
        include: {
          user: {
            select: {
              displayName: true,
            },
          },
        },
      })
    );

    res.json(leaderboard);
  } catch (error) {
    logger.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Finite Progression Endpoints
// ========================

app.get('/api/progression/endpoint', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    const stats = await withRetry(() =>
      prisma.hunterStats.findUnique({
        where: { userId },
      })
    );

    if (!stats) {
      return res.status(404).json({ error: 'Hunter stats not found' });
    }

    // Define progression endpoints
    const endpoints = [
      { level: 10, rank: 'D', name: 'Novice Hunter Complete' },
      { level: 20, rank: 'C', name: 'Skilled Hunter Complete' },
      { level: 30, rank: 'B', name: 'Elite Hunter Complete' },
      { level: 40, rank: 'A', name: 'Master Hunter Complete' },
      { level: 50, rank: 'S', name: 'Legendary Hunter Complete' },
    ];

    const currentEndpoint = endpoints.find(ep => stats.level >= ep.level);
    const nextEndpoint = endpoints.find(ep => stats.level < ep.level);

    const milestoneProgress = await withRetry(() =>
      prisma.milestoneProgress.count({
        where: { userId, completed: true },
      })
    );

    const masteryProgress = await withRetry(() =>
      prisma.masteryChallengeProgress.count({
        where: { userId, completed: true },
      })
    );

    const mementosCollected = await withRetry(() =>
      prisma.userMemento.count({
        where: { userId },
      })
    );

    const totalMementos = await withRetry(() =>
      prisma.memento.count()
    );

    const completionPercentage = (milestoneProgress / 5) * 100; // Assuming 5 base milestones

    res.json({
      currentLevel: stats.level,
      currentRank: stats.rank,
      currentEndpoint: currentEndpoint || null,
      nextEndpoint: nextEndpoint || null,
      milestonesCompleted: milestoneProgress,
      masteryChallengesCompleted: masteryProgress,
      mementosCollected,
      totalMementos,
      completionPercentage,
      isEndgame: stats.rank === 'S' && stats.level >= 50,
    });
  } catch (error) {
    logger.error('Get progression endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/progression/complete-chapter', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { chapterName } = req.body;

    const stats = await withRetry(() =>
      prisma.hunterStats.findUnique({
        where: { userId },
      })
    );

    if (!stats) {
      return res.status(404).json({ error: 'Hunter stats not found' });
    }

    // Create a special milestone for chapter completion
    const chapterMilestone = await withRetry(() =>
      prisma.milestone.create({
        data: {
          name: `Chapter: ${chapterName}`,
          description: `Completed the ${chapterName} chapter`,
          requirement: 'Reach progression endpoint',
          xpReward: 1000,
          goldReward: 500,
        },
      })
    );

    await withRetry(() =>
      prisma.milestoneProgress.create({
        data: {
          userId,
          milestoneId: chapterMilestone.id,
          completed: true,
          completedAt: new Date(),
        },
      })
    );

    res.json({
      success: true,
      milestone: chapterMilestone,
      message: `Chapter "${chapterName}" completed!`,
    });
  } catch (error) {
    logger.error('Complete chapter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Error handling middleware
// ========================

app.use((error: any, _req: any, res: any, _next: any) => {
  logger.error(error);
  res.status(500).json({ error: 'Something went wrong!' });
});

// ========================
// Start server
// ========================

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Connected to database');

    // Initialize Redis if REDIS_URL is provided
    if (env.REDIS_URL) {
      try {
        await initRedisClient();
        initRateLimiters();
        logger.info('Rate limiter Redis client initialized');
      } catch (error) {
        logger.warn('Rate limiter Redis initialization failed, using fallback rate limiters:', error);
      }

      try {
        await initCacheClient();
        logger.info('Cache Redis client initialized');
      } catch (error) {
        logger.warn('Cache Redis initialization failed, using in-memory fallback:', error);
      }
    } else {
      logger.info('REDIS_URL not provided, using in-memory rate limiters and cache');
    }

    // Initialize shop items on startup
    const shopCount = await prisma.shopItem.count();
    if (shopCount === 0) {
      await prisma.shopItem.createMany({
        data: [
          { name: 'Crimson Gate Theme', category: 'THEME', costGold: 500, description: 'A dark red theme with glowing accents.' },
          { name: 'Shadow Hunter Frame', category: 'FRAME', costGold: 300, description: 'Earned after reaching Rank B.' },
          { name: 'Master of Quests Title', category: 'TITLE', costGold: 800, description: 'Awarded for completing 100 quests.' },
          { name: 'Heroic Icon Set', category: 'ICON_SET', costGold: 400, description: 'Replace default quest icons with heroic ones.' },
          { name: 'Void Walker Theme', category: 'THEME', costGold: 600, description: 'A pitch-black theme from the void between gates.' },
          { name: 'Gold Sigil Frame', category: 'FRAME', costGold: 1000, description: 'A prestigious frame for elite hunters.' },
        ],
      });
      logger.info('Default shop items created');
    }

    // Load the DB-backed reward table (report fix #86): seeds defaults on
    // first boot; superadmins can tune values at runtime via /api/admin/rewards
    await loadRewardTable(prisma as any);
    logger.info(`Reward table source: ${getRewardTableSource()}`);

    // Initialize background jobs (report fixes #7/#321): BullMQ when Redis
    // is configured, in-process timers otherwise. Hourly reconciliation,
    // daily cleanup of expired notifications.
    await initJobs({
      runReconciliation: async (triggeredBy) => {
        const result = await runReconciliation(prisma, { triggeredBy });
        return { usersWithDrift: result.usersWithDrift, usersChecked: result.usersChecked };
      },
      cleanupExpiredNotifications: async () => {
        const result = await prisma.notification.deleteMany({ where: { expiresAt: { lt: new Date() } } });
        return result.count;
      },
    });

    // ========================
    // Guild and Raid System
    // ========================

    /**
     * @swagger
     * /api/guilds:
     *   get:
     *     summary: Get all guilds
     *     tags: [Guilds]
     *     responses:
     *       200:
     *         description: List of guilds
     */
    app.get('/api/guilds', async (req, res) => {
      try {
        const { page = 1, limit = 20 } = req.query;
        const guilds = await withRetry(() =>
          prisma.guild.findMany({
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy: { totalExp: 'desc' },
          })
        );
        res.json(guilds);
      } catch (error) {
        logger.error('Get guilds error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    /**
     * @swagger
     * /api/guilds:
     *   post:
     *     summary: Create a new guild
     *     tags: [Guilds]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *               description:
     *                 type: string
     */
    app.post('/api/guilds', authenticateToken, async (req, res) => {
      try {
        const userId = getUserId(req);
        const { name, description } = req.body;

        if (!name || name.trim().length === 0) {
          return res.status(400).json({ error: 'Guild name is required' });
        }

        const existingSocialStats = await withRetry(() =>
          prisma.socialStats.findUnique({
            where: { userId },
          })
        );

        if (existingSocialStats?.guildId) {
          return res.status(400).json({ error: 'User is already in a guild' });
        }

        const guild = await withRetry(() =>
          prisma.guild.create({
            data: {
              name: name.trim(),
              slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `guild-${Date.now()}`,
              description: description?.trim(),
              memberCount: 1,
            },
          })
        );

        await withRetry(() =>
          prisma.socialStats.upsert({
            where: { userId },
            create: {
              userId,
              guildId: guild.id,
              guildRole: 'leader',
            },
            update: {
              guildId: guild.id,
              guildRole: 'leader',
            },
          })
        );

        res.status(201).json(guild);
      } catch (error) {
        logger.error('Create guild error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    /**
     * @swagger
     * /api/guilds/{id}/join:
     *   post:
     *     summary: Join a guild
     *     tags: [Guilds]
     *     security:
     *       - bearerAuth: []
     */
    app.post('/api/guilds/:id/join', authenticateToken, async (req, res) => {
      try {
        const userId = getUserId(req);
        const { id: guildId } = req.params;

        const guild = await withRetry(() =>
          prisma.guild.findUnique({
            where: { id: guildId },
          })
        );

        if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
        }

        const existingSocialStats = await withRetry(() =>
          prisma.socialStats.findUnique({
            where: { userId },
          })
        );

        if (existingSocialStats?.guildId) {
          return res.status(400).json({ error: 'User is already in a guild' });
        }

        await withRetry(() =>
          prisma.socialStats.upsert({
            where: { userId },
            create: {
              userId,
              guildId,
              guildRole: 'member',
            },
            update: {
              guildId,
              guildRole: 'member',
            },
          })
        );

        await withRetry(() =>
          prisma.guild.update({
            where: { id: guildId },
            data: { memberCount: { increment: 1 } },
          })
        );

        res.json({ success: true, message: 'Joined guild successfully' });
      } catch (error) {
        logger.error('Join guild error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    /**
     * @swagger
     * /api/guilds/{id}/raids:
     *   get:
     *     summary: Get raids for a guild
     *     tags: [Raids]
     *     security:
     *       - bearerAuth: []
     */
    app.get('/api/guilds/:id/raids', authenticateToken, async (req, res) => {
      try {
        const { id: guildId } = req.params;
        const raids = await withRetry(() =>
          prisma.raid.findMany({
            where: { guildId },
            orderBy: { startDate: 'desc' },
          })
        );
        res.json(raids.map(serializeRaid));
      } catch (error) {
        logger.error('Get raids error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    /**
     * @swagger
     * /api/raids:
     *   post:
     *     summary: Create a new raid
     *     tags: [Raids]
     *     security:
     *       - bearerAuth: []
     */
    app.post('/api/raids', authenticateToken, async (req, res) => {
      try {
        const userId = getUserId(req);
        const { guildId, name, description, targetExp } = req.body;

        if (!guildId || !name) {
          return res.status(400).json({ error: 'Guild ID and name are required' });
        }

        const socialStats = await withRetry(() =>
          prisma.socialStats.findUnique({
            where: { userId },
          })
        );

        if (!socialStats || socialStats.guildId !== guildId) {
          return res.status(403).json({ error: 'You must be a member of this guild' });
        }

        const raid = await withRetry(() =>
          prisma.raid.create({
            data: {
              guildId,
              name: name.trim(),
              description: description?.trim(),
              targetExp: BigInt(targetExp || 1000),
              status: 'active',
              createdBy: userId,
            },
          })
        );

        res.status(201).json(serializeRaid(raid));
      } catch (error) {
        logger.error('Create raid error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    /**
     * @swagger
     * /api/raids/{id}/join:
     *   post:
     *     summary: Join a raid
     *     tags: [Raids]
     *     security:
     *       - bearerAuth: []
     */
    app.post('/api/raids/:id/join', authenticateToken, async (req, res) => {
      try {
        const userId = getUserId(req);
        const { id: raidId } = req.params;

        const raid = await withRetry(() =>
          prisma.raid.findUnique({
            where: { id: raidId },
          })
        );

        if (!raid) {
          return res.status(404).json({ error: 'Raid not found' });
        }

        if (raid.status !== 'active') {
          return res.status(400).json({ error: 'Raid is not active' });
        }

        const socialStats = await withRetry(() =>
          prisma.socialStats.findUnique({
            where: { userId },
          })
        );

        if (!socialStats || socialStats.guildId !== raid.guildId) {
          return res.status(403).json({ error: 'You must be a member of this guild' });
        }

        await withRetry(() =>
          prisma.raidParticipant.create({
            data: {
              raidId,
              userId,
            },
          })
        );

        res.json({ success: true, message: 'Joined raid successfully' });
      } catch (error) {
        logger.error('Join raid error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    /**
     * @swagger
     * /api/raids/{id}/contribute:
     *   post:
     *     summary: Contribute XP to a raid
     *     tags: [Raids]
     *     security:
     *       - bearerAuth: []
     */
    app.post('/api/raids/:id/contribute', authenticateToken, async (req, res) => {
      try {
        const userId = getUserId(req);
        const { id: raidId } = req.params;
        const { exp } = req.body;

        if (!exp || exp <= 0) {
          return res.status(400).json({ error: 'Valid XP amount is required' });
        }

        const raid = await withRetry(() =>
          prisma.raid.findUnique({
            where: { id: raidId },
            include: { participants: true },
          })
        );

        if (!raid) {
          return res.status(404).json({ error: 'Raid not found' });
        }

        if (raid.status !== 'active') {
          return res.status(400).json({ error: 'Raid is not active' });
        }

        const participant = raid.participants.find(p => p.userId === userId);
        if (!participant) {
          return res.status(403).json({ error: 'You must join the raid first' });
        }

        // Update participant contribution
        await withRetry(() =>
          prisma.raidParticipant.update({
            where: { id: participant.id },
            data: {
              expContributed: { increment: BigInt(exp) },
              lastActiveAt: new Date(),
            },
          })
        );

        // Update raid progress
        const updatedRaid = await withRetry(() =>
          prisma.raid.update({
            where: { id: raidId },
            data: {
              progressExp: { increment: BigInt(exp) },
            },
          })
        );

        // Check if raid is completed
        if (updatedRaid.progressExp >= updatedRaid.targetExp) {
          await withRetry(() =>
            prisma.raid.update({
              where: { id: raidId },
              data: {
                status: 'COMPLETED',
                endDate: new Date(),
              },
            })
          );

          // Award guild XP
          await withRetry(() =>
            prisma.guild.update({
              where: { id: raid.guildId },
              data: {
                totalExp: { increment: updatedRaid.targetExp },
                level: { increment: 1 },
              },
            })
          );
        }

        res.json({ success: true, message: 'XP contributed successfully' });
      } catch (error) {
        logger.error('Contribute to raid error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // ========================
    // Guild shared boss fights (#96)
    // ========================

    /**
     * @swagger
     * /api/guilds/boss/current:
     *   get:
     *     summary: Get the caller guild's current shared boss fight

     *     tags: [Raids]
     *     security:
     *       - bearerAuth: []
     */
    app.get('/api/guilds/boss/current', authenticateToken, async (req, res) => {
      try {
        const userId = getUserId(req);

        const socialStats = await withRetry(() => prisma.socialStats.findUnique({ where: { userId } }));
        if (!socialStats?.guildId) {
          return res.status(403).json({ error: 'You must be in a guild to fight bosses' });
        }

        const guildId = socialStats.guildId;
        const boss = await withRetry(() =>
          prisma.raid.findFirst({
            where: { guildId, isBoss: true, status: 'ACTIVE' },
            orderBy: { startDate: 'desc' },
            include: {
              participants: {
                orderBy: { expContributed: 'desc' },
                take: 10, // leaderboard: top damage dealers
              },
            },
          })
        );

        if (!boss) return res.json({ boss: null });

        // Resolve display names for the top-damage leaderboard.
        const participantUserIds = boss.participants.map((p) => p.userId);
        const users = participantUserIds.length
          ? await withRetry(() =>
              prisma.user.findMany({
                where: { id: { in: participantUserIds } },
                select: { id: true, displayName: true, hunterId: true },
              })
            )
          : [];
        const nameById = new Map(users.map((u) => [u.id, u.displayName || u.hunterId || 'Hunter']));

        const hp = boss.targetExp;
        const damage = boss.progressExp;
        res.json({
          boss: serializeRaid(boss),
          hp: hp.toString(),
          damage: damage.toString(),
          hpRemaining: (hp > damage ? hp - damage : BigInt(0)).toString(),
          percent: Number((damage * BigInt(10000)) / hp) / 100,
          me: boss.participants.find((p) => p.userId === userId)?.expContributed.toString() ?? '0',
          // Top damage dealers for the fight leaderboard (expContributed is BigInt → string via toJSON patch)
          leaderboard: boss.participants.map((p, i) => ({
            rank: i + 1,
            userId: p.userId,
            displayName: nameById.get(p.userId) ?? 'Hunter',
            damage: p.expContributed.toString(),
            isMe: p.userId === userId,
          })),
          participantCount: participantUserIds.length,
        });
      } catch (error) {
        logger.error('Get current boss error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    /**
     * @swagger
     * /api/guilds/boss/spawn:
     *   post:
     *     summary: Summon a shared boss for the caller's guild
     *     tags: [Raids]
     *     security:
     *       - bearerAuth: []
     */
    app.post('/api/guilds/boss/spawn', authenticateToken, async (req, res) => {
      try {
        const userId = getUserId(req);
        const tier = Number(req.body?.tier);

        if (!Number.isInteger(tier) || tier < 1 || tier > 5) {
          return res.status(400).json({ error: 'tier must be an integer between 1 and 5' });
        }

        const socialStats = await withRetry(() => prisma.socialStats.findUnique({ where: { userId } }));
        if (!socialStats?.guildId) {
          return res.status(403).json({ error: 'You must be in a guild to summon a boss' });
        }
        const guildId = socialStats.guildId;

        const existing = await withRetry(() =>
          prisma.raid.findFirst({ where: { guildId, isBoss: true, status: 'ACTIVE' } })
        );
        if (existing) {
          return res.status(409).json({ error: 'Your guild already has an active boss. Defeat it first.' });
        }

        const spec = GUILD_BOSSES.find((b) => b.tier === tier)!;
        const boss = await withRetry(() =>
          prisma.raid.create({
            data: {
              guildId,
              name: spec.name,
              description: `Tier ${spec.tier} shared boss. Clear quests to deal damage — every completion is one strike.`,
              targetExp: BigInt(spec.hp),
              progressExp: BigInt(0),
              status: 'ACTIVE',
              createdBy: userId,
              isBoss: true,
              bossTier: spec.tier,
            },
          })
        );

        // Track the summoner as the first participant so damage attribution works
        // even before other members join.
        await withRetry(() => prisma.raidParticipant.create({ data: { raidId: boss.id, userId } }));

        res.status(201).json({ boss: serializeRaid(boss) });
      } catch (error) {
        logger.error('Spawn boss error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    /**
     * @swagger
     * /api/guilds/boss/strike:
     *   post:
     *     summary: Deal one strike of boss damage from a verified quest completion
     *     tags: [Raids]
     *     security:
     *       - bearerAuth: []
     */
    // Explicit strike endpoint: kept for API completeness and tests — the UI
    // path is automatic (attemptBossStrike fires on quest completion).
    app.post('/api/guilds/boss/strike', authenticateToken, async (req, res) => {
      try {
        const userId = getUserId(req);
        const { questId } = req.body ?? {};
        if (!questId || typeof questId !== 'string') {
          return res.status(400).json({ error: 'questId is required' });
        }

        const socialStats = await withRetry(() => prisma.socialStats.findUnique({ where: { userId } }));
        if (!socialStats?.guildId) {
          return res.status(403).json({ error: 'You must be in a guild to fight bosses' });
        }
        const guildId: string = socialStats.guildId;

        const boss = await withRetry(() =>
          prisma.raid.findFirst({
            where: { guildId, isBoss: true, status: 'ACTIVE' },
            include: { participants: true },
          })
        );
        if (!boss) {
          return res.status(404).json({ error: 'No active boss for your guild' });
        }

        const result = await attemptBossStrike(userId, questId);
        if (result.outcome !== 'struck') {
          const statusByOutcome = {
            'no-guild': [403, 'You must be in a guild to fight bosses'],
            'no-boss': [404, 'No active boss for your guild'],
            'ineligible': [400, 'Quest is not eligible for a strike'],
            'duplicate': [409, 'This quest already fueled a strike'],
          } as const;
          const [code, message] = statusByOutcome[result.outcome];
          return res.status(code).json({ error: message });
        }

        // Real-time updates to every participant.
        for (const p of boss.participants) {
          emitToUser(p.userId, 'boss:updated', {
            bossId: boss.id,
            damage: result.damage,
            hpRemaining: result.hpRemaining,
            defeated: result.defeated,
            by: userId,
          });
        }

        res.json({
          success: true,
          damage: result.damage,
          hpRemaining: result.hpRemaining,
          defeated: result.defeated,
          message: result.defeated
            ? `${result.bossName} has been defeated!`
            : `Strike landed on ${result.bossName} for ${result.damage} damage.`,
        });
      } catch (error) {
        logger.error('Boss strike error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // ========================
    // White-label and Enterprise Management
    // ========================

    /**
     * @swagger
     * /api/organizations:
     *   post:
     *     summary: Create an organization
     *     tags: [Organizations]
     *     security:
     *       - bearerAuth: []
     */
    app.post('/api/organizations', authenticateToken, requireSubscriptionTier('enterprise'), async (req, res) => {
      try {
        const userId = getUserId(req);
        const { name, slug, description, plan } = req.body;

        if (!name || !slug) {
          return res.status(400).json({ error: 'Name and slug are required' });
        }

        const organization = await withRetry(() =>
          prisma.organization.create({
            data: {
              name: name.trim(),
              slug: slug.trim().toLowerCase(),
              description: description?.trim(),
              plan: plan || 'enterprise',
            },
          })
        );

        // Update user to be organization member
        await withRetry(() =>
          prisma.user.update({
            where: { id: userId },
            data: { organizationId: organization.id },
          })
        );

        // Update member count
        await withRetry(() =>
          prisma.organization.update({
            where: { id: organization.id },
            data: { memberCount: { increment: 1 } },
          })
        );

        res.status(201).json(organization);
      } catch (error) {
        logger.error('Create organization error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    /**
     * @swagger
     * /api/organizations/{id}/whitelabel:
     *   post:
     *     summary: Configure white-label settings
     *     tags: [Organizations]
     *     security:
     *       - bearerAuth: []
     */
    app.post('/api/organizations/:id/whitelabel', authenticateToken, requireSubscriptionTier('enterprise'), async (req, res) => {
      try {
        const { id: organizationId } = req.params;
        const { logoUrl, themeColors, customDomain, customEmail, features } = req.body;

        const organization = await withRetry(() =>
          prisma.organization.findUnique({
            where: { id: organizationId },
          })
        );

        if (!organization) {
          return res.status(404).json({ error: 'Organization not found' });
        }

        const whiteLabelConfig = await withRetry(() =>
          prisma.whiteLabelConfig.upsert({
            where: { organizationId },
            create: {
              organizationId,
              organizationName: organization.name,
              logoUrl,
              themeColors: themeColors ? JSON.stringify(themeColors) : null,
              customDomain,
              customEmail,
              features: features ? JSON.stringify(features) : null,
            },
            update: {
              logoUrl,
              themeColors: themeColors ? JSON.stringify(themeColors) : null,
              customDomain,
              customEmail,
              features: features ? JSON.stringify(features) : null,
            },
          })
        );

        res.status(201).json(whiteLabelConfig);
      } catch (error) {
        logger.error('Configure white-label error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    /**
     * @swagger
     * /api/organizations/{id}/whitelabel:
     *   get:
     *     summary: Get white-label configuration
     *     tags: [Organizations]
     *     security:
     *       - bearerAuth: []
     */
    app.get('/api/organizations/:id/whitelabel', authenticateToken, async (req, res) => {
      try {
        const { id: organizationId } = req.params;

        const whiteLabelConfig = await withRetry(() =>
          prisma.whiteLabelConfig.findUnique({
            where: { organizationId },
          })
        );

        if (!whiteLabelConfig) {
          return res.status(404).json({ error: 'White-label configuration not found' });
        }

        // Parse JSON fields
        const config = {
          ...whiteLabelConfig,
          themeColors: whiteLabelConfig.themeColors ? JSON.parse(whiteLabelConfig.themeColors) : null,
          features: whiteLabelConfig.features ? JSON.parse(whiteLabelConfig.features) : null,
        };

        res.json(config);
      } catch (error) {
        logger.error('Get white-label config error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // ========================
    // API Access Tier
    // ========================

    /**
     * @swagger
     * /api/organizations/{id}/api-keys:
     *   post:
     *     summary: Create API key for organization
     *     tags: [API Access]
     *     security:
     *       - bearerAuth: []
     */
    app.post('/api/organizations/:id/api-keys', authenticateToken, requireSubscriptionTier('enterprise'), async (req, res) => {
      try {
        const { id: organizationId } = req.params;
        const { name, permissions, rateLimit, expiresAt } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'API key name is required' });
        }

        const organization = await withRetry(() =>
          prisma.organization.findUnique({
            where: { id: organizationId },
          })
        );

        if (!organization) {
          return res.status(404).json({ error: 'Organization not found' });
        }

        const apiKey = await withRetry(() =>
          prisma.apiKey.create({
            data: {
              key: `sk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: name.trim(),
              organizationId,
              permissions: permissions ? JSON.stringify(permissions) : JSON.stringify(['read']),
              rateLimit: rateLimit || 1000,
              expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
          })
        );

        res.status(201).json(apiKey);
      } catch (error) {
        logger.error('Create API key error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    /**
     * @swagger
     * /api/organizations/{id}/api-keys:
     *   get:
     *     summary: Get API keys for organization
     *     tags: [API Access]
     *     security:
     *       - bearerAuth: []
     */
    app.get('/api/organizations/:id/api-keys', authenticateToken, requireSubscriptionTier('enterprise'), async (req, res) => {
      try {
        const { id: organizationId } = req.params;

        const apiKeys = await withRetry(() =>
          prisma.apiKey.findMany({
            where: { organizationId, revoked: false },
            orderBy: { createdAt: 'desc' },
          })
        );

        const keysWithPermissions = apiKeys.map(key => ({
          ...key,
          permissions: key.permissions ? JSON.parse(key.permissions) : [],
        }));

        res.json(keysWithPermissions);
      } catch (error) {
        logger.error('Get API keys error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // ========================
    // Quest Pack Marketplace
    // ========================

    /**
     * @swagger
     * /api/marketplace/quest-packs:
     *   get:
     *     summary: Get quest packs from marketplace
     *     tags: [Marketplace]
     */
    app.get('/api/marketplace/quest-packs', async (req, res) => {
      try {
        const { category, page = 1, limit = 20 } = req.query;

        const questPacks = await withRetry(() =>
          prisma.questPack.findMany({
            where: {
              isApproved: true,
              ...(category && { category: category as string }),
            },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy: { downloadCount: 'desc' },
          })
        );

        const packsWithTemplates = questPacks.map(pack => ({
          ...pack,
          questTemplates: pack.questTemplates ? JSON.parse(pack.questTemplates) : [],
        }));

        res.json(packsWithTemplates);
      } catch (error) {
        logger.error('Get quest packs error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    /**
     * @swagger
     * /api/marketplace/quest-packs:
     *   post:
     *     summary: Create quest pack for marketplace
     *     tags: [Marketplace]
     *     security:
     *       - bearerAuth: []
     */
    app.post('/api/marketplace/quest-packs', authenticateToken, async (req, res) => {
      try {
        const userId = getUserId(req);
        const { name, description, category, price, currency, questTemplates } = req.body;

        if (!name || !description || !category || !questTemplates) {
          return res.status(400).json({ error: 'Name, description, category, and quest templates are required' });
        }

        const questPack = await withRetry(() =>
          prisma.questPack.create({
            data: {
              creatorId: userId,
              name: name.trim(),
              description: description.trim(),
              category: category.trim(),
              price: price || 0,
              currency: currency || 'gold',
              questTemplates: JSON.stringify(questTemplates),
              isApproved: false, // Requires approval
            },
          })
        );

        res.status(201).json(questPack);
      } catch (error) {
        logger.error('Create quest pack error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    /**
     * @swagger
     * /api/marketplace/quest-packs/{id}/purchase:
     *   post:
     *     summary: Purchase quest pack
     *     tags: [Marketplace]
     *     security:
     *       - bearerAuth: []
     */
    app.post('/api/marketplace/quest-packs/:id/purchase', authenticateToken, idempotencyMiddleware(true), async (req, res) => {
      try {
        const userId = getUserId(req);
        const { id: questPackId } = req.params;

        const questPack = await withRetry(() =>
          prisma.questPack.findUnique({
            where: { id: questPackId },
          })
        );

        if (!questPack) {
          return res.status(404).json({ error: 'Quest pack not found' });
        }

        if (!questPack.isApproved) {
          return res.status(400).json({ error: 'Quest pack is not approved' });
        }

        // Check if already purchased
        const existingPurchase = await withRetry(() =>
          prisma.questPackPurchase.findUnique({
            where: {
              questPackId_userId: {
                questPackId,
                userId,
              },
            },
          })
        );

        if (existingPurchase) {
          return res.status(400).json({ error: 'Already purchased' });
        }

        // Handle payment (gold or Stripe)
        if (questPack.currency === 'gold') {
          const stats = await withRetry(() =>
            prisma.hunterStats.findUnique({
              where: { userId },
            })
          );

          if (!stats || stats.gold < questPack.price) {
            return res.status(400).json({ error: 'Insufficient gold' });
          }

          await withRetry(() =>
            prisma.$transaction(async (tx) => {
              const updated = await tx.hunterStats.update({
                where: { userId, gold: { gte: questPack.price } },
                data: { gold: { decrement: questPack.price } },
              }).catch(() => {
                throw new Error('Insufficient gold');
              });
              await tx.questPackPurchase.create({
                data: {
                  questPackId,
                  userId,
                },
              });
              await tx.questPack.update({
                where: { id: questPackId },
                data: { downloadCount: { increment: 1 } },
              });
              await recordLedgerEntry(tx as any, {
                userId,
                reason: 'QUEST_PACK_PURCHASE',
                goldDelta: -questPack.price,
                description: `Purchased quest pack "${questPack.name}"`,
                referenceType: 'QuestPack',
                referenceId: questPackId,
              });
              return updated;
            })
          );
          recordEconomyChange('quest_pack_purchase', 0, -questPack.price);
        } else {
          // Stripe payment would be handled here
          return res.status(501).json({ error: 'Stripe payment not implemented for quest packs' });
        }

        const packResponse = { success: true, message: 'Quest pack purchased successfully' };
        await captureIdempotentResponse(req, res, packResponse);
        res.json(packResponse);
      } catch (error) {
        logger.error('Purchase quest pack error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    httpServer.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down server...');
      httpServer.close(() => {
        logger.info('HTTP server closed');
      });
      io.close(); // drain WebSocket connections cleanly (fix #149)
      await closeJobs(); // drain in-flight jobs before exit (fix #337)
      await prisma.$disconnect();
      logger.info('Database disconnected');
      await closeRedisClient();
      await closeCacheClient();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ============================================================
// Error handling — MUST be the last middleware registered
// (review critical #1): the catch-all 404 runs when no route matched;
// the 4-arg error handler is always final in the chain.
// Registered at module load (not inside startServer) so the exported app
// serves JSON 404s even when the test suite imports it without booting.
// ============================================================
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

// Boot when run directly, but not when the app module is imported by the
// test suite (supertest drives the exported app; listen() would EADDRINUSE
// and the shop-seed would process.exit(1) on an empty test DB).
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;