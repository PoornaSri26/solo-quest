import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface LawCard {
  rank: 'E' | 'D' | 'S';
  title: string;
  description: string;
  detail: string;
}

const laws: LawCard[] = [
  {
    rank: 'E',
    title: 'Complete a quest.',
    description: 'Every task you finish earns EXP.',
    detail: '[System: Quest completion is the fundamental unit of progression. Small wins compound over time.]'
  },
  {
    rank: 'D',
    title: 'Miss a deadline, lose HP.',
    description: 'Time pressure is real here.',
    detail: '[System: Quest failure is a mechanical event, not a metaphor. HP drains at midnight.]'
  },
  {
    rank: 'S',
    title: 'The System does not forgive.',
    description: 'Your record is permanent.',
    detail: '[System: Collapsed gates remain visible. Missed deadlines leave marks. The System remembers.]'
  }
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

const SectionThreeLaws: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        document.querySelectorAll('.scroll-hidden').forEach(el => el.classList.add('visible'));
        return;
      }

      // Card drop - staggered fall
      gsap.from('.law-card', {
        scrollTrigger: { trigger: '.s2-laws', start: 'top 70%' },
        y: -60,
        opacity: 0,
        duration: 0.45,
        ease: 'back.out(1.2)',
        stagger: {
          each: 0.2,
          onComplete: function(this: any) {
            const card = this.targets()[0] as HTMLElement;
            const badge = card.querySelector('.rank-badge');
            if (badge) {
              badge.classList.add('pulse-once');
            }
          }
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleCardClick = (index: number) => {
    const isExpanding = expandedCard !== index;
    setExpandedCard(isExpanding ? index : null);

    if (isExpanding) {
      const card = document.querySelectorAll('.law-card')[index];
      const detail = card.querySelector('.law-detail');
      
      if (detail) {
        gsap.to(card, { height: 'auto', duration: 0.35, ease: 'power2.out' });
        gsap.to(detail, { 
          opacity: 1, 
          y: 0, 
          duration: 0.3, 
          delay: 0.15,
          onStart: () => {
            detail.classList.remove('hidden');
          }
        });
      }
    } else {
      const card = document.querySelectorAll('.law-card')[index];
      const detail = card.querySelector('.law-detail');
      
      if (detail) {
        gsap.to(detail, { 
          opacity: 0, 
          y: 10, 
          duration: 0.2,
          onComplete: () => {
            detail.classList.add('hidden');
            gsap.set(card, { height: 'auto' });
          }
        });
      }
    }
  };

  return (
    <div ref={sectionRef} className="s2-laws min-h-[100vh] bg-void flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {laws.map((law, index) => (
            <div
              key={index}
              className={`law-card scroll-hidden bg-surface border border-border-subtle rounded-md p-6 cursor-pointer transition-fast hover:border-gold-dim ${
                expandedCard === index ? 'border-gold-primary' : ''
              }`}
              onClick={() => handleCardClick(index)}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`rank-badge px-3 py-1 rounded-sm border font-display tracking-wider text-sm ${getRankColor(law.rank)}`}>
                  {law.rank}
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-text-primary text-lg mb-2">{law.title}</h3>
                  <p className="text-sm text-text-secondary">{law.description}</p>
                </div>
              </div>
              
              <div className="law-detail hidden opacity-0 translate-y-2">
                <div className="pt-4 border-t border-border-subtle">
                  <p className="font-system text-text-system text-xs leading-relaxed">
                    {law.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectionThreeLaws;
