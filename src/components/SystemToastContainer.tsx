import React, { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';
import { useStore } from '../store/useStore';
import { Rank } from '../shared/types';
import { rankUpNarrative } from '../lib/system-voice';

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
  };

  const getTypeStyles = (type: Toast['type']) => {
    const t = type.toUpperCase();
    switch (t) {
      case 'REWARD':
        return 'border-gold-primary bg-gold-primary/10 text-gold-primary';
      case 'PENALTY':
        return 'border-crimson bg-crimson/10 text-crimson';
      case 'WARNING':
        return 'border-rank-a bg-rank-a/10 text-rank-a';
      default:
        return 'border-violet-gate bg-violet-gate/10 text-violet-gate';
    }
  };

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
      {toasts.length > 0 && (
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
                  [System: {toast.message}]
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
        </div>
      )}
    </>
  );
};

export default SystemToastContainer;
