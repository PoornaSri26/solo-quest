import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface RankNode {
  rank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  label: string;
  description: string;
}

const ranks: RankNode[] = [
  { rank: 'E', label: 'You need reminders.', description: 'Starting point' },
  { rank: 'D', label: "You're consistent.", description: 'Building habits' },
  { rank: 'C', label: 'You ship on time.', description: 'Reliable delivery' },
  { rank: 'B', label: 'You lead others.', description: 'Taking charge' },
  { rank: 'A', label: 'You operate solo.', description: 'Independent' },
  { rank: 'S', label: 'You built the thing.', description: 'Master level' }
];

const getRankColor = (rank: string) => {
  switch (rank) {
    case 'S': return 'text-rank-s border-rank-s bg-rank-s/20';
    case 'A': return 'text-rank-a border-rank-a bg-rank-a/20';
    case 'B': return 'text-rank-b border-rank-b bg-rank-b/20';
    case 'C': return 'text-rank-c border-rank-c bg-rank-c/20';
    case 'D': return 'text-rank-d border-rank-d bg-rank-d/20';
    case 'E': return 'text-rank-e border-rank-e bg-rank-e/20';
    default: return 'text-rank-e border-rank-e bg-rank-e/20';
  }
};

const SectionRankLadder: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        document.querySelectorAll('.scroll-hidden').forEach(el => el.classList.add('visible'));
        return;
      }

      // Track sweep - slides in from right
      gsap.from('.rank-track', {
        scrollTrigger: { trigger: '.s4-ranks', start: 'top 70%' },
        x: 120,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out'
      });

      // Rank nodes - light up in sequence
      gsap.from('.rank-node', {
        scrollTrigger: { trigger: '.s4-ranks', start: 'top 65%' },
        opacity: 0,
        scale: 0.7,
        duration: 0.3,
        ease: 'back.out(2)',
        stagger: 0.1
      });

      // Connecting line - draws left to right
      if (lineRef.current) {
        gsap.from(lineRef.current, {
          scrollTrigger: { trigger: '.s4-ranks', start: 'top 65%' },
          strokeDashoffset: 800,
          duration: 0.8,
          delay: 0.2,
          ease: 'power2.inOut'
        });
      }

      // "Your current rank" marker - lands on E node
      gsap.from('.current-rank-marker', {
        scrollTrigger: { trigger: '.s4-ranks', start: 'top 65%' },
        scale: 0,
        opacity: 0,
        duration: 0.4,
        delay: 1.0,
        ease: 'back.out(1.5)'
      });

      gsap.from('.current-rank-label', {
        scrollTrigger: { trigger: '.s4-ranks', start: 'top 65%' },
        opacity: 0,
        y: 10,
        duration: 0.3,
        delay: 1.2,
        ease: 'power2.out'
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={sectionRef} className="s4-ranks min-h-[80vh] bg-void flex flex-col items-center justify-center px-6 py-20">
      <div ref={trackRef} className="rank-track scroll-hidden max-w-5xl mx-auto w-full">
        <div className="relative">
          {/* SVG Connecting Line */}
          <svg className="absolute top-1/2 left-0 w-full h-8 -translate-y-1/2" style={{ height: '32px' }}>
            <line
              ref={lineRef}
              x1="0"
              y1="16"
              x2="100%"
              y2="16"
              stroke="var(--gold-dim)"
              strokeWidth="2"
              strokeDasharray="800"
              strokeDashoffset="800"
            />
          </svg>

          {/* Rank Nodes */}
          <div className="flex justify-between items-center relative z-10">
            {ranks.map((rank, index) => (
              <div key={index} className="rank-node scroll-hidden flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-3 ${getRankColor(rank.rank)}`}>
                  <span className="font-display font-bold">{rank.rank}</span>
                </div>
                <div className="text-center max-w-[100px]">
                  <p className="text-sm font-display text-text-primary mb-1">{rank.label}</p>
                  <p className="text-xs font-system text-text-muted">{rank.description}</p>
                </div>
                
                {/* Current rank marker on E */}
                {rank.rank === 'E' && (
                  <>
                    <div className="current-rank-marker absolute -bottom-2 w-3 h-3 bg-gold-primary rounded-full shadow-[0_0_10px_rgba(201,168,76,0.5)]" />
                    <div className="current-rank-label absolute -bottom-8 text-xs font-system text-text-muted">
                      YOUR CURRENT RANK
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionRankLadder;
