import { Clock, Zap } from 'lucide-react';
import type { DungeonTask } from '../shared/types';
import { useStore } from '../store/useStore';

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

  // Determine shift icon
  const shiftIcon = () => {
    switch (dungeon?.shift?.toUpperCase()) {
      case 'MORNING': return <Clock className="w-4 h-4 mr-1" />;
      case 'AFTERNOON': return <Clock className="w-4 h-4 mr-1" />;
      case 'NIGHT': return <Clock className="w-4 h-4 mr-1" />;
      case 'ALL_DAY': return <Zap className="w-4 h-4 mr-1" />;
      default: return <Clock className="w-4 h-4 mr-1" />;
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          {shiftIcon()}
          <span className="text-sm font-display text-text-primary">{dungeon?.name || 'Daily Dungeon'}</span>
        </div>
        <span className="text-xs font-data text-text-secondary">
          {completedCount}/{totalTasks} completed
        </span>
      </div>

      <div className="w-full bg-raised border border-border-subtle rounded-md p-4">
        <div className="w-full bg-gold-dim rounded-sm h-1 mb-3" role="progressbar"
          aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`bg-green-clear h-1 rounded-sm transition-slow ${
              isCleared ? 'animate-pulse' : ''
            }`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        <div className="space-y-2">
          {dungeonTasks.map((task) => (
            <div key={task.id} className="flex items-center">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleDungeonTask(task.id)}
                className="h-4 w-4 text-green-clear rounded-sm border-border-subtle bg-raised focus:ring-gold-primary focus:ring-offset-0"
              />
              <span className={`ml-3 flex-1 text-sm ${
                task.completed
                  ? 'line-through text-text-muted'
                  : 'text-text-primary'
              }`}>
                {task.title}
              </span>
              <span className={`ml-2 text-xs font-display ${getRankColor(task.rank)}`}>
                {task.rank}
              </span>
            </div>
          ))}
        </div>

        {dungeonTasks.length > 0 && (
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={markDungeonComplete}
              disabled={isCleared}
              className={`px-3 py-1 text-xs rounded-sm transition-fast ${
                isCleared
                  ? 'bg-raised text-text-muted cursor-not-allowed border border-border-subtle'
                  : 'bg-gold-primary text-void hover:bg-gold-primary/90'
              }`}
            >
              {isCleared ? 'Cleared' : 'Complete Dungeon'}
            </button>
            <span className={`
              text-xs font-data
              ${isCleared
                ? 'text-green-clear'
                : completedCount === totalTasks - 1
                ? 'text-gold-primary'
                : 'text-text-secondary'}
            `}>
              {isCleared
                ? 'Dungeon Cleared!'
                : completedCount === totalTasks - 1
                ? 'One task remaining'
                : `${totalTasks - completedCount} tasks left`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const DailyDungeon = DailyDungeonComponent;
export default DailyDungeonComponent;