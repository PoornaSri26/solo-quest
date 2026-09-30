import { Sword, Target, Clock, CheckCircle } from 'lucide-react';

interface RaidCardProps {
  raid: {
    id: string;
    name: string;
    description?: string;
    targetExp: bigint;
    progressExp: bigint;
    status: string;
    startDate: Date;
    endDate?: Date;
  };
  onJoin?: (raidId: string) => void;
  isParticipant?: boolean;
}

export default function RaidCard({ raid, onJoin, isParticipant = false }: RaidCardProps) {
  const targetExp = Number(raid.targetExp);
  const progressExp = Number(raid.progressExp);
  const progress = Math.min((progressExp / targetExp) * 100, 100);
  
  const statusColors = {
    ACTIVE: 'text-green-400',
    COMPLETED: 'text-blue-400',
    FAILED: 'text-red-400',
    CANCELLED: 'text-gray-400',
  };

  const statusColor = statusColors[raid.status as keyof typeof statusColors] || 'text-gray-400';

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-red-500/50 shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all duration-300 transform hover:scale-105">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Sword className="w-8 h-8 text-red-400" />
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{raid.name}</h3>
            <div className={`text-sm font-semibold ${statusColor}`}>
              {raid.status}
            </div>
          </div>
        </div>
        {raid.status === 'COMPLETED' && (
          <CheckCircle className="w-6 h-6 text-green-400" />
        )}
      </div>

      {raid.description && (
        <p className="text-gray-300 text-sm mb-4 line-clamp-2">{raid.description}</p>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Progress</span>
          <span className="text-white font-semibold">{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{(progressExp / 1000).toFixed(1)}k XP</span>
          <span>Target: {(targetExp / 1000).toFixed(1)}k XP</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-700/50 rounded-lg p-3 flex items-center gap-2">
          <Target className="w-5 h-5 text-yellow-400" />
          <div>
            <div className="text-xs text-gray-400">Target</div>
            <div className="text-lg font-display text-yellow-400">{(targetExp / 1000).toFixed(1)}k</div>
          </div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-xs text-gray-400">Started</div>
            <div className="text-sm text-blue-400">
              {new Date(raid.startDate).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {!isParticipant && raid.status === 'ACTIVE' && onJoin && (
        <button
          onClick={() => onJoin(raid.id)}
          className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
        >
          <Sword className="w-4 h-4" />
          Join Raid
        </button>
      )}

      {isParticipant && (
        <div className="w-full bg-green-500/20 border border-green-500/50 px-4 py-2 rounded-lg font-semibold text-green-400 text-center flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Participating
        </div>
      )}

      {raid.status !== 'ACTIVE' && (
        <div className="w-full bg-slate-700/50 border border-slate-600 px-4 py-2 rounded-lg font-semibold text-gray-400 text-center">
          {raid.status}
        </div>
      )}
    </div>
  );
}