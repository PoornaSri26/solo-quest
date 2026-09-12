import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useNavigate } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

const SectionRegistration: React.FC = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const borderRef = useRef<SVGRectElement>(null);
  const [promptText, setPromptText] = useState('');
  const [hunterName, setHunterName] = useState('');
  const [hunterID, setHunterID] = useState('');
  const [showGitHub, setShowGitHub] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        document.querySelectorAll('.scroll-hidden').forEach(el => el.classList.add('visible'));
        return;
      }

      // Input border - ignites on arrival
      if (borderRef.current) {
        gsap.to(borderRef.current, {
          scrollTrigger: { trigger: '.s6-register', start: 'top 60%' },
          strokeDashoffset: 0,
          duration: 0.5,
          ease: 'power2.inOut'
        });
      }

      // Input opacity
      gsap.to('.register-input', {
        scrollTrigger: { trigger: '.s6-register', start: 'top 60%' },
        opacity: 1,
        duration: 0.3,
        delay: 0.4
      });

      // Focus steal after input is visible
      setTimeout(() => {
        inputRef.current?.focus();
      }, 1200);
    }, sectionRef);

    // Typewriter effect for prompt
    const promptMsg = '> Choose your Hunter name: ';
    let charIndex = 0;
    
    const typePrompt = () => {
      if (charIndex < promptMsg.length) {
        setPromptText(prev => prev + promptMsg[charIndex]);
        charIndex++;
        setTimeout(typePrompt, 25);
      }
    };

    // Start typewriter when section enters viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && promptText === '') {
            setTimeout(typePrompt, 200);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      ctx.revert();
      observer.disconnect();
    };
  }, [promptText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && hunterName.trim()) {
      generateHunterID(hunterName);
    }
  };

  const generateHunterID = (_name: string) => {
    const digits = Math.floor(1000 + Math.random() * 9000);
    let currentDisplay = 'HNT-';
    let digitIndex = 0;
    
    const slotMachine = () => {
      if (digitIndex < 4) {
        const randomDigit = Math.floor(Math.random() * 10);
        currentDisplay = 'HNT-' + currentDisplay.slice(4) + randomDigit;
        setHunterID(currentDisplay);
        digitIndex++;
        setTimeout(slotMachine, 100);
      } else {
        setHunterID(`HNT-${digits}`);
        setTimeout(() => setShowGitHub(true), 500);
      }
    };
    
    slotMachine();
  };

  return (
    <div ref={sectionRef} className="s6-register min-h-[100vh] bg-void flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-md mx-auto w-full">
        {/* Prompt */}
        <div className="mb-8">
          <p className="font-system text-text-system text-lg">
            {promptText}
            <span className="cursor">█</span>
          </p>
        </div>

        {/* Input with SVG border */}
        <div className="relative mb-8">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ height: '56px' }}>
            <rect
              ref={borderRef}
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="none"
              stroke="var(--gold-primary)"
              strokeWidth="2"
              strokeDasharray="400"
              strokeDashoffset="400"
              rx="4"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={hunterName}
            onChange={(e) => setHunterName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="register-input w-full px-4 py-3 bg-transparent border-none outline-none text-text-primary font-display opacity-0"
            placeholder="Enter your Hunter name..."
          />
        </div>

        {/* Hunter ID Display */}
        {hunterID && (
          <div className="text-center mb-8">
            <p className="font-system text-text-system text-sm mb-2">
              [System: Hunter ID assigned.]
            </p>
            <p className="font-display text-gold-primary text-2xl">{hunterID}</p>
          </div>
        )}

        {/* GitHub Auth Button */}
        {showGitHub && (
          <div className="text-center">
            <button 
              onClick={() => navigate('/auth')}
              className="px-6 py-3 bg-surface border border-border-subtle text-text-primary font-display text-sm hover:border-gold-primary transition-fast rounded-sm"
            >
              [or continue with GitHub]
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="w-full h-px bg-gold-dim mt-12 mb-4" />
        
        <p className="text-center text-xs font-system text-text-muted">
          By registering, you accept the System's terms.
        </p>
      </div>
    </div>
  );
};

export default SectionRegistration;
