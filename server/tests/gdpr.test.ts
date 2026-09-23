/**
 * Unit tests for GDPR / data-ownership endpoints (GET /api/account/export, DELETE /api/account)
 * and for the level-curve game math used across the economy.
 *
 * Style follows the existing suite (server/tests/*.test.ts): supertest against a small
 * Express app that mirrors the production route logic with a mocked Prisma layer.
 */
import request from 'supertest';
import express from 'express';

// Mirror of server/src/index.ts level-curve helpers (kept in sync manually)
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
  const xpToNext = Math.max(0, xpForNextLevel - xp);
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

// Test app mirroring the GDPR routes' contract
const buildApp = (prismaMock: any) => {
  const app = express();
  app.use(express.json());

  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.sendStatus(401);
    }
    req.user = { userId: 'user-123' };
    next();
  };

  const getUserId = (req: any): string => req.user?.userId ?? 'user-123';

  app.get('/api/account/export', authenticateToken, async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = await prismaMock.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const [stats, quests, subscription, payments, settings] = await Promise.all([
        prismaMock.hunterStats.findUnique({ where: { userId } }),
        prismaMock.quest.findMany({ where: { userId } }),
        prismaMock.subscription.findUnique({ where: { userId } }),
        prismaMock.payment.findMany({ where: { userId } }),
        prismaMock.userSettings.findUnique({ where: { userId } }),
      ]);
      res.setHeader('Content-Disposition', `attachment; filename="solo-quest-export-${userId}.json"`);
      res.json({
        exportedAt: new Date().toISOString(),
        format: 'solo-quest-data-export-v1',
        profile: user,
        stats,
        quests,
        subscription,
        payments,
        settings,
      });
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/account', authenticateToken, async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = await prismaMock.user.findUnique({ where: { id: userId } });
      if (!user || user.deletedAt) {
        return res.status(404).json({ error: 'User not found' });
      }
      const anonSuffix = userId.slice(0, 8);
      await prismaMock.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          email: `deleted-${anonSuffix}@deleted.soloquest.invalid`,
          displayName: 'Deleted Hunter',
          avatarUrl: null,
          passwordHash: 'deleted',
        },
      });
      res.json({ message: 'Account deleted successfully. Your personal data has been anonymized.' });
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Login route mirroring the deleted-account rejection added in production
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }
    const user = await prismaMock.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.deletedAt) {
      return res.status(401).json({ error: 'This account has been deleted' });
    }
    res.json({ token: 'test-token', user: { id: user.id } });
  });

  return app;
};

const baseUser = {
  id: 'user-123',
  email: 'hunter@example.com',
  displayName: 'Test Hunter',
  deletedAt: null,
};

describe('Level Curve Math', () => {
  it('starts at level 1 with correct xpToNext for a new hunter', () => {
    const result = calculateLevelAndProgress(0);
    expect(result.level).toBe(1);
    expect(result.xpToNext).toBe(xpRequiredForLevel(2) - 0);
    expect(result.progressPercent).toBeGreaterThanOrEqual(0);
    expect(result.progressPercent).toBeLessThanOrEqual(100);
  });

  it('never returns negative xpToNext', () => {
    for (let xp = 0; xp <= 20000; xp += 37) {
      expect(calculateLevelAndProgress(xp).xpToNext).toBeGreaterThanOrEqual(0);
    }
  });

  it('keeps progressPercent within 0-100 bounds (property check)', () => {
    for (let xp = 0; xp <= 50000; xp += 101) {
      const { progressPercent } = calculateLevelAndProgress(xp);
      expect(progressPercent).toBeGreaterThanOrEqual(0);
      expect(progressPercent).toBeLessThanOrEqual(100);
    }
  });

  it('level thresholds are monotonically increasing', () => {
    for (let level = 1; level < 50; level++) {
      expect(xpRequiredForLevel(level + 1)).toBeGreaterThan(xpRequiredForLevel(level));
    }
  });

  it('maps levels to ranks E through S', () => {
    expect(getRankFromLevel(1)).toBe('E');
    expect(getRankFromLevel(4)).toBe('E');
    expect(getRankFromLevel(5)).toBe('D');
    expect(getRankFromLevel(10)).toBe('C');
    expect(getRankFromLevel(15)).toBe('B');
    expect(getRankFromLevel(20)).toBe('A');
    expect(getRankFromLevel(25)).toBe('S');
    expect(getRankFromLevel(99)).toBe('S');
  });
});

describe('GET /api/account/export (GDPR data portability)', () => {
  let app: express.Application;
  let prismaMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue(baseUser) },
      hunterStats: { findUnique: jest.fn().mockResolvedValue({ level: 3, gold: 120 }) },
      quest: { findMany: jest.fn().mockResolvedValue([{ id: 'q1', title: 'Morning run' }]) },
      subscription: { findUnique: jest.fn().mockResolvedValue({ plan: 'FREE' }) },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      userSettings: { findUnique: jest.fn().mockResolvedValue({ theme: 'dark' }) },
    };
    app = buildApp(prismaMock);
  });

  it('returns a full export for an authenticated user', async () => {
    const response = await request(app)
      .get('/api/account/export')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.body.format).toBe('solo-quest-data-export-v1');
    expect(response.body.profile).toHaveProperty('email', 'hunter@example.com');
    expect(response.body.quests).toHaveLength(1);
    expect(response.body.stats).toHaveProperty('level', 3);
    expect(response.headers['content-disposition']).toContain('solo-quest-export-user-123.json');
  });

  it('returns 401 without a token', async () => {
    await request(app).get('/api/account/export').expect(401);
  });

  it('returns 404 for an unknown user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await request(app)
      .get('/api/account/export')
      .set('Authorization', 'Bearer test-token')
      .expect(404);
  });

  it('returns 500 if the data layer fails', async () => {
    prismaMock.quest.findMany.mockRejectedValue(new Error('DB down'));
    await request(app)
      .get('/api/account/export')
      .set('Authorization', 'Bearer test-token')
      .expect(500);
  });
});

describe('DELETE /api/account (GDPR right to erasure)', () => {
  let app: express.Application;
  let prismaMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ ...baseUser }),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...baseUser, ...data })),
      },
    };
    app = buildApp(prismaMock);
  });

  it('soft-deletes and anonymizes PII', async () => {
    const response = await request(app)
      .delete('/api/account')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.body.message).toMatch(/deleted/i);

    const updateCall = prismaMock.user.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: 'user-123' });
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
    expect(updateCall.data.email).toMatch(/^deleted-user-123@deleted\.soloquest\.invalid$/);
    expect(updateCall.data.displayName).toBe('Deleted Hunter');
    expect(updateCall.data.avatarUrl).toBeNull();
    expect(updateCall.data.passwordHash).toBe('deleted');
  });

  it('returns 404 for a user that does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await request(app)
      .delete('/api/account')
      .set('Authorization', 'Bearer test-token')
      .expect(404);
  });

  it('returns 404 when the account was already deleted (idempotent safety)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...baseUser, deletedAt: new Date() });
    await request(app)
      .delete('/api/account')
      .set('Authorization', 'Bearer test-token')
      .expect(404);
  });

  it('requires authentication', async () => {
    await request(app).delete('/api/account').expect(401);
  });
});

describe('Login after account deletion', () => {
  let app: express.Application;
  let prismaMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock = {
      user: { findUnique: jest.fn() },
    };
    app = buildApp(prismaMock);
  });

  it('rejects login for a deleted account', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...baseUser, deletedAt: new Date() });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hunter@example.com', password: 'password123' })
      .expect(401);

    expect(response.body.error).toMatch(/deleted/i);
  });

  it('allows login for an active account', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...baseUser });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hunter@example.com', password: 'password123' })
      .expect(200);

    expect(response.body.token).toBe('test-token');
  });
});
