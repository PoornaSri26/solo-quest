import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SectionLivePreview: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const expBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        document.querySelectorAll('.scroll-hidden').forEach(el => el.classList.add('visible'));
        return;
      }

      // System messages - fade in sequence as scroll progresses (scrubbed)
      gsap.from('.preview-system-line', {
        scrollTrigger: {
          trigger: '.s3-preview',
          start: 'top 80%',
          end: 'center 40%',
          scrub: 0.5
        },
        opacity: 0,
        x: -20,
        stagger: 0.15
      });

      // UI panels - materialise from opacity + slight scale (scrubbed)
      gsap.from('.preview-panel', {
        scrollTrigger: {
          trigger: '.s3-preview',
          start: 'top 60%',
          end: 'bottom 60%',
          scrub: 0.8
        },
        opacity: 0,
        scale: 0.96,
        y: 20,
        stagger: 0.08
      });

      // EXP bar fill - on scroll progress
      ScrollTrigger.create({
        trigger: '.s3-preview',
        start: 'top 60%',
        end: 'bottom 60%',
        onUpdate: (self) => {
          const pct = Math.round(self.progress * 72);
          if (expBarRef.current) {
            expBarRef.current.style.width = pct + '%';
          }
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const systemMessages = [
    '[System: HNT-0001 is clearing quests.]',
    '[System: EXP accumulating.]',
    '[System: Rank progression detected.]'
  ];

  return (
    <div ref={sectionRef} className="s3-preview min-h-[120vh] bg-void flex items-center px-6 py-20">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-5 gap-12">
        {/* System Messages Column */}
        <div className="md:col-span-2 space-y-6">
          {systemMessages.map((msg, index) => (
            <div key={index} className="preview-system-line scroll-hidden font-system text-text-system text-sm">
              {msg}
            </div>
          ))}
        </div>

        {/* App UI Preview */}
        <div className="md:col-span-3 space-y-4">
          {/* Daily Dungeon Card */}
          <div className="preview-panel scroll-hidden bg-surface border border-border-subtle rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-text-primary text-sm">DAILY DUNGEON</h3>
              <span className="text-xs font-data text-text-secondary">4/5</span>
            </div>
            <div className="w-full bg-gold-dim rounded-sm h-2">
              <div 
                ref={expBarRef}
                className="exp-bar-fill bg-gold-primary h-2 rounded-sm transition-slow"
                style={{ width: '0%' }}
              ></div>
            </div>
          </div>

          {/* Quest Cards */}
          <div className="preview-panel scroll-hidden bg-raised border border-border-subtle rounded-md p-4">
            <div className="flex items-start gap-3">
              <div className="px-2 py-1 rounded-sm border font-display tracking-wider text-xs bg-rank-s/20 border-rank-s text-rank-s">
                S
              </div>
              <div className="flex-1">
                <h4 className="font-display text-text-primary text-sm mb-1">Ship feature</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-data text-text-secondary">1h 42m left</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-crimson rounded-sm"></div>
                    <div className="w-2 h-2 bg-crimson rounded-sm"></div>
                    <div className="w-2 h-2 bg-crimson rounded-sm"></div>
                    <div className="w-2 h-2 bg-crimson rounded-sm"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="preview-panel scroll-hidden bg-raised border border-border-subtle rounded-md p-4">
            <div className="flex items-start gap-3">
              <div className="px-2 py-1 rounded-sm border font-display tracking-wider text-xs bg-rank-b/20 border-rank-b text-rank-b">
                B
              </div>
              <div className="flex-1">
                <h4 className="font-display text-text-primary text-sm mb-1">Write brief</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-data text-text-secondary">Tomorrow</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-crimson rounded-sm"></div>
                    <div className="w-2 h-2 bg-gold-dim rounded-sm"></div>
                    <div className="w-2 h-2 bg-gold-dim rounded-sm"></div>
                    <div className="w-2 h-2 bg-gold-dim rounded-sm"></div>
                    <div className="w-2 h-2 bg-gold-dim rounded-sm"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="preview-panel scroll-hidden bg-raised border border-border-subtle rounded-md p-4">
            <div className="flex items-start gap-3">
              <div className="px-2 py-1 rounded-sm border font-display tracking-wider text-xs bg-rank-c/20 border-rank-c text-rank-c">
                C
              </div>
              <div className="flex-1">
                <h4 className="font-display text-text-primary text-sm mb-1">Review PRs</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-data text-text-secondary">Today</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gold-primary rounded-sm"></div>
                    <div className="w-2 h-2 bg-gold-primary rounded-sm"></div>
                    <div className="w-2 h-2 bg-gold-dim rounded-sm"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionLivePreview;
