import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { LootItem } from '../shared/types';

const RARITY_STYLES: Record<LootItem['rarity'], { ring: string; glow: string; label: string; bg: string }> = {
  common: { ring: 'border-slate-400/60', glow: 'shadow-slate-400/20', label: 'text-slate-300', bg: 'from-slate-800/90 to-slate-900/90' },
  rare: { ring: 'border-sky-400/70', glow: 'shadow-sky-400/30', label: 'text-sky-300', bg: 'from-sky-900/90 to-sky-950/90' },
  epic: { ring: 'border-violet-gate', glow: 'shadow-violet-gate/40', label: 'text-violet-gate', bg: 'from-violet-900/90 to-violet-950/90' },
  legendary: { ring: 'border-gold-primary', glow: 'shadow-gold-primary/50', label: 'text-gold-primary', bg: 'from-amber-900/90 to-amber-950/90' },
};

/**
 * LootPopup — the visual "battle payoff" moment when a loot drop lands (#1, #13).
 * Enhanced with dramatic dopamine-triggering effects for addictive gameplay.
 */
export default function LootPopup() {
  const loot = useStore((s) => s.lootEvent);
  const [show, setShow] = useState(false);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    if (!loot) {
      setShow(false);
      setScale(0);
      return;
    }
    setShow(true);
    
    // Dramatic scale animation
    setScale(0);
    setTimeout(() => setScale(1), 50);
    setTimeout(() => setScale(1.1), 200);
    setTimeout(() => setScale(1), 400);
    
    const timer = setTimeout(() => setShow(false), 4000);
    return () => clearTimeout(timer);
  }, [loot]);

  if (!loot || !show) return null;

  const style = RARITY_STYLES[loot.rarity] ?? RARITY_STYLES.common;
  const isLegendary = loot.rarity === 'legendary';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
      role="status"
      aria-live="polite"
      aria-label={`Loot drop: ${loot.name}, ${loot.rarity} rarity`}
    >
      {/* Dramatic backdrop with multiple layers */}
      <div className="absolute inset-0 bg-black/60 animate-[fadeIn_0.4s_ease-out]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80" />
      
      {/* Burst rays - multiple for dramatic effect */}
      <div className="absolute w-96 h-96 rounded-full border-4 border-gold-primary/20 animate-ping" style={{ animationDuration: '1s' }} />
      <div className="absolute w-80 h-80 rounded-full border-2 border-gold-primary/30 animate-ping" style={{ animationDuration: '1.2s', animationDelay: '0.2s' }} />
      <div className="absolute w-64 h-64 rounded-full border-2 border-gold-primary/40 animate-ping" style={{ animationDuration: '1.4s', animationDelay: '0.4s' }} />

      {/* Particle effects */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-gold-primary rounded-full animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 0.5}s`,
              animationDuration: `${0.5 + Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div
        className={`relative bg-gradient-to-br ${style.bg} border-4 ${style.ring} rounded-2xl px-12 py-10 text-center shadow-2xl ${style.glow} transition-transform duration-300`}
        style={{ 
          transform: `scale(${scale})`,
          boxShadow: isLegendary ? '0 0 60px rgba(201, 168, 76, 0.6), 0 0 120px rgba(201, 168, 76, 0.3)' : undefined,
        }}
      >
        {/* Rarity badge */}
        <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-display tracking-widest uppercase ${
          isLegendary ? 'bg-gold-primary text-black' : `bg-raised ${style.label} border ${style.ring}`
        }`}>
          {loot.rarity}
        </div>

        <p className="font-display tracking-[0.4em] text-xs text-text-secondary mb-4 mt-2 animate-pulse">LOOT ACQUIRED</p>
        
        {/* Giant emoji with bounce animation */}
        <div className="text-8xl mb-4 animate-bounce" style={{ animationDuration: '0.8s' }}>{loot.emoji}</div>
        
        <h3 className="text-2xl font-display font-bold text-text-primary mb-2">{loot.name}</h3>
        
        {/* Stats display */}
        {loot.stats && (
          <div className="flex justify-center gap-4 mb-3 text-sm">
            {loot.stats.xp && <span className="text-gold-primary font-data">+{loot.stats.xp} XP</span>}
            {loot.stats.gold && <span className="text-gold-primary font-data">+{loot.stats.gold}g</span>}
          </div>
        )}

        {/* Sparkles - more for higher rarity */}
        {loot.rarity === 'epic' || isLegendary ? (
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute text-lg animate-ping"
                style={{
                  top: `${10 + Math.random() * 80}%`,
                  left: `${10 + Math.random() * 80}%`,
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '1s',
                }}
              >
                ✨
              </div>
            ))}
          </div>
        ) : null}

        {/* Legendary special effects */}
        {isLegendary && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-gold-primary/20 via-transparent to-gold-primary/20 animate-pulse" />
            <div className="absolute -inset-1 bg-gradient-to-r from-gold-primary via-violet-gate to-gold-primary rounded-2xl blur-xl opacity-50 animate-pulse" />
          </>
        )}
      </div>
    </div>
  );
}
