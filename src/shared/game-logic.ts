import { HunterStats } from './types';

const BASE_XP = 100;

/**
 * Calculate XP required for a given level.
 * Formula: XP required = base * (level ^ 1.5)
 */
export const xpRequiredForLevel = (level: number): number => {
  return Math.floor(BASE_XP * Math.pow(level, 1.5));
};

/**
 * Given current XP, calculate level and XP to next level.
 */
export const calculateLevelAndProgress = (xp: number) => {
  let level = 1;
  while (xp >= xpRequiredForLevel(level + 1)) {
    level++;
  }
  const xpForCurrentLevel = xpRequiredForLevel(level);
  const xpForNextLevel = xpRequiredForLevel(level + 1);
  const xpInLevel = xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = xpNeeded === 0 ? 100 : (xpInLevel / xpNeeded) * 100;
  return {
    level,
    xpToNext: xpNeeded,
    progressPercent,
  };
};

/**
 * Determine rank based on level.
 */
export const getRankFromLevel = (level: number): 'E' | 'D' | 'C' | 'B' | 'A' | 'S' => {
  if (level <= 4) return 'E';
  if (level <= 9) return 'D';
  if (level <= 14) return 'C';
  if (level <= 19) return 'B';
  if (level <= 24) return 'A';
  return 'S';
};

/**
 * Max HP calculation: starts at 100, increases by 10 every 5 levels.
 */
export const calculateMaxHp = (level: number): number => {
  const increments = Math.floor((level - 1) / 5);
  return 100 + increments * 10;
};

/**
 * Base rewards per quest rank.
 */
export const baseXpByRank: Record<'E' | 'D' | 'C' | 'B' | 'A' | 'S', number> = {
  E: 10,
  D: 25,
  C: 50,
  B: 100,
  A: 200,
  S: 500,
};

export const baseGoldByRank: Record<'E' | 'D' | 'C' | 'B' | 'A' | 'S', number> = {
  E: 5,
  D: 10,
  C: 20,
  B: 40,
  A: 80,
  S: 200,
};

/**
 * Apply bonuses to XP and Gold.
 */
export const applyQuestBonuses = ({
  baseXp,
  baseGold,
  completedBeforeDeadline,
  streakToday,
  perfectDay,
  earlyBird,
}: {
  baseXp: number;
  baseGold: number;
  completedBeforeDeadline: boolean;
  streakToday: number; // current streak count
  perfectDay: boolean; // no missed quests today
  earlyBird: boolean; // first quest of the day
}) => {
  let xp = baseXp;
  let gold = baseGold;

  // Bonus XP: completed before deadline +20%
  if (completedBeforeDeadline) {
    xp = Math.floor(xp * 1.2);
  }

  // Streak bonus: 7-day streak flat +50 XP
  if (streakToday >= 7) {
    xp += 50;
  }

  // Perfect Day Bonus: +15 XP
  if (perfectDay) {
    xp += 15;
  }

  // Early Bird: +10 XP
  if (earlyBird) {
    xp += 10;
  }

  // Gold bonus: Perfect Day +25g
  if (perfectDay) {
    gold += 25;
  }

  return { xp, gold };
};

/**
 * HP changes based on events.
 */
export const hpChangeForEvent = (event: 'miss_deadline' | 'fail_dungeon' | 'idle_day' | 'complete_quest' | 'perfect_day'): number => {
  switch (event) {
    case 'miss_deadline':
      return -10;
    case 'fail_dungeon':
      return -15;
    case 'idle_day':
      return -5; // per day after 3+ days idle
    case 'complete_quest':
      return +2;
    case 'perfect_day':
      return +10;
    default:
      return 0;
  }
};
