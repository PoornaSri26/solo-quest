import React from 'react';
import { Clock, Zap, CheckCircle2, Circle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ProgressBar } from './ui/ProgressBar';
import { Button } from './ui/Button';
import { sound } from '../lib/sound';

const DailyDungeonComponent: React.FC = () => {
  const {
    dungeon,
    dungeonTasks,
    toggleDungeonTask,
    markDungeonComplete,
  } = useStore();

  const completedCount = dungeonTasks.filter(t => t.completed).length;
  const totalTasks = dungeonTasks.length;
  const progressPercent = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
  const isCleared = completedCount === totalTasks && totalTasks > 0;

  const handleTaskToggle = (id: string) => {
    sound.play('click');
    toggleDungeonTask(id);
  };

  const handleComplete = () => {
    sound.play('quest_complete');
    markDungeonComplete();
    window.dispatchEvent(new CustomEvent('solo-quest:dopamine', {
      detail: {
        type: 'mastery',
        message: '⚔️ DAILY DUNGEON CLEARED!',
        value: 100,
      }
    }));
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'S': return 'text-amber-400 border-amber-500/40 bg-amber-500/10 font-bold';
      case 'A': return 'text-rose-400 border-rose-500/40 bg-rose-500/10 font-bold';
      case 'B': return 'text-purple-400 border-purple-500/40 bg-purple-500/10 font-bold';
      case 'C': return 'text-sky-400 border-sky-500/40 bg-sky-500/10 font-bold';
      case 'D': return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10 font-medium';
      case 'E': return 'text-slate-400 border-slate-500/40 bg-slate-500/10 font-medium';
      default: return 'text-slate-400 border-slate-500/40 bg-slate-500/10';
    }
  };

  const shiftIcon = () => {
    switch (dungeon?.shift?.toUpperCase()) {
      case 'MORNING': return <Clock className="w-4 h-4 mr-1 text-amber-400" />;
      case 'AFTERNOON': return <Clock className="w-4 h-4 mr-1 text-sky-400" />;
      case 'NIGHT': return <Clock className="w-4 h-4 mr-1 text-purple-400" />;
      case 'ALL_DAY': return <Zap className="w-4 h-4 mr-1 text-cyan-400" />;
      default: return <Clock className="w-4 h-4 mr-1 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {shiftIcon()}
          <span className="text-sm font-display font-bold text-white tracking-wide">
            {dungeon?.name || 'Daily Dungeon Trial'}
          </span>
        </div>
        <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
          {completedCount}/{totalTasks} Cleared
        </span>
      </div>

      <div className="w-full space-y-3">
        <ProgressBar value={progressPercent} variant="green" size="sm" />
        
        <div className="space-y-2 pt-1">
          {dungeonTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleTaskToggle(task.id)}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                task.completed
                  ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300/70'
                  : 'bg-black/30 border-white/5 hover:border-white/20 text-white'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {task.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-scale-up" />
                ) : (
                  <Circle className="w-4 h-4 text-text-muted flex-shrink-0" />
                )}
                <span className={`text-sm truncate ${task.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                  {task.title}
                </span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border tracking-wider ml-2 ${getRankColor(task.rank)}`}>
                {task.rank}
              </span>
            </div>
          ))}
          {dungeonTasks.length === 0 && (
            <p className="text-xs text-text-muted font-mono text-center py-4">No daily trials assigned for this shift.</p>
          )}
        </div>

        {dungeonTasks.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              onClick={handleComplete}
              disabled={isCleared}
              variant={isCleared ? 'ghost' : 'primary'}
              size="sm"
            >
              {isCleared ? '✓ Dungeon Cleared' : 'Complete Dungeon'}
            </Button>
            <span className={`text-xs font-mono font-medium ${
              isCleared
                ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                : completedCount === totalTasks - 1
                ? 'text-amber-400'
                : 'text-text-secondary'
            }`}>
              {isCleared
                ? '★ Daily Trial Complete!'
                : completedCount === totalTasks - 1
                ? '1 task to clear!'
                : `${totalTasks - completedCount} tasks remaining`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const DailyDungeon = DailyDungeonComponent;
export default DailyDungeonComponent;