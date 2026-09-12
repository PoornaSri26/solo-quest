import React from 'react';
import { getRankEmoji } from './utils';
import { calculateLevelAndProgress } from '../shared/game-logic';
import { useStore } from '../store/useStore';

export const HunterStatusBar: React.FC = () => {
  const hunter = useStore((s) => s.hunter);
  const stats = useStore((s) => s.stats);

  if (!hunter || !stats) {
    return (
      <div className="flex items-center justify-between mb-6 p-4 bg-surface border border-border-subtle rounded-md animate-pulse">
        <div className="h-6 bg-raised rounded-sm w-32" />
        <div className="flex gap-4">
          <div className="h-6 bg-raised rounded-sm w-16" />
          <div className="h-6 bg-raised rounded-sm w-16" />
        </div>
      </div>
    );
  }

  const { level: calculatedLevel, progressPercent } = calculateLevelAndProgress(stats.exp);

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'S': return 'text-rank-s';
      case 'A': return 'text-rank-a';
      case 'B': return 'text-rank-b';
      case 'C': return 'text-rank-c';
      case 'D': return 'text-rank-d';
      case 'E': return 'text-rank-e';
      default: return 'text-rank-e';
    }
  };

  const hpPercent = (stats.hp / stats.hpMax) * 100;
  const isCritical = hpPercent < 30;

  return (
    <div className="flex items-center justify-between mb-6 p-4 bg-surface border border-border-subtle rounded-md">
      <div className="flex-1">
        <p className="text-xs text-text-secondary mb-1">Hunter</p>
        <p className="text-xl font-display text-text-primary">{hunter.displayName}</p>
        <p className="text-xs font-data text-text-muted">{hunter.hunterId}</p>
      </div>
      <div className="flex items-center space-x-6">
        <div className="text-center">
          <p className="text-xs text-text-secondary mb-1">Rank</p>
          <p className={`text-lg font-display ${getRankColor(stats.rank)}`}>{getRankEmoji(stats.rank)} {stats.rank}</p>
        </div>
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-raised flex items-center justify-center border border-border-subtle">
            <div className="w-16 h-16 rounded-full bg-gold-dim flex items-center justify-center border-2 border-gold-primary">
              <span className="font-data text-gold-primary font-medium">{Math.round(progressPercent)}%</span>
            </div>
          </div>
          <p className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs font-data text-text-secondary">
            LVL {calculatedLevel}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-text-secondary mb-1">HP</p>
          <div className="flex gap-1 mt-1">
            {Array.from({ length: 10 }).map((_, i) => {
              const pipValue = (i + 1) * (stats.hpMax / 10);
              const isActive = stats.hp >= pipValue;
              const isCriticalPip = i < 3 && isCritical;
              
              return (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-sm transition-slow ${
                    isActive 
                      ? isCriticalPip 
                        ? 'bg-crimson-glow animate-pulse' 
                        : 'bg-crimson' 
                      : 'bg-gold-dim'
                  }`}
                />
              );
            })}
          </div>
          <p className={`text-xs font-data mt-1 ${isCritical ? 'text-crimson-glow' : 'text-text-secondary'}`}>{stats.hp}/{stats.hpMax} HP</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-secondary mb-1">Streak</p>
          <p className="text-lg font-display text-gold-primary">{stats.streak} 🔥</p>
        </div>
      </div>
    </div>
  );
};
