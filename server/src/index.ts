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
import { env } from './env';
import { initRedisClient, closeRedisClient, getRateLimiter, initRateLimiters } from './rateLimiter';
import { initCacheClient, closeCacheClient, getFromCache, setCache, deleteFromCache, deleteCachePattern, invalidateUserCache, getCacheStats } from './cache';
import { csrfProtection } from './csrf';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const port = parseInt(env.PORT, 10);

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
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5000', 'http://localhost'],
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

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    socket.data.userId = decoded.userId || decoded.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
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
const emitToUser = (userId: string, event: string, data: any) => {
  io.to(`user:${userId}`).emit(event, data);
};

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5000', 'http://localhost'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting middleware using Redis or in-memory fallback
const createRateLimitMiddleware = (limiterType: 'api' | 'auth' | 'createQuest' | 'shop') => {
  return async (req: any, res: any, next: any) => {
    try {
      const key = req.ip || req.connection.remoteAddress;
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

// Apply general API rate limiting
app.use('/api/', createRateLimitMiddleware('api'));

// Apply CSRF protection to all API routes
app.use('/api/', csrfProtection);

// Enable HTTP keep-alive for connection reuse
app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=5, max=1000');
  next();
});

// Request timing middleware for performance monitoring
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 100) {
      logger.info(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  next();
});

// Request timeout handling
app.use((req, res, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  }, 30000); // 30 second timeout

  res.on('finish', () => clearTimeout(timeout));
  next();
});

// HTTP caching headers for static-like data
app.use((req, res, next) => {
  if (req.path.startsWith('/api/shop')) {
    res.setHeader('Cache-Control', 'public, max-age=600'); // 10 minutes
  } else if (req.path.startsWith('/api/hunter/me') || req.path.startsWith('/api/gates')) {
    res.setHeader('Cache-Control', 'private, max-age=120'); // 2 minutes
  } else if (req.path.startsWith('/api/quests')) {
    res.setHeader('Cache-Control', 'private, max-age=60'); // 1 minute
  }
  next();
});

// Auth middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

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
  const xpInCurrentLevel = xp - xpForCurrentLevel;
  const xpToNext = xpForNextLevel - xp; // Actual remaining XP needed
  const levelBandWidth = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = levelBandWidth === 0 ? 100 : (xpInCurrentLevel / levelBandWidth) * 100;
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

const baseXpByRank: Record<string, number> = {
  E: 10, D: 25, C: 50, B: 100, A: 200, S: 500,
};

const baseGoldByRank: Record<string, number> = {
  E: 5, D: 10, C: 20, B: 40, A: 80, S: 200,
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

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        hunterId: user.hunterId,
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

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        hunterId: user.hunterId,
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// Hunter routes
// ========================

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
            statStrength: true,
            statAgility: true,
            statIntelligence: true,
            statEndurance: true,
            statLuck: true,
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

    const userData = {
      id: user.id,
      hunterId: user.hunterId,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      stats: user.hunterStats
    };

    await setCache(cacheKey, userData, 2 * 60 * 1000); // Cache for 2 minutes
    res.json(userData);
  } catch (error) {
    logger.error('Get hunter error:', error);
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

    const quest = await withRetry(() => prisma.quest.update({
      where: { id },
      data: {
        title: title ? title.trim() : undefined,
        rank: rank ?? undefined,
        category: category ?? undefined,
        status: status ?? undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        notes: notes ? notes.trim() : undefined,
        gateId: gateId ?? undefined,
        isBossQuest: isBossQuest ?? undefined,
        expReward: newExpReward,
        goldReward: newGoldReward,
        completedAt: status === 'COMPLETED' ? new Date() : (completedAt ? new Date(completedAt) : undefined),
        updatedAt: new Date(),
      },
      include: { gate: true, subtasks: true }
    }));

    // Invalidate quest caches for this user
    await deleteCachePattern(`quests:${userId}:*`);

    emitToUser(userId, 'quest:updated', quest);

    // If quest was completed, award rewards server-side with transaction
    if (status === 'COMPLETED' && existingQuest.status !== 'COMPLETED') {
      await prisma.$transaction(async (tx) => {
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

          // Dual-purpose bonus
          const dualPurposeBonus = calculateDualPurposeBonus({
            isDaily: existingQuest.deadline !== null,
            contributesToStreak: stats.streak > 0,
            unlocksLore: false, // Could be expanded with lore system
            completesAchievement: false // Could be expanded with achievement system
          });
          finalXpReward += dualPurposeBonus.xpBonus;
          finalGoldReward += dualPurposeBonus.goldBonus;

          // Progression scaling
          finalXpReward = calculateScaledReward(finalXpReward, stats.level, existingQuest.rank);
          finalGoldReward = calculateScaledReward(finalGoldReward, stats.level, existingQuest.rank);

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
              hp: Math.min(stats.hp + 2, stats.hpMax),
              lastActiveDate: new Date(),
            },
          });

          // Invalidate user cache
          await invalidateUserCache(userId);

          emitToUser(userId, 'stats:updated', updatedStats);

          // Enhanced notification with bonus breakdown
          let bonusMessage = '';
          if (varietyBonus > 0) bonusMessage += ` Variety +${varietyBonus} XP`;
          if (dualPurposeBonus.xpBonus > 0) bonusMessage += ` Dual-purpose +${dualPurposeBonus.xpBonus} XP`;
          
          const notif = await tx.notification.create({
            data: {
              userId,
              message: `Quest "${existingQuest.title}" completed! XP +${finalXpReward}${bonusMessage}. Gold +${finalGoldReward}.`,
              type: 'REWARD',
            },
          });
          emitToUser(userId, 'notification:new', notif);

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

    // If quest failed, apply penalty with transaction
    if (status === 'FAILED' && existingQuest.status !== 'FAILED') {
      await prisma.$transaction(async (tx) => {
        const stats = await tx.hunterStats.findUnique({ where: { userId } });
        if (stats) {
          const { level, xpToNext, progressPercent } = calculateLevelAndProgress(stats.exp);
          const updatedStats = await tx.hunterStats.update({
            where: { userId },
            data: { 
              hp: Math.max(stats.hp - 10, 0),
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
              message: `Quest "${existingQuest.title}" failed. HP -10.`,
              type: 'PENALTY',
            },
          });
          emitToUser(userId, 'notification:new', notif);
        }
      });
    }

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
        // Auto-fail the overdue quest first
        await prisma.$transaction(async (tx) => {
          const stats = await tx.hunterStats.findUnique({ where: { userId } });
          if (stats) {
            const { level, xpToNext, progressPercent } = calculateLevelAndProgress(stats.exp);
            await tx.hunterStats.update({
              where: { userId },
              data: { 
                hp: Math.max(stats.hp - 10, 0),
                level,
                expToNext: xpToNext,
                progressPercent: progressPercent,
              },
            });
          }
          
          await tx.quest.update({
            where: { id },
            data: { status: 'FAILED' },
          });
        });
        
        return res.status(400).json({ error: 'Cannot delete overdue quest. It has been auto-failed.' });
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
      
      // Check streak decay - if last completion wasn't yesterday or today, reset streak
      let newStreak = cleared ? stats.streak + 1 : 0;
      if (stats.lastActiveDate) {
        const lastActive = new Date(stats.lastActiveDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        const lastActiveDate = new Date(lastActive);
        lastActiveDate.setHours(0, 0, 0, 0);
        
        // If last active date is before yesterday, reset streak
        if (lastActiveDate < yesterday) {
          newStreak = cleared ? 1 : 0;
        }
      }

      const newExp = stats.exp + xpGain;
      const { level, xpToNext, progressPercent } = calculateLevelAndProgress(newExp);
      const newRank = getRankFromLevel(level);
      const oldLevel = stats.level;

      const [updatedStats, notif] = await Promise.all([
        withRetry(() => prisma.hunterStats.update({
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
        })),
        withRetry(() => prisma.notification.create({
          data: {
            userId,
            message: cleared
              ? `Daily Dungeon cleared! XP +${xpGain}. Gold +${goldGain}. HP +${hpGain}.`
              : `Daily Dungeon ended. ${completedTasks}/${totalTasks} completed. XP +${xpGain}.`,
            type: 'REWARD',
          },
          select: { id: true, message: true, type: true, createdAt: true }
        }))
      ]);

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

app.post('/api/shop/purchase/:itemId', authenticateToken, createRateLimitMiddleware('shop'), async (req, res) => {
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

    // Use transaction to ensure atomic purchase
    const result = await prisma.$transaction(async (tx) => {
      // Check and deduct gold atomically
      const stats = await tx.hunterStats.findUnique({ 
        where: { userId },
        select: { id: true, gold: true, exp: true, level: true }
      });
      
      if (!stats || stats.gold < item.costGold) {
        throw new Error('Insufficient gold');
      }

      // Deduct gold
      const updatedStats = await tx.hunterStats.update({
        where: { userId },
        data: { gold: stats.gold - item.costGold },
        select: { id: true, gold: true, level: true, rank: true, exp: true }
      });

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

    emitToUser(userId, 'stats:updated', result.updatedStats);
    emitToUser(userId, 'notification:new', result.notif);

    res.json({ inventory: result.inventoryItem, stats: result.updatedStats });
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

app.post('/api/milestones/:id/complete', authenticateToken, async (req, res) => {
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
        prisma.hunterStats.update({
          where: { userId },
          data: {
            exp: { increment: milestone.xpReward },
            gold: { increment: milestone.goldReward },
          },
        })
      );

      io.to(userId).emit('statsUpdated', {
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

    res.json({ success: true, milestone, reward: { xp: milestone.xpReward, gold: milestone.goldReward } });
  } catch (error) {
    logger.error('Complete milestone error:', error);
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

app.post('/api/mastery-challenges/:id/attempt', authenticateToken, async (req, res) => {
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
        prisma.hunterStats.update({
          where: { userId },
          data: {
            exp: { increment: challenge.xpReward },
            gold: { increment: challenge.goldReward },
          },
        })
      );
    }

    res.json({ success: true, progress });
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

app.post('/api/quests/:id/complete-tiered', authenticateToken, async (req, res) => {
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

    const qualityMultipliers = {
      PERFECT: 1.5,
      GOOD: 1.0,
      POOR: 0.5,
    };

    const multiplier = qualityMultipliers[completionQuality as keyof typeof qualityMultipliers];
    const xpEarned = Math.floor(quest.expReward * multiplier);
    const goldEarned = Math.floor(quest.goldReward * multiplier);

    const [updatedQuest, stats] = await withRetry(() =>
      prisma.$transaction([
        prisma.quest.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        }),
        prisma.hunterStats.update({
          where: { userId },
          data: {
            exp: { increment: xpEarned },
            gold: { increment: goldEarned },
            lastActiveDate: new Date(),
          },
        }),
      ])
    );

    io.to(userId).emit('statsUpdated', {
      exp: stats.exp + xpEarned,
      gold: stats.gold + goldEarned,
    });

    res.json({
      success: true,
      quest: updatedQuest,
      rewards: { xp: xpEarned, gold: goldEarned },
      quality: completionQuality,
    });
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

    httpServer.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down server...');
      httpServer.close(() => {
        logger.info('HTTP server closed');
      });
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

startServer();

export default app;