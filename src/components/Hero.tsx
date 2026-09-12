import { useEffect, useRef, Suspense } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useNavigate } from 'react-router-dom';
import { ThreeScene } from './ThreeScene';
import './Hero.css';

gsap.registerPlugin(ScrollTrigger);

export const Hero = () => {
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tl = gsap.timeline({ delay: 0.3 });
    tl.fromTo(badgeRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
      .fromTo(headingRef.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.3')
      .fromTo(subRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.4')
      .fromTo(ctaRef.current, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }, '-=0.3');

    gsap.to(ctaRef.current, {
      boxShadow: '0 0 30px rgba(124, 110, 240, 0.8), 0 0 60px rgba(45, 212, 191, 0.4)',
      repeat: -1,
      yoyo: true,
      duration: 2,
      ease: 'sine.inOut',
      delay: 1.5,
    });
  }, []);

  return (
    <section className="relative w-full h-[100vh] flex flex-col items-center justify-center overflow-hidden bg-[#08090C]">
      <Suspense fallback={null}>
        <ThreeScene />
      </Suspense>

      {/* Radial vignette overlay */}
      <div className="absolute inset-0 bg-radial-vignette z-[1] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl mx-auto">
        <div ref={badgeRef} className="mb-6 px-4 py-1.5 border border-violet-gate/50 bg-violet-gate/10 rounded-full text-xs font-system text-text-system tracking-widest uppercase">
          [System: Awakening Protocol Initiated]
        </div>

        <h1
          ref={headingRef}
          className="font-display text-5xl md:text-7xl lg:text-8xl mb-6 leading-none tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #fff 30%, #a594f5 60%, #2dd4bf 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          SOLO QUEST
        </h1>

        <p ref={subRef} className="text-text-secondary text-lg md:text-xl mb-10 max-w-xl leading-relaxed font-system">
          You are the hunter. Every task is a boss fight. Every day is a dungeon to clear.
          <span className="block mt-2 text-text-muted text-sm">The System does not forgive idle hunters.</span>
        </p>

        <button
          ref={ctaRef}
          onClick={() => navigate('/auth')}
          className="relative group px-10 py-4 font-display text-sm tracking-widest uppercase text-void rounded-sm overflow-hidden transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #7c6ef0, #2dd4bf)',
          }}
        >
          <span className="relative z-10">Enter the Gate</span>
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200" />
        </button>

        <p className="mt-6 text-xs text-text-muted font-system tracking-wider">
          ↓ Scroll to witness the System
        </p>
      </div>
    </section>
  );
};
