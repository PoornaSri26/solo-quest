import React, { useState, useEffect } from 'react';
import { Trophy, Target, Flame, Zap, Lock, Unlock } from 'lucide-react';
import { useStore } from '../store/useStore';

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  current: number;
  category: 'quests' | 'rank' | 'streak' | 'level';
  completed: boolean;
  reward: {
    xp: number;
    gold: number;
    special?: string;
  };
}

const MILESTONE_DATA: Omit<Milestone, 'current' | 'completed'>[] = [
  {
    id: 'first-quest',
    title: 'First Steps',
    description: 'Complete your first quest',
    icon: '🎯',
    requirement: 1,
    category: 'quests',
    reward: { xp: 50, gold: 25, special: 'Novice Badge' }
  },
  {
    id: 'ten-quests',
    title: 'Rising Hunter',
    description: 'Complete 10 quests',
    icon: '⚔️',
    requirement: 10,
    category: 'quests',
    reward: { xp: 200, gold: 100 }
  },
  {
    id: 'fifty-quests',
    title: 'Veteran Hunter',
    description: 'Complete 50 quests',
    icon: '🏆',
    requirement: 50,
    category: 'quests',
    reward: { xp: 1000, gold: 500, special: 'Veteran Badge' }
  },
  {
    id: 'rank-c',
    title: 'C-Rank Achieved',
    description: 'Reach C-Rank',
    icon: '🎖️',
    requirement: 3,
    category: 'rank',
    reward: { xp: 300, gold: 150 }
  },
  {
    id: 'rank-b',
    title: 'B-Rank Achieved',
    description: 'Reach B-Rank',
    icon: '🎖️',
    requirement: 4,
    category: 'rank',
    reward: { xp: 500, gold: 250 }
  },
  {
    id: 'seven-day-streak',
    title: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    requirement: 7,
    category: 'streak',
    reward: { xp: 350, gold: 175, special: 'Streak Badge' }
  },
  {
    id: 'thirty-day-streak',
    title: 'Month Master',
    description: 'Maintain a 30-day streak',
    icon: '🔥',
    requirement: 30,
    category: 'streak',
    reward: { xp: 1500, gold: 750, special: 'Master Badge' }
  },
  {
    id: 'level-five',
    title: 'Level 5',
    description: 'Reach level 5',
    icon: '⭐',
    requirement: 5,
    category: 'level',
    reward: { xp: 400, gold: 200 }
  },
  {
    id: 'level-ten',
    title: 'Level 10',
    description: 'Reach level 10',
    icon: '⭐',
    requirement: 10,
    category: 'level',
    reward: { xp: 1000, gold: 500, special: 'Elite Badge' }
  }
];

const MilestoneTracker: React.FC = () => {
  const { stats, completedQuests } = useStore();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    const rankValue = { E: 1, D: 2, C: 3, B: 4, A: 5, S: 6 };
    const currentRank = rankValue[stats?.rank as keyof typeof rankValue] || 1;

    const updatedMilestones = MILESTONE_DATA.map(milestone => {
      let current = 0;
      
      switch (milestone.category) {
        case 'quests':
          current = completedQuests.length;
          break;
        case 'rank':
          current = currentRank;
          break;
        case 'streak':
          current = stats?.streak || 0;
          break;
        case 'level':
          current = stats?.level || 0;
          break;
      }

      return {
        ...milestone,
        current,
        completed: current >= milestone.requirement
      };
    });

    setMilestones(updatedMilestones);
  }, [stats, completedQuests]);

  const getProgress = (current: number, requirement: number) => {
    return Math.min(100, (current / requirement) * 100);
  };

  const getCategoryIcon = (category: Milestone['category']) => {
    switch (category) {
      case 'quests': return <Target className="w-4 h-4" />;
      case 'rank': return <Trophy className="w-4 h-4" />;
      case 'streak': return <Flame className="w-4 h-4" />;
      case 'level': return <Zap className="w-4 h-4" />;
    }
  };

  const completedCount = milestones.filter(m => m.completed).length;
  const totalCount = milestones.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display text-text-primary">Milestone Tracker</h2>
        <div className="text-sm text-text-secondary">
          {completedCount}/{totalCount} Completed
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-raised border border-border-subtle rounded-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-secondary">Overall Progress</span>
          <span className="text-sm font-data text-gold-primary">
            {Math.round((completedCount / totalCount) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gold-dim rounded-sm h-2">
          <div 
            className="bg-gold-primary h-2 rounded-sm transition-all duration-500"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Milestones Grid */}
      <div className="grid gap-3 md:grid-cols-2">
        {milestones.map((milestone) => (
          <div
            key={milestone.id}
            onClick={() => setSelectedMilestone(milestone)}
            className={`
              bg-surface border rounded-sm p-4 cursor-pointer transition-fast
              ${milestone.completed 
                ? 'border-green-clear/30 bg-green-clear/5' 
                : 'border-border-subtle hover:border-gold-primary/30'
              }
            `}
            role="button"
            tabIndex={0}
            aria-label={`${milestone.title} - ${milestone.completed ? 'Completed' : 'In progress'}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setSelectedMilestone(milestone);
              }
            }}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl" aria-hidden="true">{milestone.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-medium text-sm ${milestone.completed ? 'text-green-clear' : 'text-text-primary'}`}>
                    {milestone.title}
                  </h3>
                  {milestone.completed ? (
                    <Unlock className="w-4 h-4 text-green-clear" aria-hidden="true" />
                  ) : (
                    <Lock className="w-4 h-4 text-text-muted" aria-hidden="true" />
                  )}
                </div>
                <p className="text-xs text-text-secondary mb-2">{milestone.description}</p>
                
                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-text-muted flex items-center gap-1">
                      {getCategoryIcon(milestone.category)}
                      <span className="capitalize">{milestone.category}</span>
                    </span>
                    <span className="text-text-secondary">
                      {milestone.current}/{milestone.requirement}
                    </span>
                  </div>
                  <div className="w-full bg-gold-dim rounded-sm h-1.5">
                    <div 
                      className={`h-1.5 rounded-sm transition-all duration-500 ${
                        milestone.completed ? 'bg-green-clear' : 'bg-gold-primary'
                      }`}
                      style={{ width: `${getProgress(milestone.current, milestone.requirement)}%` }}
                    />
                  </div>
                </div>

                {/* Rewards */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gold-primary font-data">+{milestone.reward.xp} XP</span>
                  <span className="text-gold-primary font-data">+{milestone.reward.gold}g</span>
                  {milestone.reward.special && (
                    <span className="text-violet-gate">{milestone.reward.special}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Milestone Detail Modal */}
      {selectedMilestone && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMilestone(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="milestone-detail-title"
        >
          <div 
            className="bg-surface border border-border-subtle rounded-sm p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="text-4xl" aria-hidden="true">{selectedMilestone.icon}</div>
              <div className="flex-1">
                <h3 
                  id="milestone-detail-title"
                  className={`text-xl font-display mb-2 ${selectedMilestone.completed ? 'text-green-clear' : 'text-text-primary'}`}
                >
                  {selectedMilestone.title}
                </h3>
                <p className="text-text-secondary mb-4">{selectedMilestone.description}</p>
                
                <div className="bg-raised border border-border-subtle rounded-sm p-4 mb-4">
                  <h4 className="text-sm font-display text-text-primary mb-2">Requirements</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-muted capitalize">{selectedMilestone.category}:</span>
                    <span className="font-data text-text-primary">
                      {selectedMilestone.current}/{selectedMilestone.requirement}
                    </span>
                  </div>
                  
                  <div className="mt-3 w-full bg-gold-dim rounded-sm h-2">
                    <div 
                      className={`h-2 rounded-sm ${
                        selectedMilestone.completed ? 'bg-green-clear' : 'bg-gold-primary'
                      }`}
                      style={{ width: `${getProgress(selectedMilestone.current, selectedMilestone.requirement)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-raised border border-border-subtle rounded-sm p-4">
                  <h4 className="text-sm font-display text-text-primary mb-2">Rewards</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gold-primary font-data">+{selectedMilestone.reward.xp} XP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gold-primary font-data">+{selectedMilestone.reward.gold} Gold</span>
                    </div>
                    {selectedMilestone.reward.special && (
                      <div className="flex items-center gap-2">
                        <span className="text-violet-gate">{selectedMilestone.reward.special}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedMilestone(null)}
              className="w-full py-2 bg-gold-primary text-void rounded-sm hover:bg-gold-primary/90 transition-fast"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MilestoneTracker;