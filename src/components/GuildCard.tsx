import { Users, Award, TrendingUp } from 'lucide-react';

interface GuildCardProps {
  guild: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    memberCount: number;
    totalExp: bigint;
    level: number;
  };
  onJoin?: (guildId: string) => void;
  isMember?: boolean;
}

export default function GuildCard({ guild, onJoin, isMember = false }: GuildCardProps) {
  const exp = Number(guild.totalExp);
  
  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-purple-500/50 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300 transform hover:scale-105">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{guild.name}</h3>
          <p className="text-sm text-gray-400">@{guild.slug}</p>
        </div>
        <div className="bg-purple-500/20 px-3 py-1 rounded-full">
          <span className="text-purple-400 font-semibold">Lvl {guild.level}</span>
        </div>
      </div>

      {guild.description && (
        <p className="text-gray-300 text-sm mb-4 line-clamp-2">{guild.description}</p>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <div className="text-lg font-display text-blue-400">{guild.memberCount}</div>
          <div className="text-xs text-gray-400">Members</div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <Award className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <div className="text-lg font-display text-yellow-400">{(exp / 1000).toFixed(1)}k</div>
          <div className="text-xs text-gray-400">Total XP</div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <div className="text-lg font-display text-green-400">{guild.level}</div>
          <div className="text-xs text-gray-400">Level</div>
        </div>
      </div>

      {!isMember && onJoin && (
        <button
          onClick={() => onJoin(guild.id)}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
        >
          <Users className="w-4 h-4" />
          Join Guild
        </button>
      )}

      {isMember && (
        <div className="w-full bg-green-500/20 border border-green-500/50 px-4 py-2 rounded-lg font-semibold text-green-400 text-center">
          ✓ Member
        </div>
      )}
    </div>
  );
}