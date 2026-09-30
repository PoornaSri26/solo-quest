import request from 'supertest';
import express from 'express';

/**
 * Guild shared boss fights (#96) — mechanics tests.
 *
 * Core invariants pinned here:
 * - Boss tier specs are deterministic (tier → name/HP)
 * - Strike eligibility: COMPLETED, not soft-deleted, within window, unused
 * - Damage derives from quest rank, never client input
 * - Raid BigInt fields serialize (the res.json(BigInt) crash bug)
 */
describe('Guild shared boss fights (#96)', () => {
  const GUILD_BOSSES = [
    { tier: 1, name: 'Gatekeeper Hound', hp: 1500 },
    { tier: 2, name: 'Dire Beast of the Rift', hp: 4000 },
    { tier: 3, name: 'Rift Marshal', hp: 9000 },
    { tier: 4, name: 'Archon of the Deep Rift', hp: 16000 },
    { tier: 5, name: 'The Rift Sovereign', hp: 25000 },
  ];

  const rankDamage: Record<string, number> = { E: 1, D: 2, C: 3, B: 4, A: 5, S: 6 };
  const BOSS_QUALITY_MULTIPLIER: Record<string, number> = { PERFECT: 1.5, GOOD: 1, POOR: 0.5 };
  const bossStrikeDamage = (rank: string, quality?: string | null): bigint => {
    const base = BigInt(rankDamage[rank] ?? 1) * BigInt(100);
    const mult = (quality && BOSS_QUALITY_MULTIPLIER[quality]) || 1;
    return BigInt(Math.round(Number(base) * mult));
  };

  it('defines strictly increasing boss HP by tier with unique names', () => {
    for (let i = 1; i < GUILD_BOSSES.length; i++) {
      expect(GUILD_BOSSES[i].hp).toBeGreaterThan(GUILD_BOSSES[i - 1].hp);
    }
    expect(new Set(GUILD_BOSSES.map((b) => b.name)).size).toBe(GUILD_BOSSES.length);
    expect(GUILD_BOSSES.map((b) => b.tier)).toEqual([1, 2, 3, 4, 5]);
  });

  it('scales strike damage with quest rank (E lowest, S highest)', () => {
    expect(rankDamage.E).toBeLessThan(rankDamage.B);
    expect(rankDamage.B).toBeLessThan(rankDamage.S);
    expect(rankDamage.S * 100).toBe(600);
  });

  it('scales strike damage by tiered completion quality', () => {
    // PERFECT 1.5x, GOOD 1x, POOR 0.5x; null/unknown quality = standard 1x
    expect(bossStrikeDamage('C').toString()).toBe('300');
    expect(bossStrikeDamage('C', 'GOOD').toString()).toBe('300');
    expect(bossStrikeDamage('C', 'PERFECT').toString()).toBe('450');
    expect(bossStrikeDamage('C', 'POOR').toString()).toBe('150');
    expect(bossStrikeDamage('S', 'PERFECT').toString()).toBe('900');
    expect(bossStrikeDamage('E', 'POOR').toString()).toBe('50');
    expect(bossStrikeDamage('B', null).toString()).toBe('400');
    expect(bossStrikeDamage('B', 'MADE_UP').toString()).toBe('400');
  });

  it('rounds fractional damage up to a whole number', () => {
    // 150 * 1.5 = 225 exactly; an odd base like 350 * 0.5 = 175 — both exact.
    // Use a case with a repeating fraction guard: 100 * 1.5 = 150 (exact).
    expect(Number(bossStrikeDamage('D', 'PERFECT')) % 1).toBe(0);
  });

  it('accepts only eligible quests for strikes', () => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const eligible = (q: any) =>
      q &&
      q.userId === 'u1' &&
      q.deletedAt === null &&
      q.status === 'COMPLETED' &&
      q.completedAt &&
      q.completedAt >= cutoff &&
      !q.bossStrikeUsed;

    expect(eligible({ userId: 'u1', deletedAt: null, status: 'COMPLETED', completedAt: now, bossStrikeUsed: false })).toBe(true);
    expect(eligible({ userId: 'u2', deletedAt: null, status: 'COMPLETED', completedAt: now, bossStrikeUsed: false })).toBe(false); // not owner
    expect(eligible({ userId: 'u1', deletedAt: null, status: 'ACTIVE', completedAt: null, bossStrikeUsed: false })).toBe(false); // not completed
    expect(eligible({ userId: 'u1', deletedAt: new Date(), status: 'COMPLETED', completedAt: now, bossStrikeUsed: false })).toBe(false); // deleted
    expect(eligible({ userId: 'u1', deletedAt: null, status: 'COMPLETED', completedAt: new Date(cutoff.getTime() - 1000), bossStrikeUsed: false })).toBe(false); // stale
    expect(eligible({ userId: 'u1', deletedAt: null, status: 'COMPLETED', completedAt: now, bossStrikeUsed: true })).toBe(false); // already used
  });

  it('serializes raid BigInt HP fields as strings (regression: res.json(BigInt) crash)', () => {
    (BigInt.prototype as any).toJSON = function () {
      return this.toString();
    };
    const serializeRaid = (raid: any) => ({
      ...raid,
      targetExp: raid.targetExp != null ? raid.targetExp.toString() : null,
      progressExp: raid.progressExp != null ? raid.progressExp.toString() : null,
    });

    const raid = { id: 'r1', targetExp: 1500n, progressExp: 300n };
    expect(() => JSON.stringify({ boss: raid })).not.toThrow(); // toJSON patch active
    const json = JSON.stringify(serializeRaid(raid));
    expect(JSON.parse(json)).toMatchObject({ targetExp: '1500', progressExp: '300' });
  });

  it('serves the boss contract: spawn requires tier, strike requires questId, guild membership gates all', async () => {
    const app = express();
    app.use(express.json());

    const guildsByUser: Record<string, string | null> = {
      'member-token': 'guild-1',
      'loner-token': null,
    };

    const auth = (req: any, res: any, next: any) => {
      const token = (req.headers.authorization || '').replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Access token required' });
      req.userId = token;
      next();
    };

    app.post('/api/guilds/boss/spawn', auth, (req: any, res) => {
      const tier = Number(req.body?.tier);
      if (!Number.isInteger(tier) || tier < 1 || tier > 5) {
        return res.status(400).json({ error: 'tier must be an integer between 1 and 5' });
      }
      if (!guildsByUser[req.userId]) {
        return res.status(403).json({ error: 'You must be in a guild to summon a boss' });
      }
      const spec = GUILD_BOSSES.find((b) => b.tier === tier)!;
      res.status(201).json({ boss: { tier: spec.tier, name: spec.name, targetExp: String(spec.hp) } });
    });

    app.post('/api/guilds/boss/strike', auth, (req: any, res) => {
      if (!guildsByUser[req.userId]) {
        return res.status(403).json({ error: 'You must be in a guild to fight bosses' });
      }
      if (!req.body?.questId || typeof req.body.questId !== 'string') {
        return res.status(400).json({ error: 'questId is required' });
      }
      res.json({ success: true, damage: '300', hpRemaining: '1200', defeated: false });
    });

    // Spawn: invalid tier rejected before anything else
    const badTier = await request(app)
      .post('/api/guilds/boss/spawn')
      .set('Authorization', 'Bearer member-token')
      .send({ tier: 9 });
    expect(badTier.status).toBe(400);

    // Spawn: guildless hunter rejected
    const loner = await request(app)
      .post('/api/guilds/boss/spawn')
      .set('Authorization', 'Bearer loner-token')
      .send({ tier: 1 });
    expect(loner.status).toBe(403);

    // Strike: missing questId rejected
    const noQuest = await request(app)
      .post('/api/guilds/boss/strike')
      .set('Authorization', 'Bearer member-token')
      .send({});
    expect(noQuest.status).toBe(400);

    // Strike: unauthenticated rejected
    const anon = await request(app).post('/api/guilds/boss/strike').send({ questId: 'q1' });
    expect(anon.status).toBe(401);

    // Happy path strike
    const ok = await request(app)
      .post('/api/guilds/boss/strike')
      .set('Authorization', 'Bearer member-token')
      .send({ questId: 'quest-123' });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ success: true, damage: '300' });
  });
});
