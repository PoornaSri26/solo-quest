export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type HunterClass = 'NONE' | 'WARRIOR' | 'MAGE' | 'ASSASSIN';
export type QuestCategory = 'Combat' | 'Intel' | 'Craft' | 'Survival' | 'Social' | 'Wildcard';
export type QuestStatus = 'SHADOW' | 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';
export type GateStatus = 'active' | 'cleared' | 'collapsed' | 'ACTIVE' | 'CLEARED' | 'COLLAPSED';
export type NotificationType = 'info' | 'warning' | 'reward' | 'penalty' | 'INFO' | 'WARNING' | 'REWARD' | 'PENALTY';
export type ShopCategory = 'theme' | 'frame' | 'title' | 'icon_set' | 'THEME' | 'FRAME' | 'TITLE' | 'ICON_SET';

export interface Hunter {
  id: string;
  hunterId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface HunterStats {
  userId: string;
  level: number;
  exp: number;
  expToNext: number;
  xpToNext: number; // actual remaining XP needed
  progressPercent: number; // percentage progress within current level
  rank: Rank;
  hp: number;
  hpMax: number;
  gold: number;
  streak: number;
  longestStreak: number;
  streakWards: number;
  streakWagerActive: boolean;
  streakWagerGoal: number;
  streakWagerStake: number;
  streakWagerStart?: string | null;
  statStrength: number;
  statAgility: number;
  statIntelligence: number;
  statEndurance: number;
  statLuck: number;
  lastActiveDate: string;
  hunterClass: HunterClass;
  loreUnlocked: string[];
}

export interface Quest {
  id: string;
  title: string;
  rank: Rank;
  category: QuestCategory;
  status: QuestStatus;
  deadline?: string | null;
  notes?: string | null;
  gateId?: string | null;
  isBossQuest: boolean;
  expReward: number;
  goldReward: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks?: QuestSubtask[];
  gate?: Gate | null;
}

export interface QuestSubtask {
  id: string;
  title: string;
  completed: boolean;
  position: number;
}

export interface Gate {
  id: string;
  name: string;
  rank: Rank;
  deadline?: string | null;
  status: GateStatus;
  createdAt: string;
  progress?: number;
  quests?: Quest[];
}

export interface DungeonTask {
  id: string;
  title: string;
  rank: Rank;
  position: number;
  completed: boolean;
}

export interface DailyDungeon {
  id: string;
  name: string;
  shift?: 'morning' | 'afternoon' | 'night' | 'all_day' | 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'ALL_DAY';
  active: boolean;
  tasks?: DungeonTask[];
}

export interface DungeonLog {
  id: string;
  date: string;
  completedCount: number;
  totalCount: number;
  cleared: boolean;
}

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}

export interface ShopItem {
  id: string;
  name: string;
  category: ShopCategory;
  costGold: number;
  description?: string;
}

export interface UserInventory {
  id: string;
  itemId: string;
  equipped: boolean;
  acquiredAt: string;
}

export interface InventoryItem extends UserInventory {
  item: ShopItem;
}

// Game design improvements types
export interface QuestCompletionContext {
  isDaily: boolean;
  contributesToStreak: boolean;
  unlocksLore: boolean;
  completesAchievement: boolean;
}

export interface RecentQuestCompletion {
  type: string;
  timestamp: number;
}

export interface AchievementData {
  exploration: number;
  mastery: number;
  social: number;
  persistence: number;
}

export interface PlayerProgressMetrics {
  totalQuestsCompleted: number;
  uniqueQuestTypes: number;
  highestStreak: number;
  daysActive: number;
  socialInteractions: number;
  recentSuccessRate: number;
  recentCompletions: RecentQuestCompletion[];
}

export interface FeedbackIntensity {
  level: 'minimal' | 'standard' | 'enhanced' | 'epic';
  animationDuration: number;
  soundEffect: string;
  particleIntensity: number;
}

// Phase 2 & 3 types
export interface Milestone {
  id: string;
  name: string;
  description: string;
  requirement: string;
  xpReward: number;
  goldReward: number;
  mementoId?: string | null;
  progress?: MilestoneProgress[];
}

export interface MilestoneProgress {
  id: string;
  userId: string;
  milestoneId: string;
  completed: boolean;
  completedAt?: string | null;
  progress: number;
  milestone?: Milestone;
}

export interface MasteryChallenge {
  id: string;
  name: string;
  description: string;
  requirement: string;
  xpReward: number;
  goldReward: number;
  difficulty: string;
  progress?: MasteryChallengeProgress[];
}

export interface MasteryChallengeProgress {
  id: string;
  userId: string;
  challengeId: string;
  completed: boolean;
  completedAt?: string | null;
  attempts: number;
  bestScore?: number | null;
  challenge?: MasteryChallenge;
}

export interface Memento {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  category: string;
  milestones?: Milestone[];
  userMementos?: UserMemento[];
}

export interface UserMemento {
  id: string;
  userId: string;
  mementoId: string;
  unlockedAt: string;
  memento?: Memento;
}

export interface QuestDecision {
  id: string;
  userId: string;
  questId: string;
  decisionType: 'SCARCITY' | 'TRADEOFF' | 'PREDICTION';
  choice: string;
  timestamp: string;
}

export interface ResourceUsage {
  id: string;
  userId: string;
  resourceType: 'GOLD' | 'HP' | 'TIME';
  amount: number;
  purpose: 'SHOP_PURCHASE' | 'QUEST_BOOST' | 'TIME_EXTENSION' | 'DIFFICULTY_MODIFIER';
  timestamp: string;
}

export interface KnowledgeProgress {
  id: string;
  userId: string;
  questPatternsLearned: number;
  optimalRoutesDiscovered: number;
  shortcutsUnlocked: number;
  efficiencyRating: number;
  lastUpdated: string;
}

export interface SocialStats {
  id: string;
  userId: string;
  friendsAdded: number;
  questsShared: number;
  achievementsShared: number;
  leaderboardRank: number;
  socialScore: number;
  lastUpdated: string;
}

export type CompletionQuality = 'PERFECT' | 'GOOD' | 'POOR';
export type DecisionType = 'SCARCITY' | 'TRADEOFF' | 'PREDICTION';
export type ResourceType = 'GOLD' | 'HP' | 'TIME';
export type ResourcePurpose = 'SHOP_PURCHASE' | 'QUEST_BOOST' | 'TIME_EXTENSION' | 'DIFFICULTY_MODIFIER';
