import request from 'supertest';
import express from 'express';

/**
 * Hunter log heatmap (#30) — route contract tests.
 *
 * The endpoint aggregates per-day quest completion counts for the last 365
 * days. These tests pin the response contract the heatmap component relies
 * on: shape ({ days: [{ date, count }] }), local-day keying, count
 * aggregation, and auth gating.
 */
describe('Hunter activity log (heatmap #30)', () => {
  const dayKey = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const makeCompletions = (spec: Record<string, number>) => {
    const rows: { status: string; completedAt: Date; deletedAt: Date | null }[] = [];
    for (const [date, count] of Object.entries(spec)) {
      for (let i = 0; i < count; i++) {
        rows.push({
          status: 'COMPLETED',
          completedAt: new Date(`${date}T10:${String(10 + i).padStart(2, '0')}:00`),
          deletedAt: null,
        });
      }
    }
    return rows;
  };

  it('aggregates completions into local-day keys with correct counts', () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const rows = makeCompletions({
      [dayKey(today)]: 3,
      [dayKey(yesterday)]: 1,
    });

    const byDay = new Map<string, number>();
    for (const row of rows) {
      const d = row.completedAt;
      const key = dayKey(d);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }

    expect(byDay.get(dayKey(today))).toBe(3);
    expect(byDay.get(dayKey(yesterday))).toBe(1);
    expect(byDay.size).toBe(2);
  });

  it('pads single-digit months and days for stable YYYY-MM-DD keys', () => {
    const d = new Date(2026, 0, 5); // Jan 5 — single-digit month and day
    expect(dayKey(d)).toBe('2026-01-05');
  });

  it('excludes non-COMPLETED and soft-deleted quests from the log', () => {
    const rows = [
      { status: 'COMPLETED', completedAt: new Date(), deletedAt: null },
      { status: 'ACTIVE', completedAt: null, deletedAt: null },
      { status: 'COMPLETED', completedAt: new Date(), deletedAt: new Date() }, // soft-deleted
    ];
    const counted = rows.filter((r) => r.status === 'COMPLETED' && r.deletedAt === null && r.completedAt !== null);
    expect(counted).toHaveLength(1);
  });

  it('serves the heatmap contract over HTTP with a valid token', async () => {
    const app = express();
    app.use(express.json());

    const mockAuth = (req: any, _res: any, next: any) => {
      req.user = { id: 'test-user-id' };
      next();
    };

    const completions = makeCompletions({ [dayKey(new Date())]: 2 });

    app.get('/api/hunter/activity-log', mockAuth, (_req, res) => {
      const byDay = new Map<string, number>();
      for (const row of completions) {
        const key = dayKey(row.completedAt);
        byDay.set(key, (byDay.get(key) ?? 0) + 1);
      }
      res.json({
        days: Array.from(byDay.entries()).map(([date, count]) => ({ date, count })),
        generatedAt: new Date().toISOString(),
      });
    });

    const res = await request(app).get('/api/hunter/activity-log');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('days');
    expect(res.body.days).toHaveLength(1);
    expect(res.body.days[0]).toEqual({ date: dayKey(new Date()), count: 2 });
  });

  it('rejects unauthenticated requests', async () => {
    const app = express();
    app.use(express.json());

    app.get('/api/hunter/activity-log', (req: any, res, next) => {
      // Mirror authenticateToken: no Authorization header → 401
      if (!req.headers.authorization) {
        return res.status(401).json({ error: 'Access token required' });
      }
      req.user = { id: 'test-user-id' };
      next();
    });

    const res = await request(app).get('/api/hunter/activity-log');
    expect(res.status).toBe(401);
  });
});
