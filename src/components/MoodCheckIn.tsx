import { useState } from 'react';
import { useStore } from '../store/useStore';
import { RankSuggestion } from '../shared/types';

const ENERGY_FACES = ['😵', '😪', '🙂', '😀', '⚡'];
const MOOD_FACES = ['😞', '😕', '😐', '🙂', '🤩'];

/**
 * MoodCheckIn — self-report energy/mood (1–5) once per session (#2).
 * Feeds adaptive difficulty: suggestions rank-band quests to match energy (#78),
 * and surfaces the curated Quest of the Day (#87).
 */
export default function MoodCheckIn() {
  const { stats, checkIn, questSuggestion, fetchQuestSuggestion, addToast } = useStore();
  const [energy, setEnergy] = useState<number>(stats?.lastEnergyLevel ?? 0);
  const [mood, setMood] = useState<number>(stats?.lastMoodLevel ?? 0);
  const [suggestion, setSuggestion] = useState<RankSuggestion | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const alreadyCheckedInToday = (() => {
    if (!stats?.lastCheckInAt) return false;
    const d = new Date(stats.lastCheckInAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  })();

  const handleCheckIn = async () => {
    if (!energy || !mood) return;
    setIsSaving(true);
    const result = await checkIn(energy, mood);
    setSuggestion(result);
    setIsSaving(false);
    if (result) addToast('info', result.label);
  };

  const loadSuggestions = () => {
    fetchQuestSuggestion();
  };

  return (
    <section
      className="bg-gradient-to-br from-surface to-raised border border-border-subtle rounded-md p-5 hover:border-violet-gate/40 transition-all duration-300"
      aria-label="Daily check-in and adaptive suggestions"
    >
      <h2 className="mb-3 text-base font-display flex items-center gap-2 text-text-primary">
        <span aria-hidden="true">🧭</span>
        <span>Daily Check-In</span>
      </h2>

      {!alreadyCheckedInToday && !suggestion && (
        <>
          <p className="text-text-secondary text-sm mb-3">How are you feeling today? Your answers tune quest suggestions.</p>

          <div className="mb-3" role="radiogroup" aria-label="Energy level">
            <p className="text-xs text-text-secondary mb-1">Energy</p>
            <div className="flex gap-1">
              {ENERGY_FACES.map((face, i) => (
                <button
                  key={`energy-${i}`}
                  onClick={() => setEnergy(i + 1)}
                  role="radio"
                  aria-checked={energy === i + 1}
                  aria-label={`Energy level ${i + 1} of 5`}
                  className={`text-2xl p-1.5 rounded-sm border transition-fast ${
                    energy === i + 1
                      ? 'border-gold-primary bg-gold-primary/10 scale-110'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {face}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4" role="radiogroup" aria-label="Mood level">
            <p className="text-xs text-text-secondary mb-1">Mood</p>
            <div className="flex gap-1">
              {MOOD_FACES.map((face, i) => (
                <button
                  key={`mood-${i}`}
                  onClick={() => setMood(i + 1)}
                  role="radio"
                  aria-checked={mood === i + 1}
                  aria-label={`Mood level ${i + 1} of 5`}
                  className={`text-2xl p-1.5 rounded-sm border transition-fast ${
                    mood === i + 1
                      ? 'border-gold-primary bg-gold-primary/10 scale-110'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {face}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCheckIn}
            disabled={!energy || !mood || isSaving}
            className="w-full py-2 text-sm bg-violet-gate/20 text-violet-gate hover:bg-violet-gate/30 rounded-sm transition-fast font-display disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : 'Check In'}
          </button>
        </>
      )}

      {(alreadyCheckedInToday || suggestion) && (
        <div className="space-y-3">
          <p className="text-sm text-text-primary">
            <span aria-hidden="true">{ENERGY_FACES[(stats?.lastEnergyLevel ?? 3) - 1]}</span>{' '}
            Energy {stats?.lastEnergyLevel ?? '–'}/5 · Mood {stats?.lastMoodLevel ?? '–'}/5
          </p>
          <p className="text-sm text-text-secondary">{suggestion?.label}</p>
          <button
            onClick={loadSuggestions}
            className="w-full py-2 text-sm border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-raised rounded-sm transition-fast"
          >
            Show matching quests →
          </button>

          {questSuggestion?.questOfTheDay && (
            <div className="pt-3 border-t border-border-subtle">
              <p className="text-xs font-display tracking-widest text-gold-primary mb-1">QUEST OF THE DAY</p>
              <p className="text-sm text-text-primary">{questSuggestion.questOfTheDay.title}</p>
              <p className="text-xs text-text-secondary mt-1">
                Rank {questSuggestion.questOfTheDay.rank} · +{questSuggestion.questOfTheDay.expReward} XP
              </p>
            </div>
          )}

          {questSuggestion?.quests && questSuggestion.quests.length > 0 && (
            <div>
              <p className="text-xs text-text-secondary mb-1">
                {questSuggestion.reason} Suggested for you:
              </p>
              <ul className="space-y-1">
                {questSuggestion.quests.slice(0, 3).map((q) => (
                  <li key={q.id} className="text-sm text-text-primary flex justify-between gap-2">
                    <span className="truncate">{q.title}</span>
                    <span className="font-data text-text-secondary">{q.rank}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
