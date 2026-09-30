import React, { useEffect, useState, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import { useStore } from '../store/useStore';
import { Rank } from '../shared/types';
import { rankUpNarrative } from '../lib/system-voice';
import { TypeSequence } from './originkit/ui/ambient-void';
import { STORY_CHAPTERS } from '../lib/story-arc';

interface Toast {
  id: string;
  message: string;
  type: 'reward' | 'penalty' | 'info' | 'warning' | 'REWARD' | 'PENALTY' | 'INFO' | 'WARNING';
  createdAt: number;
}

const RankUpOverlay: React.FC<{ rank: Rank; onClose: () => void }> = ({ rank, onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const narrative = rankUpNarrative[rank] || rankUpNarrative['E'];
  const stats = useStore((s) => s.stats);

  // Chronicle cross-reference: the highest chapter this rank satisfies.
  // Rank elevation is a story beat — the overlay cites the chapter that
  // chronicles it (IX. The Horizon Event, XI. The Anomaly, XII. The Letter).
  const citedChapter = useMemo(() => {
    if (!stats) return null;
    for (let i = STORY_CHAPTERS.length - 1; i >= 0; i--) {
      if (STORY_CHAPTERS[i].isComplete(stats)) return STORY_CHAPTERS[i];
    }
    return null;
  }, [stats]);

  useEffect(() => {
    if (!overlayRef.current || !textRef.current) return;
    const tl = gsap.timeline();
    tl.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power2.inOut' })
      .fromTo(textRef.current.children, 
        { opacity: 0, y: 20 }, 
        { opacity: 1, y: 0, duration: 1, stagger: 1.5, ease: 'power2.out' }
      );
  }, []);

  const handleDismiss = () => {
    gsap.to(overlayRef.current, { 
      opacity: 0, 
      duration: 1, 
      onComplete: onClose 
    });
  };

  return (
    <div 
      ref={overlayRef} 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#08090C]/95 backdrop-blur-md"
      onClick={handleDismiss}
    >
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
      <div ref={textRef} className="relative z-10 max-w-2xl px-8 text-center flex flex-col gap-12">
        <h2 className="font-system text-xl tracking-[0.2em] text-gold-primary uppercase">
          {narrative.headline}
        </h2>
        <p className="font-display text-2xl md:text-3xl text-text-primary leading-relaxed">
          {narrative.body}
        </p>
        <p className="font-system text-text-muted italic opacity-75">
          {narrative.subtext}
        </p>
        {citedChapter && (
          <div
            className="mx-auto max-w-md border rounded-sm px-4 py-3"
            style={{
              borderColor: 'rgba(201,168,76,0.4)',
              background: 'rgba(201,168,76,0.05)',
            }}
          >
            <div className="font-system text-[11px] text-text-system tracking-widest">
              CHRONICLE — {citedChapter.title.toUpperCase()}
            </div>
            <p className="text-sm text-text-secondary mt-1 leading-relaxed">
              {citedChapter.narrative}
            </p>
          </div>
        )}
        <p className="font-system text-xs text-text-system mt-12 animate-pulse">
          [Click anywhere to acknowledge]
        </p>
      </div>
    </div>
  );
};

const SystemToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notifications = useStore((s) => s.notifications);
  const rankUpEvent = useStore((s) => s.rankUpEvent);
  const clearRankUpEvent = useStore((s) => s.clearRankUpEvent);
  const lastNotifRef = useRef<string | null>(null);
  const storeToasts = useStore((s) => s.toasts);
  const removeStoreToast = useStore((s) => s.removeToast);

  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[0];
    if (latest && latest.id !== lastNotifRef.current && !latest.read) {
      lastNotifRef.current = latest.id;
      const toast: Toast = {
        id: latest.id,
        message: latest.message,
        type: latest.type,
        createdAt: Date.now(),
      };
      setToasts((prev) => [toast, ...prev].slice(0, 5));

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 5000);
    }
  }, [notifications]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    removeStoreToast(id);
  };

  const dismissStoreToast = (id: string) => {
    removeStoreToast(id);
  };

  // Auto-dismiss store toasts (from addToast) after 5 seconds
  useEffect(() => {
    if (storeToasts.length === 0) return;
    const timers = storeToasts.map((toast) =>
      setTimeout(() => removeStoreToast(toast.id), toast.duration ?? 5000)
    );
    return () => timers.forEach(clearTimeout);
  }, [storeToasts, removeStoreToast]);

  return (
    <>
      {/* Rank Up Cinematic Overlay */}
      {rankUpEvent && (
        <RankUpOverlay 
          rank={rankUpEvent.rank as Rank} 
          onClose={clearRankUpEvent} 
        />
      )}

      {/* Ambient Toasts */}
      {(toasts.length > 0 || storeToasts.length > 0) && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="flex items-start gap-3 px-4 py-3 border rounded-sm backdrop-blur-sm shadow-lg animate-slide-in"
              onClick={() => dismissToast(toast.id)}
              role="alert"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-system leading-relaxed">
                  <TypeSequence text={`[System: ${toast.message}]`} speed={14} />
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismissToast(toast.id); }}
                className="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-fast"
              >
                ×
              </button>
            </div>
          ))}
          {storeToasts.map((toast) => (
            <div
              key={toast.id}
              className="flex items-start gap-3 px-4 py-3 border rounded-sm backdrop-blur-sm shadow-lg animate-slide-in"
              onClick={() => dismissStoreToast(toast.id)}
              role="alert"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-system leading-relaxed">
                  <TypeSequence text={`[System: ${toast.message}]`} speed={14} />
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismissStoreToast(toast.id); }}
                className="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-fast"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default SystemToastContainer;
