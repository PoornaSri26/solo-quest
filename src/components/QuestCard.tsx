import React from 'react';
import Tilt from 'react-parallax-tilt';
import { Trash2, Edit, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import { Quest, Gate } from '../shared/types';
import { useStore } from '../store/useStore';
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';

const isPastDate = (date: Date) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < now;
};

const QuestCard: React.FC<{
  quest: Quest;
  gate?: Gate;
  onDelete?: (id: string) => void;
}> = ({ quest, gate, onDelete }) => {
  const {
    completeQuest,
    failQuest,
    openEditQuestModal,
  } = useStore();

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete(quest.id);
    }
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';
      if (isYesterday(date)) return 'Yesterday';
      return format(date, 'PP');
    } catch {
      return dateString;
    }
  };

  const getPriorityClass = (rank: Quest['rank']) => {
    switch (rank) {
      case 'S': return 'bg-rank-s/20 text-rank-s border-rank-s';
      case 'A': return 'bg-rank-a/20 text-rank-a border-rank-a';
      case 'B': return 'bg-rank-b/20 text-rank-b border-rank-b';
      case 'C': return 'bg-rank-c/20 text-rank-c border-rank-c';
      case 'D': return 'bg-rank-d/20 text-rank-d border-rank-d';
      case 'E': return 'bg-rank-e/20 text-rank-e border-rank-e';
      default: return 'bg-rank-e/20 text-rank-e border-rank-e';
    }
  };

  const getStatusClass = (status: Quest['status']) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-clear/20 text-green-clear border-green-clear';
      case 'FAILED': return 'bg-crimson/20 text-crimson border-crimson';
      case 'IN_PROGRESS': return 'bg-rank-c/20 text-rank-c border-rank-c';
      case 'ACTIVE': return 'bg-rank-b/20 text-rank-b border-rank-b';
      case 'SHADOW': return 'bg-rank-e/20 text-rank-e border-rank-e';
      default: return 'bg-rank-e/20 text-rank-e border-rank-e';
    }
  };

  return (
    <Tilt
      tiltMaxAngleX={8}
      tiltMaxAngleY={8}
      glareEnable={true}
      glareMaxOpacity={0.15}
      glareColor="#a594f5"
      glarePosition="all"
      glareBorderRadius="4px"
      transitionSpeed={400}
      className="group w-full"
    >
    <div className="
      relative overflow-hidden
      bg-gradient-to-br from-surface to-raised
      border border-border-subtle
      rounded-md p-4
      hover:border-violet-gate/60
      transition-all duration-300
      before:absolute before:inset-0 before:rounded-md
      before:bg-gradient-to-br before:from-violet-gate/0 before:to-gold-primary/0
      before:hover:from-violet-gate/5 before:hover:to-gold-primary/5
      before:transition-all before:duration-300
    "
    style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)' }}
    >
      <div className="relative z-10 flex items-start gap-4">

        {/* Quest Status Badge */}
        <div className="flex-shrink-0 mt-1">
          <span className={`px-2 py-0.5 text-xs rounded-sm border font-display tracking-wider
            ${getStatusClass(quest.status)}
          `}>
            {quest.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Quest Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-text-primary line-clamp-1">
              {quest.title}
            </h3>
            <div className="flex items-center gap-2 text-xs">
              {/* Rank Badge */}
              <span className={`px-2 py-0.5 rounded-sm border font-display tracking-wider
                ${getPriorityClass(quest.rank)}
              `}>
                {quest.rank}
              </span>

              {/* Category */}
              <span className="bg-raised text-text-secondary px-2 py-0.5 rounded-sm">
                {quest.category}
              </span>

              {/* Gate if exists */}
              {gate && (
                <span className="bg-raised text-text-secondary px-2 py-0.5 rounded-sm text-xs">
                  {gate.name}
                </span>
              )}
            </div>
          </div>

          {quest.notes && (
            <p className="text-text-secondary text-sm mb-3 line-clamp-2">
              {quest.notes}
            </p>
          )}

          {/* Deadline */}
          {quest.deadline && (
            <div className="flex items-center gap-2 mb-3 text-xs">
              <Clock className="w-3 h-3 mr-1 text-text-secondary" />
              <span className={`font-data ${
                isToday(parseISO(quest.deadline))
                  ? 'text-gold-primary font-medium'
                  : isPastDate(parseISO(quest.deadline))
                    ? 'text-crimson font-medium'
                    : 'text-text-secondary'
              }`}>
                {formatDate(quest.deadline)}
              </span>
            </div>
          )}

          {/* Rewards */}
          <div className="flex items-center gap-3 mb-2 text-xs">
            <span className="font-data text-gold-primary">+{quest.expReward} XP</span>
            <span className="font-data text-gold-primary">+{quest.goldReward}g</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Complete Button */}
            {!['COMPLETED', 'FAILED', 'ARCHIVED'].includes(quest.status) && (
              <button
                onClick={() => completeQuest(quest.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-clear/20 text-green-clear hover:bg-green-clear/30 rounded-sm transition-fast"
              >
                <CheckCircle className="w-3 h-3" />
                Complete
              </button>
            )}

            {/* Fail Button */}
            {['ACTIVE', 'IN_PROGRESS'].includes(quest.status) && (
              <button
                onClick={() => failQuest(quest.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs border border-crimson text-crimson hover:bg-crimson/10 rounded-sm transition-fast"
              >
                <MessageSquare className="w-3 h-3" />
                Fail
              </button>
            )}

            {/* Edit Button */}
            {['ACTIVE', 'IN_PROGRESS', 'SHADOW'].includes(quest.status) && (
              <button
                onClick={() => openEditQuestModal(quest.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs border border-border-subtle text-text-secondary hover:bg-raised hover:text-text-primary rounded-sm transition-fast"
              >
                <Edit className="w-3 h-3" />
                Edit
              </button>
            )}

            {/* Delete Button */}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 px-2 py-1 text-xs border border-crimson text-crimson hover:bg-crimson/10 rounded-sm transition-fast"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar for in_progress quests */}
      {quest.status === 'IN_PROGRESS' && (
        <div className="mt-3 w-full bg-gold-dim rounded-sm h-1">
          <div className="bg-gold-primary h-1 rounded-sm transition-slow" style={{ width: '60%' }}></div>
        </div>
      )}
    </div>
    </Tilt>
  );
};

export default QuestCard;