/**
 * Unit tests for the gameplay systems added from the improvement report:
 * - Combo/momentum multiplier (#4)
 * - Randomized loot drops (#13)
 * - Speedrun bonus (#34)
 * - Category-to-stat mapping (#3)
 * - Adaptive rank suggestion (#2)
 * - Procedural flavor text (#25)
 *
 * The mirror functions below match server/src/index.ts (kept in sync manually,
 * same pattern as gdpr.test.ts).
 */

// ---- Mirrored helpers from server/src/index.ts ----

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

const calculateComboMultiplier = (comboCount: number, lastComboDate: Date | null, now = new Date()): number => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const comboDay = lastComboDate ? new Date(lastComboDate) : null;
  const isSameDay = comboDay !== null && !Number.isNaN(comboDay.getTime()) && comboDay.setHours(0, 0, 0, 0) === today.getTime();
  const effectiveCombo = isSameDay ? comboCount : 0;
  return Math.min(1.5, 1 + effectiveCombo * 0.1);
};

const LOOT_TABLE = [
  { id: 'essence', name: 'Mana Essence', rarity: 'common', emoji: '💧' },
  { id: 'shard', name: 'Crystal Shard', rarity: 'common', emoji: '🔷' },
  { id: 'ember', name: 'Hunter Ember', rarity: 'common', emoji: '🔥' },
  { id: 'relic', name: 'Ancient Relic', rarity: 'rare', emoji: '🗿' },
  { id: 'grimoire', name: 'Sealed Grimoire', rarity: 'rare', emoji: '📖' },
  { id: 'core', name: 'Gate Core', rarity: 'epic', emoji: '🔮' },
];

const rollLootDrop = (rank: string, rng: () => number = Math.random) => {
  const rankBoost: Record<string, number> = { E: 0, D: 0.02, C: 0.05, B: 0.08, A: 0.12, S: 0.18 };
  const chance = 0.35 + (rankBoost[rank] ?? 0);
  if (rng() >= chance) return { dropped: false };
  const weights: Record<string, number> = { common: 5, rare: 3, epic: 1 };
  const pool = LOOT_TABLE.flatMap(item => Array(weights[item.rarity] ?? 1).fill(item));
  const item = pool[Math.floor(rng() * pool.length)];
  return { dropped: true, item };
};

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

const calculateStatGrowth = (category: string, rank: string): number => {
  const rankGrowth: Record<string, number> = { E: 1, D: 1, C: 2, B: 2, A: 3, S: 5 };
  return categoryToStat[category] ? (rankGrowth[rank] ?? 1) : 0;
};

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

const suggestRankForEnergy = (energy: number) => {
  if (energy <= 2) return { minRank: 'E', maxRank: 'D', label: 'Take it easy — low-rank quests only.' };
  if (energy === 3) return { minRank: 'D', maxRank: 'C', label: 'Steady pace — D and C-rank quests.' };
  if (energy === 4) return { minRank: 'C', maxRank: 'A', label: 'Good energy — C to A-rank quests.' };
  return { minRank: 'B', maxRank: 'S', label: 'Peak condition — hunt big game today!' };
};

// ---- Tests ----

describe('Combo / Momentum Multiplier (#4)', () => {
  const now = new Date('2026-09-23T15:00:00');

  it('returns 1.0 for the first completion of the day', () => {
    expect(calculateComboMultiplier(0, null, now)).toBe(1.0);
  });

  it('grows 0.1 per prior completion today', () => {
    const today = new Date('2026-09-23T08:00:00');
    expect(calculateComboMultiplier(1, today, now)).toBeCloseTo(1.1);
    expect(calculateComboMultiplier(3, today, now)).toBeCloseTo(1.3);
  });

  it('caps at 1.5x', () => {
    const today = new Date('2026-09-23T08:00:00');
    expect(calculateComboMultiplier(10, today, now)).toBe(1.5);
  });

  it('resets on a new day (no cross-day combos)', () => {
    const yesterday = new Date('2026-09-22T20:00:00');
    expect(calculateComboMultiplier(5, yesterday, now)).toBe(1.0);
  });

  it('treats invalid dates as no combo', () => {
    expect(calculateComboMultiplier(5, new Date('not-a-date'), now)).toBe(1.0);
  });
});

describe('Loot Drops (#13)', () => {
  it('drops nothing when rng above threshold', () => {
    expect(rollLootDrop('E', () => 0.99).dropped).toBe(false);
  });

  it('always drops for S-rank when rng is 0', () => {
    const result = rollLootDrop('S', () => 0);
    expect(result.dropped).toBe(true);
    expect(result.item).toBeDefined();
  });

  it('gives higher-rank quests a higher drop chance (statistical)', () => {
    let eDrops = 0;
    let sDrops = 0;
    for (let i = 0; i < 1000; i++) {
      if (rollLootDrop('E', Math.random).dropped) eDrops++;
      if (rollLootDrop('S', Math.random).dropped) sDrops++;
    }
    expect(sDrops).toBeGreaterThan(eDrops);
  });

  it('only drops items from the loot table', () => {
    for (let i = 0; i < 200; i++) {
      const r = rollLootDrop('A', Math.random);
      if (r.dropped) {
        expect(LOOT_TABLE.some(t => t.id === r.item!.id)).toBe(true);
      }
    }
  });
});

describe('Speedrun Bonus (#34)', () => {
  const created = new Date('2026-09-23T00:00:00');
  const deadline = new Date('2026-09-24T00:00:00'); // 24h window

  it('returns 0 for quests without a deadline', () => {
    expect(calculateSpeedrunBonus({ createdAt: created, deadline: null })).toBe(0);
  });

  it('pays +25% for finishing under half the window', () => {
    const halfway = new Date('2026-09-23T11:00:00');
    expect(calculateSpeedrunBonus({ createdAt: created, deadline }, halfway)).toBe(0.25);
  });

  it('pays +10% for finishing under 75% of the window', () => {
    const t = new Date('2026-09-23T17:00:00');
    expect(calculateSpeedrunBonus({ createdAt: created, deadline }, t)).toBe(0.1);
  });

  it('pays nothing after 75% of the window', () => {
    const t = new Date('2026-09-23T23:00:00');
    expect(calculateSpeedrunBonus({ createdAt: created, deadline }, t)).toBe(0);
  });

  it('handles inverted/invalid windows safely', () => {
    const badDeadline = new Date('2026-09-22T00:00:00'); // before created
    expect(calculateSpeedrunBonus({ createdAt: created, deadline: badDeadline })).toBe(0);
    expect(calculateSpeedrunBonus({ createdAt: created, deadline: new Date('garbage') })).toBe(0);
  });
});

describe('Category Stat Growth (#3)', () => {
  it('maps categories to the correct stats', () => {
    expect(categoryToStat['Combat']).toBe('statStrength');
    expect(categoryToStat['Intel']).toBe('statIntelligence');
    expect(categoryToStat['Chores']).toBe('statAgility');
    expect(categoryToStat['Social']).toBe('statLuck');
  });

  it('scales growth by rank', () => {
    expect(calculateStatGrowth('Combat', 'E')).toBe(1);
    expect(calculateStatGrowth('Combat', 'C')).toBe(2);
    expect(calculateStatGrowth('Combat', 'S')).toBe(5);
  });

  it('returns 0 for unknown categories', () => {
    expect(calculateStatGrowth('MysteryCategory', 'A')).toBe(0);
  });
});

describe('Adaptive Rank Suggestion (#2)', () => {
  it('suggests easy quests for low energy', () => {
    const s = suggestRankForEnergy(1);
    expect(s.minRank).toBe('E');
    expect(s.maxRank).toBe('D');
  });

  it('suggests stretch quests for high energy', () => {
    const s = suggestRankForEnergy(5);
    expect(s.minRank).toBe('B');
    expect(s.maxRank).toBe('S');
  });

  it('always returns a valid rank band', () => {
    const order = ['E', 'D', 'C', 'B', 'A', 'S'];
    for (let energy = 1; energy <= 5; energy++) {
      const s = suggestRankForEnergy(energy);
      expect(order.indexOf(s.minRank)).toBeLessThanOrEqual(order.indexOf(s.maxRank));
    }
  });
});

describe('Flavor Text (#25)', () => {
  it('is deterministic for the same inputs', () => {
    const a = generateFlavorText('Combat', 'B', 'Clear the dungeon');
    const b = generateFlavorText('Combat', 'B', 'Clear the dungeon');
    expect(a).toBe(b);
  });

  it('varies across different quests', () => {
    const texts = new Set(
      ['Quest one', 'Quest two', 'Quest three', 'Quest four', 'Quest five', 'Quest six', 'Quest seven', 'Quest eight'].map(
        t => generateFlavorText('Combat', 'B', t)
      )
    );
    expect(texts.size).toBeGreaterThan(1);
  });

  it('includes the quest rank', () => {
    expect(generateFlavorText('Intel', 'A', 'Study session')).toContain('Rank A');
  });

  it('falls back to Wildcard openers for unknown categories', () => {
    const text = generateFlavorText('UnknownCategory', 'E', 'Odd task');
    expect(text).toContain('Rank E');
  });
});
