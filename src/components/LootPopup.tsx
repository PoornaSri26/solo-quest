import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { LootItem } from '../shared/types';

const RARITY_STYLES: Record<LootItem['rarity'], { ring: string; glow: string; label: string }> = {
  common: { ring: 'border-slate-400/60', glow: 'shadow-slate-400/20', label: 'text-slate-300' },
  rare: { ring: 'border-sky-400/70', glow: 'shadow-sky-400/30', label: 'text-sky-300' },
  epic: { ring: 'border-violet-gate', glow: 'shadow-violet-gate/40', label: 'text-violet-gate' },
};

/**
 * LootPopup — the visual "battle payoff" moment when a loot drop lands (#1, #13).
 * Renders a brief full-screen celebratory overlay when a `loot:dropped` event arrives.
 */
export default function LootPopup() {
  const loot = useStore((s) => s.lootEvent);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loot) {
      setShow(false);
      return;
    }
    setShow(true);
    const timer = setTimeout(() => setShow(false), 3200);
    return () => clearTimeout(timer);
  }, [loot]);

  if (!loot || !show) return null;

  const style = RARITY_STYLES[loot.rarity] ?? RARITY_STYLES.common;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
      role="status"
      aria-live="polite"
      aria-label={`Loot drop: ${loot.name}, ${loot.rarity} rarity`}
    >
      {/* Dim backdrop */}
      <div className="absolute inset-0 bg-black/40 animate-[fadeIn_0.3s_ease-out]" />

      {/* Burst rays */}
      <div className="absolute w-64 h-64 rounded-full border-4 border-gold-primary/30 animate-ping" />

      <div
        className={`relative bg-gradient-to-br from-surface to-raised border-2 ${style.ring} rounded-2xl px-10 py-8 text-center shadow-2xl ${style.glow} animate-[lootPop_0.5s_cubic-bezier(0.34,1.56,0.64,1)]`}
      >
        <p className="font-display tracking-[0.3em] text-xs text-text-secondary mb-3">LOOT ACQUIRED</p>
        <div className="text-6xl mb-3 animate-bounce">{loot.emoji}</div>
        <h3 className="text-xl font-display text-text-primary mb-1">{loot.name}</h3>
        <p className={`text-sm font-display tracking-widest uppercase ${style.label}`}>{loot.rarity}</p>

        {/* Sparkles for epics */}
        {loot.rarity === 'epic' && (
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <div className="absolute top-2 left-6 text-lg animate-ping">✨</div>
            <div className="absolute top-8 right-8 text-base animate-ping" style={{ animationDelay: '0.3s' }}>✨</div>
            <div className="absolute bottom-6 left-10 text-base animate-ping" style={{ animationDelay: '0.6s' }}>✨</div>
            <div className="absolute bottom-3 right-6 text-lg animate-ping" style={{ animationDelay: '0.9s' }}>✨</div>
          </div>
        )}
      </div>
    </div>
  );
}
