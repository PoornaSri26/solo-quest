import React, { useEffect } from 'react';
import Tilt from 'react-parallax-tilt';
import { HunterStatusBar } from './HunterStatusBar';
import QuestCard from './QuestCard';
import GatesList from './GatesList';
import QuickCapture from './QuickCapture';
import { DailyDungeon } from './DailyDungeon';
import { GateInscription } from '../sections/GateInscription';
import { StatDashboard } from '../sections/StatDashboard';
import { QuestLog } from '../sections/QuestLog';
import { LoreCompendium } from '../sections/LoreCompendium';
import { Leaderboard } from '../sections/Leaderboard';
import { Forge } from '../sections/Forge';
import ResourceActions from './ResourceActions';
import { useStore } from '../store/useStore';

const Dashboard: React.FC = () => {
  const {
    activeQuests,
    fetchHunter,
    fetchStats,
    fetchQuests,
    fetchGates,
    deleteQuest,
  } = useStore();

  useEffect(() => {
    // Initialize demo data on mount
    fetchHunter();
    fetchStats();
    fetchQuests();
    fetchGates();
  }, [fetchHunter, fetchStats, fetchQuests, fetchGates]);

  // Helper to calculate rank numeric value for threat score
  const getRankValue = (rank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S'): number => {
    switch (rank) {
      case 'S': return 6;
      case 'A': return 5;
      case 'B': return 4;
      case 'C': return 3;
      case 'D': return 2;
      case 'E': return 1;
      default: return 1;
    }
  };

  // Helper to calculate hours remaining until deadline
  const getHoursRemaining = (deadline: string | null | undefined): number => {
    if (!deadline) return 999;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursRemaining = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return Math.max(0, hoursRemaining);
  };

  // Calculate threat score: rank × hours_remaining (lower hours = higher threat)
  const getThreatScore = (quest: any): number => {
    const rankValue = getRankValue(quest.rank);
    const hoursRemaining = getHoursRemaining(quest.deadline);
    const urgencyScore = Math.max(1, 100 - hoursRemaining);
    return rankValue * urgencyScore;
  };

  // Sort quests by threat score (highest threat first)
  const sortedActiveQuests = [...activeQuests].sort((a, b) => {
    const threatA = getThreatScore(a);
    const threatB = getThreatScore(b);
    return threatB - threatA;
  });

  // Check for idle state (no active quests and past noon)
  const isIdleState = sortedActiveQuests.length === 0 && new Date().getHours() >= 12;

  return (
    <main className={`flex-1 p-6 overflow-y-auto ${isIdleState ? 'opacity-75' : ''}`}>
      {/* Hunter Status Bar */}
      <HunterStatusBar />

      {/* Idle State Warning */}
      {isIdleState && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="font-system text-text-system bg-surface border-l-4 border-gold-primary border-r-0 border-t-0 border-b-0 px-6 py-4 mb-6">
            [System: No active quests. The Shadow stirs.]
          </div>
          <button
            onClick={() => {/* Open quest creation modal */}}
            className="px-4 py-2 bg-gold-primary text-void hover:bg-gold-primary/90 rounded-sm transition-fast font-display"
          >
            Register a quest
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className={`grid gap-6 lg:grid-cols-3 mt-6 ${isIdleState ? 'hidden' : ''}`}>
        {/* Daily Dungeon Card */}
        <Tilt tiltMaxAngleX={3} tiltMaxAngleY={3} transitionSpeed={600} className="lg:col-span-2">
        <section
          className="h-full bg-gradient-to-br from-surface to-raised border border-border-subtle rounded-md p-6 hover:border-violet-gate/50 transition-all duration-300"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)' }}
        >
          <h2 className="mb-4 text-lg font-display flex items-center gap-3 text-text-primary">
            <span className="text-xl">⛏️</span>
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #C9A84C, #fff)' }}>Daily Dungeon</span>
          </h2>
          <DailyDungeon />
        </section>
        </Tilt>

        {/* Active Quests */}
        <Tilt tiltMaxAngleX={3} tiltMaxAngleY={3} transitionSpeed={600}>
        <section
          className="h-full bg-gradient-to-br from-surface to-raised border border-border-subtle rounded-md p-6 hover:border-crimson/40 transition-all duration-300"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)' }}
        >
          <h2 className="mb-4 text-lg font-display flex items-center gap-3 text-text-primary">
            <span className="text-xl">⚔️</span>
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #c41e3a, #fff)' }}>Active Quests</span>
          </h2>
          <div className="space-y-3">
            {sortedActiveQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onDelete={deleteQuest}
              />
            ))}
            {sortedActiveQuests.length === 0 && (
              <p className="text-center text-text-muted py-8 text-sm">
                No active quests. Activate some from your Shadow Realm!
              </p>
            )}
          </div>
        </section>
        </Tilt>

        {/* Gates List */}
        <Tilt tiltMaxAngleX={3} tiltMaxAngleY={3} transitionSpeed={600} className="lg:col-span-2">
        <section
          className="h-full bg-gradient-to-br from-surface to-raised border border-border-subtle rounded-md p-6 hover:border-gold-primary/40 transition-all duration-300"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)' }}
        >
          <h2 className="mb-4 text-lg font-display flex items-center gap-3 text-text-primary">
            <span className="text-xl">🚪</span>
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #C9A84C, #fff)' }}>Gates (Projects)</span>
          </h2>
          <GatesList />
        </section>
        </Tilt>

        {/* Hunter Stats Preview */}
        <Tilt tiltMaxAngleX={3} tiltMaxAngleY={3} transitionSpeed={600}>
        <section
          className="h-full bg-gradient-to-br from-surface to-raised border border-border-subtle rounded-md p-6 hover:border-violet-gate/50 transition-all duration-300"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)' }}
        >
          <h2 className="mb-4 text-lg font-display flex items-center gap-3 text-text-primary">
            <span className="text-xl">📊</span>
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #a594f5, #fff)' }}>Quick Stats</span>
          </h2>
          <StatDashboard />
        </section>
        </Tilt>
      </div>

      {/* Additional Sections Grid */}
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <section className="bg-surface border border-border-subtle rounded-md p-6 hover:border-gold-dim transition-fast">
          <h2 className="mb-4 text-lg font-display text-text-primary">Quest Log</h2>
          <QuestLog />
        </section>

        <section className="bg-surface border border-border-subtle rounded-md p-6 hover:border-gold-dim transition-fast">
          <h2 className="mb-4 text-lg font-display text-text-primary">Resource Management</h2>
          <ResourceActions />
        </section>

        <section className="bg-surface border border-border-subtle rounded-md p-6 hover:border-gold-dim transition-fast">
          <h2 className="mb-4 text-lg font-display text-text-primary">Gate Inscription</h2>
          <GateInscription />
        </section>

        <section className="bg-surface border border-border-subtle rounded-md p-6 hover:border-gold-dim transition-fast">
          <h2 className="mb-4 text-lg font-display text-text-primary">Hall of Heroes</h2>
          <Leaderboard />
        </section>

        <section className="bg-surface border border-border-subtle rounded-md p-6 hover:border-gold-dim transition-fast">
          <h2 className="mb-4 text-lg font-display text-text-primary">Forge</h2>
          <Forge />
        </section>
      </div>

      {/* Lore Compendium - Full Width */}
      <section className="mt-6 bg-surface border border-border-subtle rounded-md p-6 hover:border-gold-dim transition-fast">
        <h2 className="mb-4 text-lg font-display text-text-primary">Lore Compendium</h2>
        <LoreCompendium />
      </section>

      {/* Quick Capture */}
      <QuickCapture />
    </main>
  );
};

export default Dashboard;