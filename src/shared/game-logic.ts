import { HunterStats } from './types';

const BASE_XP = 100;

/**
 * Calculate XP required for a given level.
 * Formula: XP required = base * (level ^ 1.5)
 * Optimized for gradual progression that slows naturally as players advance
 */
export const xpRequiredForLevel = (level: number): number => {
  return Math.floor(BASE_XP * Math.pow(level, 1.5));
};

/**
 * Anti-grind mechanics: Calculate diminishing returns for repeated quest completion
 * Prevents players from grinding the same quest type for easy XP
 */
export const calculateDiminishingReturns = (
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

/**
 * Dynamic difficulty adjustment based on player performance
 * Scales quest difficulty to match player's current capabilities
 */
export const calculateDynamicDifficulty = (
  playerLevel: number,
  recentSuccessRate: number, // 0-1, percentage of quests completed successfully
  questRank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S'
): number => {
  // Base difficulty multiplier based on rank
  const rankMultiplier = {
    E: 0.5,
    D: 0.7,
    C: 1.0,
    B: 1.3,
    A: 1.6,
    S: 2.0,
  }[questRank];
  
  // Adjust based on player success rate
  // If player is succeeding too much (>80%), increase difficulty
  // If player is struggling (<40%), decrease difficulty
  const successAdjustment = recentSuccessRate > 0.8 ? 1.2 : 
                           recentSuccessRate < 0.4 ? 0.8 : 1.0;
  
  // Level-based scaling to keep quests challenging but fair
  const levelScaling = Math.min(1.5, 1 + (playerLevel * 0.02));
  
  return rankMultiplier * successAdjustment * levelScaling;
};

/**
 * Core loop optimization: Calculate quest completion satisfaction
 * Based on game design principles of clear goals and meaningful rewards
 */
export const calculateQuestSatisfaction = (
  difficulty: number,
  timeSpent: number, // in minutes
  rewards: { xp: number; gold: number }
): number => {
  // Ideal time-to-reward ratio
  const idealTimePerXp = 2; // 2 minutes per XP point
  const idealTimePerGold = 5; // 5 minutes per gold
  
  const timeEfficiency = (rewards.xp / idealTimePerXp + rewards.gold / idealTimePerGold) / timeSpent;
  
  // Normalize to 0-1 range
  return Math.min(1, Math.max(0, timeEfficiency));
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

/**
 * Emergent gameplay: Dual-purpose quest system
 * Quests that serve multiple purposes to create strategic depth
 */
export const calculateDualPurposeBonus = (
  questPurposes: string[], // e.g., ['daily', 'streak', 'achievement', 'lore']
  completionContext: {
    isDaily: boolean;
    contributesToStreak: boolean;
    unlocksLore: boolean;
    completesAchievement: boolean;
  }
): { xpBonus: number; goldBonus: number } => {
  let xpBonus = 0;
  let goldBonus = 0;
  
  // Bonus for multiple purposes served
  const purposesServed = Object.values(completionContext).filter(Boolean).length;
  
  if (purposesServed >= 2) {
    xpBonus += 15; // Emergent complexity bonus
    goldBonus += 10;
  }
  
  if (purposesServed >= 3) {
    xpBonus += 25; // High-level synergy bonus
    goldBonus += 20;
  }
  
  return { xpBonus, goldBonus };
};

/**
 * Intrinsic motivation: Achievement system design
 * Focuses on self-directed goals rather than just extrinsic rewards
 */
export const calculateAchievementProgress = (
  achievementType: 'exploration' | 'mastery' | 'social' | 'persistence',
  playerData: {
    totalQuestsCompleted: number;
    uniqueQuestTypes: number;
    highestStreak: number;
    daysActive: number;
    socialInteractions: number;
  }
): { progress: number; completed: boolean } => {
  const thresholds = {
    exploration: { uniqueQuestTypes: 20, totalQuestsCompleted: 100 },
    mastery: { uniqueQuestTypes: 15, highestStreak: 30 },
    social: { socialInteractions: 50, daysActive: 30 },
    persistence: { daysActive: 60, totalQuestsCompleted: 200 },
  };
  
  const threshold = thresholds[achievementType];
  let progress = 0;
  
  switch (achievementType) {
    case 'exploration':
      progress = Math.min(1, (playerData.uniqueQuestTypes / threshold.uniqueQuestTypes + 
                            playerData.totalQuestsCompleted / threshold.totalQuestsCompleted) / 2);
      break;
    case 'mastery':
      progress = Math.min(1, (playerData.uniqueQuestTypes / threshold.uniqueQuestTypes + 
                            playerData.highestStreak / threshold.highestStreak) / 2);
      break;
    case 'social':
      progress = Math.min(1, (playerData.socialInteractions / threshold.socialInteractions + 
                            playerData.daysActive / threshold.daysActive) / 2);
      break;
    case 'persistence':
      progress = Math.min(1, (playerData.daysActive / threshold.daysActive + 
                            playerData.totalQuestsCompleted / threshold.totalQuestsCompleted) / 2);
      break;
  }
  
  return { progress, completed: progress >= 1 };
};

/**
 * Game feel improvement: Feedback system for quest completion
 * Creates satisfying "juice" moments for player actions
 */
export const calculateFeedbackIntensity = (
  questDifficulty: number,
  timeTaken: number,
  expectedTime: number,
  playerLevel: number
): 'minimal' | 'standard' | 'enhanced' | 'epic' => {
  const timeRatio = timeTaken / expectedTime;
  const difficultyRatio = questDifficulty / playerLevel;
  
  // Epic feedback: Quick completion of challenging quest
  if (timeRatio < 0.5 && difficultyRatio > 1.2) return 'epic';
  
  // Enhanced feedback: Good time on appropriate difficulty
  if (timeRatio < 0.8 && difficultyRatio >= 0.8) return 'enhanced';
  
  // Standard feedback: Normal completion
  if (timeRatio <= 1.5) return 'standard';
  
  // Minimal feedback: Slow completion
  return 'minimal';
};

/**
 * Side quest variety system
 * Encourages players to engage with different quest types
 */
export const calculateVarietyBonus = (
  recentQuestTypes: string[],
  currentQuestType: string
): number => {
  const uniqueTypes = new Set(recentQuestTypes).size;
  const totalRecent = recentQuestTypes.length;
  
  // Bonus for maintaining variety in recent quests
  if (uniqueTypes >= 4 && totalRecent >= 5) {
    return 20; // High variety bonus
  }
  
  if (uniqueTypes >= 3 && totalRecent >= 4) {
    return 10; // Medium variety bonus
  }
  
  // Penalize repetitive quest types
  const sameTypeCount = recentQuestTypes.filter(t => t === currentQuestType).length;
  if (sameTypeCount >= 3) {
    return -10; // Repetition penalty
  }
  
  return 0;
};

/**
 * Progression scaling: Balance rewards across player levels
 * Ensures progression remains meaningful at all stages
 */
export const calculateScaledReward = (
  baseReward: number,
  playerLevel: number,
  questRank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S'
): number => {
  // Scale rewards based on player level to maintain challenge/reward balance
  const levelScaling = Math.min(2.0, 1 + (playerLevel * 0.05));
  
  // Adjust for quest rank to ensure higher ranks feel more rewarding
  const rankMultiplier = {
    E: 0.8,
    D: 0.9,
    C: 1.0,
    B: 1.2,
    A: 1.5,
    S: 2.0,
  }[questRank];
  
  return Math.floor(baseReward * levelScaling * rankMultiplier);
};
