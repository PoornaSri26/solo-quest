import React from 'react';
import { getRankEmoji } from './utils';
import { calculateLevelAndProgress } from '../shared/game-logic';
import { useStore } from '../store/useStore';
import { Flame, Shield, Sparkles } from 'lucide-react';

export const HunterStatusBar: React.FC = () => {
  const hunter = useStore((s) => s.hunter);
  const stats = useStore((s) => s.stats);

  if (!hunter || !stats) {
    return (
      <div className="flex items-center justify-between mb-6 p-5 hud-panel rounded-xl animate-pulse">
        <div className="h-6 bg-raised rounded-md w-36" />
        <div className="flex gap-4">
          <div className="h-6 bg-raised rounded-md w-20" />
          <div className="h-6 bg-raised rounded-md w-20" />
        </div>
      </div>
    );
  }

  const { level: calculatedLevel, progressPercent } = calculateLevelAndProgress(stats.exp);

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'S': return 'text-amber-400 font-extrabold drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]';
      case 'A': return 'text-rose-400 font-bold drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]';
      case 'B': return 'text-purple-400 font-bold drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]';
      case 'C': return 'text-sky-400 font-bold drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]';
      case 'D': return 'text-emerald-400 font-bold';
      case 'E': return 'text-slate-400 font-medium';
      default: return 'text-slate-400';
    }
  };

  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.hpMax) * 100));
  const isCritical = hpPercent < 30;

  // SVG Progress Ring calculations
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className={`relative mb-6 p-5 hud-panel rounded-xl border ${stats.rank ? `rank-glow-${stats.rank}` : 'border-white/10'} shadow-2xl overflow-hidden`}>
      {/* Background Holographic Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
        {/* Hunter Identity & Title */}
        <div className="flex items-center gap-4 min-w-[200px]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-widest uppercase font-mono text-cyan-400/80 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                Active Hunter
              </span>
              <span className="text-xs font-mono text-text-muted">#{hunter.hunterId?.slice(-6) || 'SYS-01'}</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-white tracking-wide flex items-center gap-2">
              {hunter.displayName}
              {stats.rank === 'S' && <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />}
            </h1>
            <p className="text-xs text-text-secondary flex items-center gap-2 font-mono">
              <Shield className="w-3.5 h-3.5 text-text-muted" />
              Designation: <span className="text-white font-medium">Awakened Hunter</span>
            </p>
          </div>
        </div>

        {/* Level Circular Meter */}
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              {/* Background circle */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-white/10"
                strokeWidth="5"
                fill="transparent"
              />
              {/* Animated Progress circle */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-amber-400 transition-all duration-1000 ease-out"
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-text-muted uppercase font-mono tracking-tighter">LVL</span>
              <span className="text-xl font-bold font-display text-white">{calculatedLevel}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono text-text-muted">EXP PROGRESS</div>
            <div className="text-sm font-bold font-data text-amber-400">{Math.round(progressPercent)}%</div>
            <div className="text-[11px] text-text-secondary font-mono">{stats.exp} Total EXP</div>
          </div>
        </div>

        {/* Vital Gauges: HP & Gold */}
        <div className="flex-1 min-w-[220px] max-w-sm space-y-3">
          {/* Health Gauge */}
          <div>
            <div className="flex justify-between items-center text-xs font-mono mb-1">
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                HP
              </span>
              <span className={`font-bold ${isCritical ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                {stats.hp} / {stats.hpMax}
              </span>
            </div>
            <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCritical 
                    ? 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.7)]' 
                    : 'bg-gradient-to-r from-red-500 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Gold Vault */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-sm">🪙</span>
              <span className="text-xs font-mono text-text-secondary">Gold Vault</span>
            </div>
            <span className="text-sm font-bold font-data text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
              {stats.gold.toLocaleString()} G
            </span>
          </div>
        </div>

        {/* Rank & Streak Display */}
        <div className="flex items-center gap-6 border-l border-white/10 pl-6">
          <div className="text-center">
            <p className="text-[11px] font-mono text-text-muted uppercase tracking-wider mb-1">Rank</p>
            <p className={`text-2xl font-display flex items-center justify-center gap-1.5 ${getRankColor(stats.rank)}`}>
              <span>{getRankEmoji(stats.rank)}</span>
              <span>{stats.rank}</span>
            </p>
          </div>

          <div className="text-center">
            <p className="text-[11px] font-mono text-text-muted uppercase tracking-wider mb-1">Streak</p>
            <p className="text-2xl font-display font-extrabold text-amber-400 flex items-center justify-center gap-1 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
              <Flame className="w-5 h-5 text-orange-500 animate-bounce" />
              <span>{stats.streak}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
