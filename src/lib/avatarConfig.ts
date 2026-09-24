/**
 * Avatar configuration contract — shared types, defaults, and parsing.
 * Kept free of any three.js imports so the customizer UI can stay in a tiny
 * chunk while the 3D renderer (HunterAvatar3D) is lazy-loaded separately (#95).
 */

export type AvatarConfig = {
  bodyType: 'slim' | 'regular' | 'broad';
  skinTone: string; // hex
  armorColor: string; // hex
  accentColor: string; // hex
  hairStyle: 'short' | 'swept' | 'topknot' | 'hood';
  hairColor: string; // hex
  classSigil: 'sword' | 'orb' | 'tome' | 'dagger' | 'bow' | 'none';
  rank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
};

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  bodyType: 'regular',
  skinTone: '#c8a27e',
  armorColor: '#4c4f69',
  accentColor: '#7c6ef0',
  hairStyle: 'short',
  hairColor: '#2a2f3a',
  classSigil: 'none',
  rank: 'E',
};

export const DEFAULT_SKIN_TONES = [
  '#f2d3b1', '#d9a97e', '#c8a27e', '#a8734b', '#7d4f2f', '#5b3a22',
];

export const DEFAULT_ARMOR_COLORS = [
  '#4c4f69', '#3a3f58', '#5b3a56', '#28536b', '#4a5d3a', '#6b3030',
];

export const DEFAULT_ACCENT_COLORS = [
  '#7c6ef0', '#2dd4bf', '#f0c86a', '#e46a8a', '#60a5fa', '#9ca3af',
];

export const DEFAULT_HAIR_COLORS = [
  '#2a2f3a', '#4a3728', '#8a5a2b', '#b08d57', '#708090', '#5b3a56', '#f0f0f0',
];

/** Rank aura tiers (#37): intensity + palette shift as the hunter advances E -> S. */
export const RANK_AURA: Record<AvatarConfig['rank'], { intensity: number; color: string }> = {
  E: { intensity: 0, color: '#9ca3af' },
  D: { intensity: 0.15, color: '#8fb573' },
  C: { intensity: 0.3, color: '#2dd4bf' },
  B: { intensity: 0.5, color: '#60a5fa' },
  A: { intensity: 0.75, color: '#a594f5' },
  S: { intensity: 1.0, color: '#f0c86a' },
};

/**
 * Curated preset loadouts (#27/#29): class-themed starting looks users can
 * apply in one click, then tweak. Rank is intentionally excluded — it is
 * earned, never styled directly.
 */
export const AVATAR_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  config: Omit<Partial<AvatarConfig>, 'rank'>;
}> = [
  {
    id: 'vanguard',
    name: 'Vanguard',
    description: 'Frontline steel. Classic warrior silhouette.',
    config: {
      bodyType: 'broad',
      skinTone: '#c8a27e',
      armorColor: '#4c4f69',
      accentColor: '#7c6ef0',
      hairStyle: 'swept',
      hairColor: '#2a2f3a',
      classSigil: 'sword',
    },
  },
  {
    id: 'arcanist',
    name: 'Arcanist',
    description: 'Mana-first. Floating core, deep violet plates.',
    config: {
      bodyType: 'slim',
      skinTone: '#d9a97e',
      armorColor: '#5b3a56',
      accentColor: '#2dd4bf',
      hairStyle: 'swept',
      hairColor: '#708090',
      classSigil: 'orb',
    },
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Knowledge is a blade. Tome in hand.',
    config: {
      bodyType: 'regular',
      skinTone: '#a8734b',
      armorColor: '#28536b',
      accentColor: '#60a5fa',
      hairStyle: 'short',
      hairColor: '#4a3728',
      classSigil: 'tome',
    },
  },
  {
    id: 'shadow',
    name: 'Shadow',
    description: 'Strike first, strike last. Hooded dagger work.',
    config: {
      bodyType: 'slim',
      skinTone: '#7d4f2f',
      armorColor: '#3a3f58',
      accentColor: '#e46a8a',
      hairStyle: 'hood',
      hairColor: '#2a2f3a',
      classSigil: 'dagger',
    },
  },
  {
    id: 'warden',
    name: 'Warden',
    description: 'Versatile ranger. Balanced and battle-worn.',
    config: {
      bodyType: 'regular',
      skinTone: '#f2d3b1',
      armorColor: '#4a5d3a',
      accentColor: '#f0c86a',
      hairStyle: 'topknot',
      hairColor: '#8a5a2b',
      classSigil: 'bow',
    },
  },
];

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * Randomize (#26): a fresh look in one click. Rank is never randomized —
 * it reflects actual progression.
 */
export const randomizeAvatarConfig = (): Omit<Partial<AvatarConfig>, 'rank'> => ({
  bodyType: pick(['slim', 'regular', 'broad'] as const),
  skinTone: pick(DEFAULT_SKIN_TONES),
  armorColor: pick(DEFAULT_ARMOR_COLORS),
  accentColor: pick(DEFAULT_ACCENT_COLORS),
  hairStyle: pick(['short', 'swept', 'topknot', 'hood'] as const),
  hairColor: pick(DEFAULT_HAIR_COLORS),
  classSigil: pick(['sword', 'orb', 'tome', 'dagger', 'bow', 'none'] as const),
});

const HAIR_STYLES: AvatarConfig['hairStyle'][] = ['short', 'swept', 'topknot', 'hood'];
const CLASS_SIGILS: AvatarConfig['classSigil'][] = ['sword', 'orb', 'tome', 'dagger', 'bow', 'none'];

/** Parse a stored avatar config JSON defensively (#293 hardening). */
export const parseAvatarConfig = (raw: unknown): Partial<AvatarConfig> => {
  if (!raw || typeof raw !== 'object') return {};
  const c = raw as Record<string, unknown>;
  const hex = (v: unknown, fallback: string): string =>
    typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
  return {
    bodyType:
      c.bodyType === 'slim' || c.bodyType === 'broad' || c.bodyType === 'regular'
        ? c.bodyType
        : undefined,
    skinTone: hex(c.skinTone, DEFAULT_AVATAR_CONFIG.skinTone),
    armorColor: hex(c.armorColor, DEFAULT_AVATAR_CONFIG.armorColor),
    accentColor: hex(c.accentColor, DEFAULT_AVATAR_CONFIG.accentColor),
    hairStyle: HAIR_STYLES.includes(c.hairStyle as AvatarConfig['hairStyle'])
      ? (c.hairStyle as AvatarConfig['hairStyle'])
      : undefined,
    hairColor: hex(c.hairColor, DEFAULT_AVATAR_CONFIG.hairColor),
    classSigil: CLASS_SIGILS.includes(c.classSigil as AvatarConfig['classSigil'])
      ? (c.classSigil as AvatarConfig['classSigil'])
      : undefined,
  };
};
