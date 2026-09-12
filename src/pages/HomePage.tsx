import React, { useEffect } from 'react';
import { Hero } from '../components/Hero';
import { GateInscription } from '../sections/GateInscription';
import { StatDashboard } from '../sections/StatDashboard';
import { QuestLog } from '../sections/QuestLog';
import { DailyDungeon } from '../components/DailyDungeon';
import { LoreCompendium } from '../sections/LoreCompendium';
import { Leaderboard } from '../sections/Leaderboard';
import { Forge } from '../sections/Forge';
import { useStore } from '../store/useStore';

const HomePage: React.FC = () => {
  const isLoading = useStore((state) => state.isLoading);

  // Optional: add a global animation for sections (fade-in-up)
  useEffect(() => {
    const sections = document.querySelectorAll('.scroll-section');
    sections.forEach((section) => {
      // initial state
      (section as HTMLElement).style.opacity = '0';
      (section as HTMLElement).style.transform = 'translateY(20px)';
    });
    const animate = () => {
      const winHeight = window.innerHeight;
      sections.forEach((section) => {
        const rect = (section as HTMLElement).getBoundingClientRect();
        if (rect.top < winHeight * 0.75) {
          (section as HTMLElement).style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
          (section as HTMLElement).style.opacity = '1';
          (section as HTMLElement).style.transform = 'translateY(0)';
        }
      });
    };
    window.addEventListener('scroll', animate);
    animate(); // initial check
    return () => window.removeEventListener('scroll', animate);
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          <p className="mt-4 text-white text-lg">Loading your adventure...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Hero />
      <section className="scroll-section relative w-full flex flex-col items-center justify-center py-20 bg-[url('https://via.placeholder.com/1200x600/0a0a0c/111114?text=Gate+Inscription')] bg-center bg-cover">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 flex flex-col items-center gap-6 text-white">
          <h2 className="text-3xl font-display mb-4">Gate Inscription</h2>
          <GateInscription />
        </div>
      </section>

      <section className="scroll-section relative w-full flex flex-col items-center justify-center py-20 bg-[url('https://via.placeholder.com/1200x600/0a0a0c/111114?text=Stats')] bg-center bg-cover">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 flex flex-col items-center gap-8 text-white">
          <h2 className="text-3xl font-display mb-4">Hunter's Vital Stats</h2>
          <StatDashboard />
        </div>
      </section>

      <section className="scroll-section relative w-full flex flex-col items-center justify-center py-20 bg-[url('https://via.placeholder.com/1200x600/0a0a0c/111114?text=Quest+Log')] bg-center bg-cover">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 flex flex-col items-center gap-6 text-white w-full max-w-2xl">
          <h2 className="text-3xl font-display mb-4">Active Quests</h2>
          <QuestLog />
        </div>
      </section>

      <section className="scroll-section relative w-full flex flex-col items-center justify-center py-20 bg-[url('https://via.placeholder.com/1200x600/0a0a0c/111114?text=Daily+Dungeon')] bg-center bg-cover">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 flex flex-col items-center gap-6 text-white">
          <DailyDungeon />
        </div>
      </section>

      <section className="scroll-section relative w-full flex flex-col items-center justify-center py-20 bg-[url('https://via.placeholder.com/1200x600/0a0a0c/111114?text=Lore')] bg-center bg-cover">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 flex flex-col items-center gap-6 text-white w-full max-w-3xl">
          <h2 className="text-3xl font-display mb-4">Lore Compendium</h2>
          <LoreCompendium />
        </div>
      </section>

      <section className="scroll-section relative w-full flex flex-col items-center justify-center py-20 bg-[url('https://via.placeholder.com/1200x600/0a0a0c/111114?text=Leaderboard')] bg-center bg-cover">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 flex flex-col items-center gap-6 text-white w-full max-w-2xl">
          <h2 className="text-3xl font-display mb-4">Hall of Heroes</h2>
          <Leaderboard />
        </div>
      </section>

      <section className="scroll-section relative w-full flex flex-col items-center justify-center py-20 bg-[url('https://via.placeholder.com/1200x600/0a0a0c/111114?text=Forge')] bg-center bg-cover">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 flex flex-col items-center gap-6 text-white max-w-xl">
          <h2 className="text-3xl font-display mb-4">Forge</h2>
          <Forge />
        </div>
      </section>

      <footer className="relative w-full flex flex-col items-center justify-center py-12 bg-[url('https://via.placeholder.com/1200x200/0a0a0c/111114?text=Footer')] bg-center bg-cover">
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 flex flex-col items-center gap-4 text-center text-text-primary">
          <p className="text-lg font-display">Solo Quest</p>
          <p className="text-sm text-text-muted">
            © 2025 Poorna Sri Nandyala. All rights reserved.
          </p>
          <div className="flex items-center space-x-4">
            <a href="#" className="hover:underline">
              GitHub
            </a>
            <a href="#" className="hover:underline">
              Twitter
            </a>
            <a href="#" className="hover:underline">
              Discord
            </a>
            <button
              onClick={() => {
                const html = document.documentElement;
                const isDark = html.classList.toggle('dark');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
              }}
              className="px-3 py-1 rounded hover:bg-white/10 transition-colors"
              aria-label="Toggle dark/light theme"
            >
              {document.documentElement.classList.contains('dark') ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </footer>
    </>
  );
};

export default HomePage;