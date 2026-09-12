import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SectionConsequence: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const warningRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const [warningText, setWarningText] = useState('');
  const [showNote, setShowNote] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        document.querySelectorAll('.scroll-hidden').forEach(el => el.classList.add('visible'));
        return;
      }

      // HP pips - drain on scroll scrub
      const pips = document.querySelectorAll('.hp-pip');
      
      ScrollTrigger.create({
        trigger: '.s5-consequence',
        start: 'top 60%',
        end: 'bottom 60%',
        scrub: true,
        onUpdate: (self) => {
          const darkCount = Math.floor(self.progress * 4); // drain 4 pips over scroll
          pips.forEach((pip, i) => {
            const pipEl = pip as HTMLElement;
            const isDark = i >= (pips.length - darkCount);
            pipEl.style.background = isDark ? '#1E2433' : '#C0392B';
          });
          
          // At 3 remaining: trigger critical pulse
          if (darkCount >= 7) {
            document.querySelector('.hp-bar')?.classList.add('critical');
          }
        }
      });

      // Second System message - fades in at 70% scroll through section
      gsap.from('.consequence-note', {
        scrollTrigger: {
          trigger: '.s5-consequence',
          start: '70% 60%'
        },
        opacity: 0,
        duration: 0.6
      });
    }, sectionRef);

    // Typewriter effect for warning
    const warningMsg = '[System: Three quests missed. HP draining.]';
    let charIndex = 0;
    
    const typeWarning = () => {
      if (charIndex < warningMsg.length) {
        setWarningText(prev => prev + warningMsg[charIndex]);
        charIndex++;
        setTimeout(typeWarning, 40);
      }
    };

    // Start typewriter when section enters viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && warningText === '') {
            setTimeout(typeWarning, 300);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    // Show note after delay
    setTimeout(() => {
      setShowNote(true);
    }, 3000);

    return () => {
      ctx.revert();
      observer.disconnect();
    };
  }, [warningText]);

  return (
    <div ref={sectionRef} className="s5-consequence min-h-[100vh] bg-void flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-2xl mx-auto text-center">
        {/* System Warning */}
        <div ref={warningRef} className="mb-12">
          <p className="font-system text-text-system text-lg leading-relaxed">
            {warningText}
            <span className="cursor">█</span>
          </p>
        </div>

        {/* HP Bar */}
        <div className="hp-bar mb-8">
          <div className="flex justify-center gap-2 mb-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="hp-pip w-4 h-4 rounded-sm transition-slow"
                style={{ background: '#C0392B' }}
              />
            ))}
          </div>
          <p className="font-data text-text-secondary text-sm">HP: 70/100</p>
        </div>

        {/* Consequence Note */}
        {showNote && (
          <div ref={noteRef} className="consequence-note mt-12">
            <p className="font-system text-text-system text-sm leading-relaxed">
              [System: At zero HP, the Hunter enters exhaustion.
              <br />
              A recovery quest will be assigned.]
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionConsequence;
