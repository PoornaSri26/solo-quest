import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useStore } from '../store/useStore';

export const StatDashboard = () => {
  const { stats, isLoading } = useStore();
  const refs = {
    health: useRef<HTMLDivElement>(null),
    mana: useRef<HTMLDivElement>(null),
    focus: useRef<HTMLDivElement>(null),
    stamina: useRef<HTMLDivElement>(null),
  };

  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-raised border border-border-subtle rounded-md p-4 text-center animate-pulse">
            <div className="w-8 h-8 mx-auto mb-2 bg-border-subtle rounded-sm"></div>
            <div className="h-6 bg-border-subtle rounded-sm mb-1"></div>
            <div className="h-3 bg-border-subtle rounded-sm"></div>
          </div>
        ))}
      </div>
    );
  }

  // Use actual stats from store or fallback values
  const statsData = {
    health: stats?.hp || 100,
    mana: stats?.exp || 0,
    focus: stats?.statIntelligence || 5,
    stamina: stats?.statEndurance || 5,
  };

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      Object.keys(statsData).forEach(key => {
        const el = refs[key as keyof typeof refs]?.current;
        if (el) {
          el.textContent = String(statsData[key as keyof typeof statsData]);
        }
      });
      return;
    }

    Object.keys(statsData).forEach(key => {
      const el = refs[key as keyof typeof refs]?.current;
      if (el) {
        const targetValue = statsData[key as keyof typeof statsData];
        gsap.fromTo(
          { value: 0 },
          { value: targetValue },
          {
            value: targetValue,
            duration: 1.5,
            ease: 'power2.out',
            snap: { value: 1 },
            onUpdate: function () {
              if (el) {
                el.textContent = Math.round(this.targets()[0].value);
              }
            },
          }
        );
      }
    });
  }, [statsData, refs]);

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-raised border border-border-subtle rounded-md p-4 text-center">
        <div className="w-8 h-8 mx-auto mb-2 text-crimson">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
          </svg>
        </div>
        <div className="stat-value font-data text-2xl text-gold-primary" ref={refs.health}>0</div>
        <div className="stat-label font-system text-xs text-text-secondary mt-1">HP</div>
      </div>

      <div className="bg-raised border border-border-subtle rounded-md p-4 text-center">
        <div className="w-8 h-8 mx-auto mb-2 text-violet-gate">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2a4 4 0 00-4 4v1a2 2 0 00-1 1.73l-3 4a2 2 0 002 2.27l2.45.8a14.03 14.03 0 0011.4 0l2.45-.8a2 2 0 002-2.27l-3-4a2 2 0 00-1-1.73V6a4 4 0 00-4-4zM12 14a2 2 0 110-4 2 2 0 010 4z" fill="currentColor"/>
          </svg>
        </div>
        <div className="stat-value font-data text-2xl text-gold-primary" ref={refs.mana}>0</div>
        <div className="stat-label font-system text-xs text-text-secondary mt-1">EXP</div>
      </div>

      <div className="bg-raised border border-border-subtle rounded-md p-4 text-center">
        <div className="w-8 h-8 mx-auto mb-2 text-rank-a">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4c-5 0-9 3-9 8s4 8 9 8s9-3 9-8s-4-8-9-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6s6 2.69 6 6s-2.69 6-6 6zM12 10a2 2 0 100-4 2 2 0 000 4z" fill="currentColor"/>
          </svg>
        </div>
        <div className="stat-value font-data text-2xl text-gold-primary" ref={refs.focus}>0</div>
        <div className="stat-label font-system text-xs text-text-secondary mt-1">INT</div>
      </div>

      <div className="bg-raised border border-border-subtle rounded-md p-4 text-center">
        <div className="w-8 h-8 mx-auto mb-2 text-rank-s">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 5L7 10h2l1 5h2L12 7l2 5h2l-4-5z" fill="currentColor"/>
          </svg>
        </div>
        <div className="stat-value font-data text-2xl text-gold-primary" ref={refs.stamina}>0</div>
        <div className="stat-label font-system text-xs text-text-secondary mt-1">END</div>
      </div>
    </section>
  );
};