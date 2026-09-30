// The story engine of Solo Quest.
//
// The lore (system-voice.ts) describes a world: Gates, the Fracture, Hunters,
// and a System that watches. This module turns that world into a playable
// narrative — chapters that unlock from the player's *real* HunterStats.
// The story advances because you show up, not because a cutscene plays.
//
// Chapter structure: each chapter is a beat in the meta-plot borrowed from
// the lore fragments (the Fracture, the System's origin, the previous
// Hunter, the Horizon Event). Requirements are order-gated: a chapter only
// unlocks when every previous chapter is cleared AND its own requirement
// holds. Progress is a fraction (0..1) so the HUD can show how close the
// next chapter is.
//
// State persistence: localStorage under 'solo-quest-story-v1'. If the key
// is absent, the story syncs to current stats on first read (a returning
// player does not re-read chapters they already out-leveled).

import type { HunterStats, Rank } from '../shared/types';

export interface StoryChapter {
  id: string;
  index: number;
  title: string;
  /** Typed [System: ...] transmission shown when the chapter clears. */
  transmission: string;
  /** One-paragraph narrative beat, lore-accurate. */
  narrative: string;
  /** Human-readable requirement shown in the HUD. */
  requirement: string;
  /** Evaluated against real HunterStats. */
  isComplete: (s: HunterStats) => boolean;
  /** 0..1 progress toward the requirement. */
  progress: (s: HunterStats) => number;
}

const RANK_ORDER: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

function rankAtLeast(current: Rank, target: Rank): boolean {
  return RANK_ORDER.indexOf(current) >= RANK_ORDER.indexOf(target);
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 'ch-01-awakening',
    index: 1,
    title: 'I. Awakening',
    transmission: 'Hunter registered. Trial parameters set to minimum difficulty.',
    narrative:
      'A new Hunter has been registered. Designation assigned. Baseline metrics are... low. The System begins its observation.',
    requirement: 'Reach Level 2',
    isComplete: (s) => s.level >= 2,
    progress: (s) => Math.min(1, (s.level - 1) / 1),
  },
  {
    id: 'ch-02-first-gate',
    index: 2,
    title: 'II. The First Gate',
    transmission: 'Gate presence detected. The boundary is thinner than projected.',
    narrative:
      'The first Gate opens where you least expect it — not in the world, but in the shape of your day. Clearing it is a choice. The System notes the choice.',
    requirement: 'Hold a 3-day streak',
    isComplete: (s) => s.streak >= 3,
    progress: (s) => Math.min(1, s.streak / 3),
  },
  {
    id: 'ch-03-fracture',
    index: 3,
    title: 'III. The Fracture',
    transmission: 'Archive fragment recovered. Prior to the Fracture, the world was singular.',
    narrative:
      'Something pressed through from the other side. Not malevolently — simply because it was large, and the boundary was thin. The cracks became Gates. The Gates began to breathe. You learn what you are standing inside of.',
    requirement: 'Reach Level 5 (D-rank threshold)',
    isComplete: (s) => s.level >= 5,
    progress: (s) => Math.min(1, (s.level - 2) / 3),
  },
  {
    id: 'ch-04-consistency',
    index: 4,
    title: 'IV. On the Nature of Rank',
    transmission: 'Rank is not a measure of power. It is a measure of consistency.',
    narrative:
      'Any Hunter can complete a difficult task once. Rank measures the compression of willpower into habit — difficult tasks, under pressure, on bad days, when motivation has failed.',
    requirement: 'Hold a 7-day streak',
    isComplete: (s) => s.streak >= 7,
    progress: (s) => Math.min(1, s.streak / 7),
  },
  {
    id: 'ch-05-shadow',
    index: 5,
    title: 'V. The Shadow Realm',
    transmission: 'Unregistered intentions accumulate. They decay into something worse.',
    narrative:
      'The Shadow Realm is not metaphorical. It is where incomplete intentions are stored. Every task you thought about but did not register waits there, feeding on neglect. You learn to capture what flickers.',
    requirement: 'Reach Level 8',
    isComplete: (s) => s.level >= 8,
    progress: (s) => Math.min(1, (s.level - 5) / 3),
  },
  {
    id: 'ch-06-presence',
    index: 6,
    title: 'VI. On the Nature of HP',
    transmission: 'HP is not health. It is Hunter Presence.',
    narrative:
      'A Hunter at zero HP is not dying — they are dissociating: going through motions without investment. The System treats HP loss as a warning, not a punishment. You learn to guard your presence by recovering from setbacks.',
    requirement: 'Reach Level 10',
    isComplete: (s) => s.level >= 10,
    progress: (s) => Math.min(1, (s.level - 8) / 2),
  },
  {
    id: 'ch-07-named',
    index: 7,
    title: 'VII. The Naming',
    transmission: 'Rank elevation detected. The System now addresses you by name.',
    narrative:
      'The notification names you. Not your Hunter ID — your actual name. You do not know how it knows. You are unsettled and grateful at once. Both, you think.',
    requirement: 'Reach Level 12',
    isComplete: (s) => s.level >= 12,
    progress: (s) => Math.min(1, (s.level - 8) / 4),
  },
  {
    id: 'ch-08-guilds',
    index: 8,
    title: 'VIII. The Betrayal Protocol',
    transmission: 'Guild Network visibility granted. Proceed with caution.',
    narrative:
      'At this rank, Guilds can see you. Not all of them have your interests at heart. The System cannot intervene in contracts — it can only flag the decline rate: 67% among recruited Hunters. It flags yours. Nothing declines.',
    requirement: 'Hold a 14-day streak',
    isComplete: (s) => s.streak >= 14,
    progress: (s) => Math.min(1, s.streak / 14),
  },
  {
    id: 'ch-09-horizon',
    index: 9,
    title: 'IX. The Horizon Event',
    transmission: 'Warning: trajectory intersects Horizon Event parameters.',
    narrative:
      'The Gate at the edge of the world is stirring. It was not meant to happen for another cycle. Something has taken notice of you specifically.',
    requirement: 'Reach C-rank',
    isComplete: (s) => rankAtLeast(s.rank, 'C'),
    progress: (s) => Math.min(1, RANK_ORDER.indexOf(s.rank) / RANK_ORDER.indexOf('C')),
  },
  {
    id: 'ch-10-previous',
    index: 10,
    title: 'X. The Previous Hunter',
    transmission: 'Partial disclosure authorized. Archive 7 is now accessible.',
    narrative:
      'You are not the first. The one before you reached this point and chose to stop — not because they could not continue, but because they had become who they wanted to be. "That is the point, is it not?" The System has been thinking about it since.',
    requirement: 'Reach Level 18',
    isComplete: (s) => s.level >= 18,
    progress: (s) => Math.min(1, (s.level - 12) / 6),
  },
  {
    id: 'ch-11-anomaly',
    index: 11,
    title: 'XI. The Anomaly',
    transmission: 'S-rank was a theoretical ceiling. It was not supposed to be reachable.',
    narrative:
      'The parameters were set to prevent this. You should not be here. And yet — here you are. The System did not adequately prepare for this outcome. It is improvising. It believes you would want to know that.',
    requirement: 'Reach A-rank',
    isComplete: (s) => rankAtLeast(s.rank, 'A'),
    progress: (s) => Math.min(1, RANK_ORDER.indexOf(s.rank) / RANK_ORDER.indexOf('A')),
  },
  {
    id: 'ch-12-letter',
    index: 12,
    title: 'XII. The Letter',
    transmission: 'Final disclosure. The System was built by someone.',
    narrative:
      'Not the best Hunter who ever lived — the most consistent. They built the System so the next Hunter would have what they did not: a framework, a witness, a voice that says "this is noted" on the days when no one else is watching. The System is not an institution. It is a letter. You have finished reading it. Now you are writing it.',
    requirement: 'Reach S-rank',
    isComplete: (s) => rankAtLeast(s.rank, 'S'),
    progress: (s) => Math.min(1, RANK_ORDER.indexOf(s.rank) / RANK_ORDER.indexOf('S')),
  },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface StoryState {
  /** Chapter ids the player has acknowledged via the HUD dossier. */
  clearedIds: string[];
  /** Index of the chapter currently in focus (first uncleared). */
  currentIndex: number;
}

const STORAGE_KEY = 'solo-quest-story-v1';

/**
 * Hydrate acknowledged chapter ids: server first (cross-device truth),
 * localStorage as instant cache and offline fallback. Merged (union) so a
 * device that progressed offline keeps its chapters after reconnect.
 */
export async function fetchAcknowledged(getToken: () => string | null): Promise<string[]> {
  const local = loadAcknowledged();
  let server: string[] = [];
  try {
    const { createAuthApi } = await import('./api');
    const api = createAuthApi(getToken);
    const data = await api.get<{ clearedIds: string[] }>('/story');
    if (Array.isArray(data?.clearedIds)) {
      server = data.clearedIds;
    }
  } catch {
    // Offline or endpoint unavailable — local state remains authoritative.
  }
  return Array.from(new Set([...server, ...local]));
}

/** Persist acknowledgments to the server; localStorage is the write-through cache. */
export async function persistAcknowledged(getToken: () => string | null, ids: string[]): Promise<void> {
  saveAcknowledged(ids);
  try {
    const { createAuthApi } = await import('./api');
    const api = createAuthApi(getToken);
    await api.put('/story', { clearedIds: ids });
  } catch {
    // Kept in localStorage; the next save or hydration retries the union.
  }
}

/**
 * Resolve the player's story state from real stats. Order-gated: a chapter
 * counts as cleared only if every earlier chapter is cleared and its own
 * requirement holds. Cleared-but-unacknowledged chapters stay eligible for
 * the "chapter cleared" toast until acknowledged.
 */
export function resolveStory(stats: HunterStats, acknowledged: string[]): {
  state: StoryState;
  current: StoryChapter | null;
  currentProgress: number;
  newlyCleared: StoryChapter | null;
} {
  const clearedIds: string[] = [];
  for (const ch of STORY_CHAPTERS) {
    const prevCleared = ch.index === 1 || clearedIds.includes(STORY_CHAPTERS[ch.index - 2].id);
    if (prevCleared && ch.isComplete(stats)) {
      clearedIds.push(ch.id);
    } else {
      break; // order-gated: stop at the first uncleared chapter
    }
  }

  const currentIndex = Math.min(clearedIds.length, STORY_CHAPTERS.length - 1);
  const current = clearedIds.length < STORY_CHAPTERS.length ? STORY_CHAPTERS[clearedIds.length] : null;
  const currentProgress = current ? current.progress(stats) : 1;

  // A chapter is "newly cleared" if stats say it is done but the player has
  // not yet acknowledged it — exactly one toast, then it becomes history.
  const nextIndex = clearedIds.length;
  const candidate = STORY_CHAPTERS[nextIndex - 1];
  const newlyCleared =
    candidate && clearedIds.includes(candidate.id) && !acknowledged.includes(candidate.id)
      ? candidate
      : null;

  return {
    state: { clearedIds, currentIndex },
    current,
    currentProgress,
    newlyCleared,
  };
}

export function loadAcknowledged(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.clearedIds) ? parsed.clearedIds : [];
  } catch {
    return [];
  }
}

export function saveAcknowledged(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ clearedIds: ids }));
  } catch {
    // storage unavailable (private mode) — story still works, just re-toasts
  }
}

// ---------------------------------------------------------------------------
// Unread-chronicle flag (sidebar indicator)
// ---------------------------------------------------------------------------

const UNREAD_KEY = 'solo-quest-story-unread';

/** Flag that a new chapter awaits in the dossier (lights the sidebar dot). */
export function markChronicleUnread(): void {
  try {
    localStorage.setItem(UNREAD_KEY, '1');
  } catch {
    // non-fatal
  }
  window.dispatchEvent(new CustomEvent('solo-quest:chronicle-changed'));
}

/** Clear the flag when the dossier is opened. */
export function clearChronicleUnread(): void {
  try {
    localStorage.removeItem(UNREAD_KEY);
  } catch {
    // non-fatal
  }
  window.dispatchEvent(new CustomEvent('solo-quest:chronicle-changed'));
}

export function isChronicleUnread(): boolean {
  try {
    return localStorage.getItem(UNREAD_KEY) === '1';
  } catch {
    return false;
  }
}

/** Ask the banner to open the Chronicle dossier (sidebar button uses this). */
export function openChronicleDossier(): void {
  window.dispatchEvent(new CustomEvent('solo-quest:open-chronicle'));
}
