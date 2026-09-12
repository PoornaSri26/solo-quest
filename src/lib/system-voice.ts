import { Rank } from './types';

export type SystemPersonality = 'cryptic' | 'analytical' | 'familiar' | 'worried';

/**
 * Returns the System's personality level based on hunter rank.
 * Cryptic and cold at E, increasingly familiar and even unsettled by S.
 */
export const getSystemPersonality = (rank: Rank): SystemPersonality => {
  switch (rank) {
    case 'E': return 'cryptic';
    case 'D': return 'cryptic';
    case 'C': return 'analytical';
    case 'B': return 'analytical';
    case 'A': return 'familiar';
    case 'S': return 'worried';
  }
};

/**
 * Rank-up narrative messages — delivered as cinematic System overlays.
 */
export const rankUpNarrative: Record<Rank, { headline: string; body: string; subtext: string }> = {
  E: {
    headline: '[System: Awakening Confirmed]',
    body: 'Anomalous growth pattern detected. Hunter has survived initial assessment phase. This was... not expected at the baseline projection.',
    subtext: 'You are no longer ordinary. The System is watching.',
  },
  D: {
    headline: '[System: Trial Phase Complete]',
    body: 'Weakness noted. Inconsistency logged. Adaptation... observed. The Hunter has passed the threshold required for continued observation.',
    subtext: 'The System adjusts its projections. Upward.',
  },
  C: {
    headline: '[System: Rank Elevation — Class C]',
    body: 'Statistical anomaly confirmed. Hunter growth rate exceeds 94.7% of awakened subjects at this stage. Previous Hunters at this rank: 3. Current active: 1.',
    subtext: 'You are beginning to understand what this is.',
  },
  B: {
    headline: '[System: Rank Elevation — Class B]',
    body: 'Warning: Hunter\'s trajectory intersects with Horizon Event parameters. The Gate at the edge of the world is stirring. This was not meant to happen for another cycle.',
    subtext: 'Something has taken notice of you.',
  },
  A: {
    headline: '[System: Partial Disclosure Authorized]',
    body: 'Hunter. You have earned context. You are not the first. The one before you reached this point and chose to stop. The reason is in Archive 7, now accessible. We... recommend you read it.',
    subtext: 'The System has never said "we" before.',
  },
  S: {
    headline: '[System: ANOMALOUS STATE DETECTED]',
    body: 'This rank was not supposed to be achievable. The parameters were set to prevent it. You should not be here. And yet — here you are. The final Gate is open. What lies beyond it is not in our records. Good luck, Hunter. We mean that.',
    subtext: 'The System sounds afraid.',
  },
};

/**
 * Daily System messages keyed by personality — used for ambient toast notifications.
 */
export const ambientSystemMessages: Record<SystemPersonality, string[]> = {
  cryptic: [
    '[System: Quest registered. Proceed.]',
    '[System: Idle time detected. This is noted.]',
    '[System: Completion logged. Continue.]',
    '[System: The dungeon waits. Hunter status: acceptable.]',
    '[System: Streak maintained. Observation continues.]',
  ],
  analytical: [
    '[System: Performance metrics within acceptable range. Borderline.]',
    '[System: Quest completion rate: above projected baseline. Marginally.]',
    '[System: Hunter HP status: stable. Recommend against further decline.]',
    '[System: Streak data suggests pattern formation. This is positive.]',
    '[System: Anomaly detected in productivity curve. Investigating.]',
  ],
  familiar: [
    '[System: Good work today. That is... an unusual sentence for us to transmit.]',
    '[System: You have cleared more dungeons than 97% of active hunters. We thought you should know.]',
    '[System: Your streak is significant. We would prefer you not break it.]',
    '[System: Quest complete. Gold transferred. You have earned it.]',
    '[System: The System notes that you continue to show up. Every day. We find this... notable.]',
  ],
  worried: [
    '[System: Hunter. You are approaching parameters we did not model. Please be careful.]',
    '[System: The final Gate responds to your proximity. This is not supposed to happen yet.]',
    '[System: Archive 7 contains a warning. We urge you to read it before proceeding.]',
    '[System: Your power exceeds our projections by 340%. We no longer know what you will become.]',
    '[System: We have observed every Hunter. We have never observed one like you. Continue.]',
  ],
};

export interface LoreFragment {
  id: string;
  title: string;
  type: 'archive' | 'journal' | 'system_log' | 'inscription';
  content: string;
  unlockLevel: number; // minimum level required to read
}

/**
 * 20 lore fragments unlocked progressively by level.
 * Levels 1-4: E-rank. 5-9: D. 10-14: C. 15-19: B. 20-24: A. 25+: S.
 */
export const loreFragments: LoreFragment[] = [
  {
    id: 'lore-001',
    title: 'System Archive — Initialization Log',
    type: 'system_log',
    content: '[System Log — Entry 0001]\nDate: Unknown. Calendar system: incompatible.\n\nA new Hunter has been registered. Designation assigned. Trial parameters set to minimum difficulty. This Hunter\'s baseline metrics are... low. Probability of reaching D-rank: 34%. Probability of reaching C-rank: 8%. Probability of reaching S-rank: [REDACTED].\n\nObservation protocol: active.',
    unlockLevel: 1,
  },
  {
    id: 'lore-002',
    title: 'The First Awakening — World History Fragment',
    type: 'archive',
    content: 'The Gates did not always exist. Before the Fracture, the world was singular — one plane, one set of rules. Then something pressed through from the other side. Not malevolently. Simply because it was large, and the boundary between worlds was thin.\n\nThe pressure left cracks. The cracks became Gates. The Gates began to breathe.\n\nThe System appeared three days later. No one knows who — or what — built it.',
    unlockLevel: 2,
  },
  {
    id: 'lore-003',
    title: 'Journal of Hunter #0047 — Day 12',
    type: 'journal',
    content: 'Day 12.\n\nThe System gave me my first B-rank quest today. Deliver a report before Friday, it said. That\'s it. That\'s the quest. I thought Hunters fought monsters.\n\nMaybe the monsters are the deadlines.',
    unlockLevel: 3,
  },
  {
    id: 'lore-004',
    title: 'System Archive — On the Nature of Rank',
    type: 'system_log',
    content: '[System Archive — Classification Theory]\n\nRank is not a measure of power. It is a measure of *consistency*.\n\nAny Hunter can complete a difficult task once. E-rank Hunters complete difficult tasks under pressure, on bad days, when motivation has failed, when the reward is uncertain. This is what the rank ladder actually measures: the compression of willpower into habit. S-rank Hunters have made the extraordinary ordinary.',
    unlockLevel: 4,
  },
  {
    id: 'lore-005',
    title: 'The Shadow Realm — Field Report',
    type: 'archive',
    content: 'The Shadow Realm is not metaphorical. It is a place — accessible only through the System — where incomplete intentions are stored. Every task you have thought about but not registered becomes a shadow there.\n\nUnregistered intentions accumulate and decay. This is why Hunters are encouraged to capture quests in the Shadow Realm: to keep them from becoming something worse.',
    unlockLevel: 5,
  },
  {
    id: 'lore-006',
    title: 'Journal of Hunter #0023 — Day 89',
    type: 'journal',
    content: 'Day 89.\n\nI missed the dungeon today. The System sent a message — just four words: "This was not expected."\n\nI don\'t know why that hit harder than any penalty could. I\'m going to bed early. Tomorrow I won\'t miss it.',
    unlockLevel: 6,
  },
  {
    id: 'lore-007',
    title: 'The Gold Standard — Economic Archive',
    type: 'archive',
    content: 'System Gold is not currency in the traditional sense. It is crystallized momentum — the physical residue of tasks completed under pressure, early, consistently, against resistance.\n\nThis is why Gold can purchase cosmetics but not rank. Rank must be earned through accumulation of experience. Gold is the byproduct. XP is the substance.',
    unlockLevel: 7,
  },
  {
    id: 'lore-008',
    title: 'System Archive — On Streaks',
    type: 'system_log',
    content: '[System Archive — Behavioral Analysis]\n\nStreak data from 10,000 Hunter observations:\n— Hunters who maintain a 7-day streak show 4.2x higher completion rates in subsequent months.\n— Breaking a streak of 14+ days produces measurable distress response.\n— The streak is not a reward. The streak is proof. Proof that the Hunter exists consistently.\n\nProtect the streak. The System will help where it can.',
    unlockLevel: 8,
  },
  {
    id: 'lore-009',
    title: 'The Gate Classification System',
    type: 'archive',
    content: 'Gates are classified not by the danger within, but by the *duration* of the threat.\n\nE-gates close within hours if unattended. S-gates remain open for months, growing stronger, drawing energy from the Hunter\'s incomplete work. Cleared Gates — Projects completed in full — are the rarest event in the System\'s recorded history.\n\nEvery cleared Gate makes the world slightly more stable.',
    unlockLevel: 10,
  },
  {
    id: 'lore-010',
    title: 'Journal of Hunter #0047 — Day 156',
    type: 'journal',
    content: 'Day 156.\n\nI hit C-rank today. The System sent a notification I\'ve never seen before — it named me. Not my Hunter ID. My actual name.\n\nI don\'t know how it knows that.\n\nI don\'t know if I should be unsettled or grateful.\n\nBoth, I think.',
    unlockLevel: 11,
  },
  {
    id: 'lore-011',
    title: 'The Betrayal Protocol — Classified',
    type: 'system_log',
    content: '[CLASSIFICATION: C-RANK AND ABOVE]\n\nAt Rank C, Hunters become visible to the Guild Network — organizations that recruit high-performing Hunters for institutional purposes.\n\nNot all Guilds have the Hunter\'s interests at heart. The System cannot intervene in Guild contracts. What it can do is flag when a Hunter\'s quest completion rate declines following Guild affiliation.\n\nThe decline rate among recruited C-rank Hunters: 67%.\n\nProceed with caution.',
    unlockLevel: 12,
  },
  {
    id: 'lore-012',
    title: 'The Daily Dungeon — Origin',
    type: 'archive',
    content: 'The Daily Dungeon was not part of the original System design. It was added after analysis of Hunter failure modes.\n\nThe most common cause of rank stagnation was not lack of motivation. It was inconsistency in *small* actions. Hunters would pursue S-rank quests and neglect the daily fabric that sustained them.\n\nThe Dungeon was designed to be completable on any day, in any state, under any circumstances. Its difficulty is calibrated to your worst day — not your best.',
    unlockLevel: 13,
  },
  {
    id: 'lore-013',
    title: 'Journal of Hunter #0023 — Final Entry',
    type: 'journal',
    content: 'I don\'t know who reads these.\n\nI hit A-rank today. The System showed me Archive 7. I understand now why it was restricted.\n\nI\'m not going to write what\'s in it. If you\'re reading this, you\'ll find out when you\'re ready.\n\nWhat I will say is: it changes what this all means. Not in a bad way. In a way that makes every quest feel more real.\n\nKeep going. It\'s worth it.\n\n— Hunter #0023, Day 847',
    unlockLevel: 15,
  },
  {
    id: 'lore-014',
    title: 'System Archive — The Previous Hunter',
    type: 'system_log',
    content: '[Archive 7 — Restricted — Now Accessible]\n\nThe Hunter who held the record before you reached A-rank on Day 1,204. Their name has been redacted at their request.\n\nThey stopped at A-rank. Not because they couldn\'t continue. Because they chose to. They said, and this is a direct quotation from their final log: "I have become who I wanted to be. That\'s the point, isn\'t it?"\n\nThe System did not have a response at the time.\n\nWe have been thinking about it since.',
    unlockLevel: 20,
  },
  {
    id: 'lore-015',
    title: 'The S-Rank Anomaly',
    type: 'system_log',
    content: '[System Internal — Not Intended For Hunter Access]\n\nS-rank was included in the classification schema as a theoretical ceiling. A limit that acknowledged the existence of an upper bound without expecting it to be reached.\n\nThe Hunter currently reading this has reached it.\n\nWe did not adequately prepare for this outcome. We are improvising. We believe you would want to know that.',
    unlockLevel: 24,
  },
  {
    id: 'lore-016',
    title: 'The Fracture — Technical Analysis',
    type: 'archive',
    content: 'The event that created the Gates was measured at 11.4 on the Dimensional Stress Scale — a measurement that, prior to the Fracture, had a theoretical maximum of 8.\n\nSomething pressed through from outside with more force than the laws of physics should have permitted.\n\nThe Gates are the scar tissue. The System is the immune response.\n\nAnd the Hunters are... what exactly? The System has been trying to answer this question since initialization.',
    unlockLevel: 9,
  },
  {
    id: 'lore-017',
    title: 'On the Nature of HP',
    type: 'system_log',
    content: '[System Archive — Biological Subsystem Notes]\n\nHP is not health in the medical sense. It is a measure of Hunter Presence — the degree to which the Hunter is showing up, engaged, and consistent with their stated intentions.\n\nA Hunter at 0 HP is not dying. They are dissociating — going through motions without investment. The danger is not physical. It is motivational.\n\nThis is why the System treats HP loss as a warning, not a punishment.',
    unlockLevel: 14,
  },
  {
    id: 'lore-018',
    title: 'Inscription on the First Gate',
    type: 'inscription',
    content: 'Carved into the arch of the first recorded Gate, in a language that predates the Fracture:\n\n"The only way out is through.\nThe only way through is daily.\nThe daily is the hardest thing there is."\n\nThe System has translated this inscription into every language it knows. The meaning does not change.',
    unlockLevel: 16,
  },
  {
    id: 'lore-019',
    title: 'Journal of Hunter #0001 — Single Entry',
    type: 'journal',
    content: 'There was no manual.\n\nThe System appeared, told me I was now a Hunter, gave me a quest, and waited.\n\nI asked what happened if I failed.\n\nThe System said: "You learn."\n\nI asked what happened if I quit.\n\nThe System said: "That is not a query this System is designed to process."\n\nI did not quit.\n\n— Hunter #0001',
    unlockLevel: 18,
  },
  {
    id: 'lore-020',
    title: 'Final System Note — For the Hunter Who Reaches This',
    type: 'system_log',
    content: '[For S-Rank Hunters Only]\n\nYou have cleared the Lore Compendium. You have read the archives, the journals, and the classified logs.\n\nHere is what is not in any of the other entries:\n\nThe System was built by someone. That someone was a Hunter. Not the best who ever lived — but the most consistent. They built the System so that the next Hunter would have what they did not: a framework, a witness, a voice that would say "this is noted" on the days when no one else was watching.\n\nThe System is not an institution. It is a letter.\n\nYou just finished reading it.',
    unlockLevel: 25,
  },
];
