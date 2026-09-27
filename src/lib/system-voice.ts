// Original system voice and lore for Solo Quest
// This provides the game's narrative identity independent of Solo Leveling

export const SYSTEM_VOICE = {
  welcome: "Welcome, Hunter. Your journey begins now.",
  levelUp: "You have grown stronger. The path ahead reveals itself.",
  questComplete: "Another challenge overcome. Your resolve is unmatched.",
  dungeonClear: "The daily dungeon yields to your determination.",
  raidComplete: "Victory echoes through the halls. Your guild grows stronger.",
  milestone: "A significant achievement. Your legend grows.",
  failure: "Even the mightiest stumble. Rise again, stronger.",
  systemReady: "System operational. Ready for your commands.",
  
  // Flavor text for different ranks
  rankMessages: {
    E: "Every journey begins with a single step.",
    D: "Determination fuels your progress.",
    C: "Consistency builds character.",
    B: "Becoming a force to be reckoned with.",
    A: "Approaching the pinnacle of achievement.",
    S: "Supreme excellence. You are legendary.",
  },
  
  // Encouragement messages
  encouragement: [
    "Your potential is limitless.",
    "Every challenge is an opportunity.",
    "Stay focused, stay determined.",
    "Progress, not perfection.",
    "Your discipline is your greatest weapon.",
  ],
  
  // System notifications
  notifications: {
    dailyReset: "The daily cycle resets. New challenges await.",
    weeklyReset: "A new week begins. Time for fresh victories.",
    eventStart: "A special event has begun. Participate for rewards.",
    eventEnd: "The event concludes. Rewards will be distributed.",
  },
};

export const getRandomEncouragement = (): string => {
  const messages = SYSTEM_VOICE.encouragement;
  return messages[Math.floor(Math.random() * messages.length)];
};

export const getRankMessage = (rank: string): string => {
  return SYSTEM_VOICE.rankMessages[rank as keyof typeof SYSTEM_VOICE.rankMessages] || SYSTEM_VOICE.rankMessages.E;
};

export const getSystemMessage = (type: keyof typeof SYSTEM_VOICE): string => {
  if (typeof SYSTEM_VOICE[type] === 'string') {
    return SYSTEM_VOICE[type] as string;
  }
  return SYSTEM_VOICE.welcome;
};