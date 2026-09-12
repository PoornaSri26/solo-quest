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
