import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SectionBetrayal: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLDivElement>(null);
  const line2Ref = useRef<HTMLDivElement>(null);
  const line3Ref = useRef<HTMLDivElement>(null);
  const countersRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Check for reduced motion preference
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        document.querySelectorAll('.scroll-hidden').forEach(el => el.classList.add('visible'));
        return;
      }

      // Copy animation - Stab reveal
      gsap.from('.betrayal-line', {
        scrollTrigger: { trigger: '.s1-betrayal', start: 'top 75%' },
        x: -40,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.12
      });

      // Counter animation - Count up
      gsap.from('.counter-value', {
        scrollTrigger: { trigger: '.s1-betrayal', start: 'top 60%' },
        textContent: 0,
        duration: 1.8,
        delay: 0.3,
        ease: 'power1.out',
        snap: { textContent: 1 },
        stagger: 0.1,
        onUpdate: function() {
          this.targets()[0].innerHTML = Math.ceil(this.targets()[0].textContent).toLocaleString();
        }
      });

      // Divider line
      gsap.from('.betrayal-divider', {
        scrollTrigger: { trigger: '.s1-betrayal', start: 'top 60%' },
        scaleX: 0,
        transformOrigin: 'center',
        duration: 0.6,
        delay: 2.2,
        ease: 'power2.inOut'
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={sectionRef} className="s1-betrayal min-h-[80vh] bg-void flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-4xl mx-auto text-center">
        {/* Copy */}
        <div className="mb-16 space-y-4">
          <div ref={line1Ref} className="betrayal-line scroll-hidden text-3xl md:text-5xl font-display text-text-primary">
            Your to-do list
          </div>
          <div ref={line2Ref} className="betrayal-line scroll-hidden text-3xl md:text-5xl font-display text-text-primary">
            has no consequences.
          </div>
          <div ref={line3Ref} className="betrayal-line scroll-hidden text-3xl md:text-5xl font-display text-text-primary">
            This one does.
          </div>
        </div>

        {/* Counters */}
        <div ref={countersRef} className="grid grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="counter-value text-4xl md:text-5xl font-data text-gold-primary mb-2">12,847</div>
            <div className="text-sm font-system text-text-secondary">quests cleared</div>
          </div>
          <div className="text-center">
            <div className="counter-value text-4xl md:text-5xl font-data text-gold-primary mb-2">3.2M</div>
            <div className="text-sm font-system text-text-secondary">EXP earned</div>
          </div>
          <div className="text-center">
            <div className="counter-value text-4xl md:text-5xl font-data text-gold-primary mb-2">849</div>
            <div className="text-sm font-system text-text-secondary">hunters active</div>
          </div>
        </div>

        {/* Divider */}
        <div ref={dividerRef} className="betrayal-divider w-full h-px bg-gold-dim mx-auto max-w-md" />
      </div>
    </div>
  );
};

export default SectionBetrayal;
