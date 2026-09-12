export const getRankEmoji = (rank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S'): string => {
  const emojis: Record<Exclude<typeof rank, never>, string> = {
    E: '🔴',
    D: '🟠',
    C: '🟡',
    B: '🟢',
    A: '🔵',
    S: '🟣',
  };
  return emojis[rank];
};

export const getCategoryEmoji = (category: 'Combat' | 'Intel' | 'Craft' | 'Survival' | 'Social' | 'Wildcard'): string => {
  const emojis: Record<Exclude<typeof category, never>, string> = {
    Combat: '⚔️',
    Intel: '🧠',
    Craft: '🔨',
    Survival: '🛡️',
    Social: '🗣️',
    Wildcard: '🎲',
  };
  return emojis[category];
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getRankColor = (rank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S'): string => {
  const colors: Record<Exclude<typeof rank, never>, string> = {
    E: '🔴',
    D: '🟠',
    C: '🟡',
    B: '🟢',
    A: '🔵',
    S: '🟣',
  };
  return colors[rank];
};

export const getCategoryIcon = (category: 'Combat' | 'Intel' | 'Craft' | 'Survival' | 'Social' | 'Wildcard'): string => {
  const icons: Record<Exclude<typeof category, never>, string> = {
    Combat: '⚔️',
    Intel: '🧠',
    Craft: '🔨',
    Survival: '🛡️',
    Social: '🗣️',
    Wildcard: '🎲',
  };
  return icons[category];
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
