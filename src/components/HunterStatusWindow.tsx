import React from 'react';
import { useStore } from '../store/useStore';
import { Heart, Zap, Target, TrendingUp } from 'lucide-react';

export default function HunterStatusWindow() {
  const { stats } = useStore();

  if (!stats) return null;

  const { level, hp, hpMax, exp, expToNext, rank, gold, streak } = stats;

  const hpPercent = (hp / hpMax) * 100;
  const expPercent = (exp / expToNext) * 100;

  const rankColors = {
    E: '#777777',
    D: '#556b2f',
    C: '#1e90ff',
    B: '#8b008b',
    A: '#b8860b',
    S: '#daa520',
  };

  const rankColor = rankColors[rank as keyof typeof rankColors] || '#777777';

  return (
    <div className="hunter-status-window">
      <div className="status-card">
        <div className="status-header">
          <div className="rank-badge" style={{ backgroundColor: rankColor, boxShadow: `0 0 12px ${rankColor}40` }}>
            <span className="rank-text">{rank}</span>
          </div>
          <div className="level-display">
            <span className="level-label">LVL</span>
            <span className="level-value">{level}</span>
          </div>
        </div>

        <div className="status-bars">
          <div className="stat-bar">
            <div className="stat-icon">
              <Heart size={16} className="text-red-500" />
            </div>
            <div className="bar-container">
              <div className="bar-fill hp-bar" style={{ width: `${hpPercent}%` }} />
            </div>
            <span className="stat-value">{hp}/{hpMax}</span>
          </div>

          <div className="stat-bar">
            <div className="stat-icon">
              <Zap size={16} className="text-yellow-500" />
            </div>
            <div className="bar-container">
              <div className="bar-fill exp-bar" style={{ width: `${expPercent}%` }} />
            </div>
            <span className="stat-value">{exp}/{expToNext}</span>
          </div>
        </div>

        <div className="status-footer">
          <div className="footer-stat">
            <Target size={14} className="text-yellow-500" />
            <span>{gold} G</span>
          </div>
          <div className="footer-stat">
            <TrendingUp size={14} className="text-blue-500" />
            <span>{streak} 🔥</span>
          </div>
        </div>
      </div>
    </div>
  );
}