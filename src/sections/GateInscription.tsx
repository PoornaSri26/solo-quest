import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const GateInscription = () => {
  const glyphRef = useRef<SVGPathElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const ctx = gsap.context(() => {
      const path = glyphRef.current;
      if (!path) return;

      const length = path.getTotalLength();
      path.style.setProperty('--length', `${length}`);
      gsap.set(path, { strokeDashoffset: length });

      gsap.to(path, {
        strokeDashoffset: 0,
        duration: 2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse',
        },
      });
    }, [containerRef, glyphRef]);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center py-12">
      <h2 className="font-display text-3xl text-text-primary mb-4">Gate Inscription</h2>
      <p className="font-system text-text-secondary text-center max-w-md mb-8">
        Ancient runes pulse with dormant power, waiting for the worthy to trace their sigils...
      </p>

      <div className="relative">
        <svg
          width="200"
          height="200"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          className="text-gold-primary"
        >
          <defs>
            <linearGradient id="runeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--gold-primary)" />
              <stop offset="50%" stopColor="var(--gold-dim)" />
              <stop offset="100%" stopColor="var(--gold-primary)" />
            </linearGradient>
          </defs>
          <path
            ref={glyphRef}
            d="M30,20 L70,20 L80,30 L70,40 L30,40 L20,30 Z M40,50 L60,50 L65,55 L60,60 L40,60 L35,55 Z M50,70 L55,80 L45,80 Z"
            fill="none"
            stroke="url(#runeGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};