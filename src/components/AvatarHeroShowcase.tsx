import React, { useEffect, useState } from 'react';
import { getAvatarUrl } from '../lib/avatars';

/**
 * AvatarHeroShowcase — marketing hook for the landing hero (3D report #301).
 *
 * Shows an S-rank hunter (maxed aura #37) slowly rotating next to the pitch —
 * "this is the hunter you'll become" (#316). Follows the same guardrails as the
 * in-app customizer:
 *   #95   three.js chunk loads only when the showcase actually mounts
 *   #19/#101  WebGL probe; falls back to the 2D avatar when unavailable
 *   #96/#256  "Disable 3D" preference respected via localStorage flag
 *   #257  prefers-reduced-motion disables the turntable +GSAP-style motion
 *   #301  Featured in marketing/hero as the visual hook
 */

const LazyHunterAvatar3D = React.lazy(() => import('./HunterAvatar3D'));

const hasWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

const DISABLE_3D_KEY = 'solo-quest:disable-3d';

export const AvatarHeroShowcase: React.FC = () => {
  const [use3D, setUse3D] = useState<boolean>(() => hasWebGL());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Respect an explicit user preference to keep 3D off (#96/#256)
    try {
      if (localStorage.getItem(DISABLE_3D_KEY) === '1') setUse3D(false);
    } catch {
      /* private mode — ignore */
    }
    // Mount slightly after first paint so the hero text animates in first
    const t = window.setTimeout(() => setVisible(true), 350);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  if (!use3D) {
    return (
      <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
        <img
          src={getAvatarUrl('solo-quest-showcase', 'bottts')}
          alt="Example 3D hunter avatar (2D fallback)"
          className="w-56 h-56 md:w-72 md:h-72 rounded-full border border-violet-gate/40 bg-[#0d0f14]"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96">
      {/* Glow backdrop so the aura reads against the dark hero (#301) */}
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(240,200,106,0.5), transparent 65%)' }}
      />
      <React.Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center text-text-muted text-xs font-system tracking-widest uppercase">
            Summoning hunter…
          </div>
        }
      >
        <LazyHunterAvatar3D
          rotate
          height={380}
          config={{
            rank: 'S',
            armorColor: '#3a3f58',
            accentColor: '#f0c86a',
            hairStyle: 'swept',
            hairColor: '#2a2f3a',
            classSigil: 'sword',
            bodyType: 'broad',
            skinTone: '#c8a27e',
          }}
        />
      </React.Suspense>
      {/* Rank badge caption */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 px-3 py-1 border border-gold-primary/40 bg-black/40 rounded-full text-[10px] font-system tracking-widest text-gold-primary uppercase whitespace-nowrap">
        S-Rank Hunter Awaiting
      </div>
    </div>
  );
};

export default AvatarHeroShowcase;
