import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { TypeSequence } from './originkit/ui/ambient-void';
import {
  STORY_CHAPTERS,
  resolveStory,
  loadAcknowledged,
  fetchAcknowledged,
  persistAcknowledged,
  markChronicleUnread,
  clearChronicleUnread,
  type StoryChapter,
} from '../lib/story-arc';

/**
 * StoryChapterBanner — the living chronicle of the player's arc.
 *
 * A HUD strip at the top of the Dashboard: the current chapter, its typed
 * [System: ...] transmission, and how close the next beat is. Opens the
 * Chronicle dossier — all twelve chapters, cleared ones readable, future
 * ones encrypted. When a chapter's requirement is met by real stats, the
 * System announces it once via toast; acknowledging in the dossier marks
 * it read. The story advances because you show up.
 */

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const StoryChapterBanner: React.FC = () => {
  const stats = useStore((s) => s.stats);
  const addToast = useStore((s) => s.addToast);
  const token = useStore((s) => s.token);

  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Local cache renders instantly; server truth (cross-device) merges in.
  useEffect(() => {
    setAcknowledged(loadAcknowledged());
    setHydrated(true);
    if (!token) return;
    let cancelled = false;
    fetchAcknowledged(() => token).then((ids) => {
      if (!cancelled) setAcknowledged(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const story = useMemo(() => {
    if (!stats) return null;
    return resolveStory(stats, acknowledged);
  }, [stats, acknowledged]);

  // One-time chapter-clear announcement per chapter. Persisted locally
  // immediately and to the server fire-and-forget (localStorage retries
  // cover offline; hydration unions server + local).
  useEffect(() => {
    if (!story?.newlyCleared) return;
    const ch = story.newlyCleared;
    addToast('info', `Chapter cleared — ${ch.title}. ${ch.transmission}`);
    const next = [...acknowledged, ch.id];
    setAcknowledged(next);
    persistAcknowledged(token ? () => token : () => null, next);
    markChronicleUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.newlyCleared?.id]);

  // Sidebar button (or any caller) can request the dossier via event.
  useEffect(() => {
    const onOpen = () => setDossierOpen(true);
    window.addEventListener('solo-quest:open-chronicle', onOpen);
    return () => window.removeEventListener('solo-quest:open-chronicle', onOpen);
  }, []);

  // Opening the dossier marks the chronicle read.
  useEffect(() => {
    if (dossierOpen) clearChronicleUnread();
  }, [dossierOpen]);

  if (!hydrated || !stats || !story) return null;

  const current = story.current;
  const clearedCount = story.state.clearedIds.length;
  const lastCleared = clearedCount > 0 ? STORY_CHAPTERS[clearedCount - 1] : null;
  const allDone = !current;

  return (
    <>
      <div
        className="relative mb-6 border border-border-subtle rounded-sm bg-surface/80 backdrop-blur-sm"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)' }}
      >
        {/* left chapter sigil */}
        <div className="flex items-stretch">
          <div
            aria-hidden="true"
            className="flex items-center justify-center px-4 border-r border-border-subtle"
            style={{
              background:
                'linear-gradient(160deg, rgba(201,168,76,0.10) 0%, rgba(123,94,167,0.10) 100%)',
            }}
          >
            <span
              className="font-display text-2xl tracking-wider"
              style={{
                color: allDone ? '#daa520' : '#a594f5',
                textShadow: allDone
                  ? '0 0 12px rgba(218,165,32,0.55)'
                  : '0 0 12px rgba(165,148,245,0.4)',
              }}
            >
              {allDone ? 'XII' : ROMAN[current.index - 1]}
            </span>
          </div>

          {/* body */}
          <div className="flex-1 min-w-0 px-4 py-3">
            {allDone ? (
              <>
                <div className="font-system text-xs text-text-system tracking-widest">
                  <TypeSequence text="[System: The chronicle is complete. You are writing it now.]" />
                </div>
                <div className="font-display text-lg text-gold-primary mt-1">
                  Chronicle Complete
                </div>
                <p className="text-sm text-text-secondary mt-0.5">
                  All twelve chapters cleared. The letter has been read to its final line.
                </p>
              </>
            ) : (
              <>
                <div className="font-system text-xs text-text-system tracking-widest">
                  <TypeSequence text={`[System: ${current.transmission}]`} />
                </div>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="font-display text-lg text-text-primary">{current.title}</span>
                  <span className="font-data text-xs text-text-muted">
                    Chapter {current.index} / {STORY_CHAPTERS.length}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div
                    className="flex-1 h-1.5 rounded-sm overflow-hidden"
                    style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.06)' }}
                    role="meter"
                    aria-valuenow={Math.round(story.currentProgress * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progress toward ${current.requirement}`}
                  >
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${Math.round(story.currentProgress * 100)}%`,
                        background: 'linear-gradient(90deg, #7A6330 0%, #C9A84C 100%)',
                        transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    />
                  </div>
                  <span className="font-data text-xs text-text-secondary whitespace-nowrap">
                    {current.requirement}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* dossier toggle */}
          <button
            onClick={() => setDossierOpen(true)}
            className="flex items-center gap-2 px-4 border-l border-border-subtle text-text-secondary hover:text-gold-primary hover:bg-raised/60 transition-fast font-display text-sm tracking-wider"
            aria-haspopup="dialog"
            aria-expanded={dossierOpen}
          >
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: '#C9A84C', boxShadow: '0 0 8px rgba(201,168,76,0.6)' }}
            />
            Chronicle
            <span className="font-data text-xs text-text-muted">
              {clearedCount}/{STORY_CHAPTERS.length}
            </span>
          </button>
        </div>
      </div>

      {dossierOpen && (
        <ChronicleDossier
          clearedIds={story.state.clearedIds}
          currentId={current?.id ?? null}
          lastCleared={lastCleared}
          onClose={() => setDossierOpen(false)}
        />
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Chronicle dossier modal
// ---------------------------------------------------------------------------

interface DossierProps {
  clearedIds: string[];
  currentId: string | null;
  lastCleared: StoryChapter | null;
  onClose: () => void;
}

const ChronicleDossier: React.FC<DossierProps> = ({ clearedIds, currentId, lastCleared, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#08090C]/95 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Chronicle dossier"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-border-subtle rounded-md bg-surface"
        style={{ boxShadow: '0 16px 64px rgba(0,0,0,0.8)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm border-b border-border-subtle px-6 py-4">
          <div className="font-system text-xs text-text-system tracking-widest">
            [System: Chronicle dossier — Hunter access granted]
          </div>
          <div className="flex items-center justify-between mt-1">
            <h2 className="font-display text-xl text-text-primary tracking-wide">
              The Chronicle
            </h2>
            <button
              onClick={onClose}
              className="font-system text-xs text-text-muted hover:text-gold-primary transition-fast"
              aria-label="Close dossier"
            >
              [CLOSE]
            </button>
          </div>
        </div>

        {/* newly cleared, highlighted */}
        {lastCleared && (
          <div className="px-6 pt-4">
            <div
              className="border rounded-sm px-4 py-3"
              style={{
                borderColor: 'rgba(201,168,76,0.5)',
                background: 'rgba(201,168,76,0.06)',
              }}
            >
              <div className="font-system text-xs text-text-system tracking-widest">
                [Transmission received — acknowledge to file]
              </div>
              <div className="font-display text-base text-gold-primary mt-1">
                {lastCleared.title}
              </div>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                {lastCleared.narrative}
              </p>
            </div>
          </div>
        )}

        {/* timeline */}
        <ol className="px-6 py-4 space-y-2">
          {STORY_CHAPTERS.map((ch) => {
            const cleared = clearedIds.includes(ch.id);
            const isCurrent = ch.id === currentId;
            return (
              <li
                key={ch.id}
                className="flex gap-4 rounded-sm px-4 py-3 border"
                style={{
                  borderColor: isCurrent
                    ? 'rgba(123,94,167,0.5)'
                    : cleared
                      ? 'rgba(201,168,76,0.25)'
                      : 'rgba(51,51,51,0.6)',
                  background: isCurrent
                    ? 'rgba(123,94,167,0.07)'
                    : cleared
                      ? 'rgba(201,168,76,0.03)'
                      : 'transparent',
                }}
              >
                <span
                  aria-hidden="true"
                  className="font-display text-lg w-10 flex-shrink-0 tracking-wider"
                  style={{
                    color: cleared ? '#C9A84C' : isCurrent ? '#a594f5' : '#4a4a4a',
                    textShadow: cleared ? '0 0 10px rgba(201,168,76,0.4)' : 'none',
                  }}
                >
                  {ROMAN[ch.index - 1]}
                </span>
                <div className="min-w-0">
                  <div
                    className="font-display text-sm tracking-wide"
                    style={{ color: cleared || isCurrent ? '#fff' : '#666' }}
                  >
                    {cleared || isCurrent ? ch.title : 'SIGNAL ENCRYPTED'}
                  </div>
                  {cleared && (
                    <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                      {ch.narrative}
                    </p>
                  )}
                  {isCurrent && (
                    <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                      {ch.narrative}
                    </p>
                  )}
                  {!cleared && !isCurrent && (
                    <p className="font-system text-xs text-text-muted mt-1">
                      [Encrypted — requirement withheld until prior chapters clear]
                    </p>
                  )}
                  {isCurrent && (
                    <p className="font-data text-xs text-violet-gate mt-1">
                      IN PROGRESS
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* footer note */}
        <div className="px-6 pb-5">
          <p className="font-system text-xs text-text-muted leading-relaxed">
            [The Chronicle advances with your record — levels, ranks, streaks, presence.
            The System does not grant chapters. It notes them.]
          </p>
        </div>
      </div>
    </div>
  );
};

export default StoryChapterBanner;
