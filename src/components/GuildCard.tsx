import { Users, Award, TrendingUp } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

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
    <Card variant="guild" className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-display font-bold text-text-primary mb-1">{guild.name}</h3>
          <p className="text-sm text-text-secondary">@{guild.slug}</p>
        </div>
        <div className="bg-raised border border-border-subtle px-3 py-1 rounded-md">
          <span className="text-gold-primary font-display font-semibold">Lvl {guild.level}</span>
        </div>
      </div>

      {guild.description && (
        <p className="text-text-primary text-sm mb-4 line-clamp-2">{guild.description}</p>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-raised border border-border-subtle rounded-md p-3 text-center">
          <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <div className="text-lg font-display text-blue-400">{guild.memberCount}</div>
          <div className="text-xs text-text-secondary">Members</div>
        </div>
        <div className="bg-raised border border-border-subtle rounded-md p-3 text-center">
          <Award className="w-5 h-5 text-gold-primary mx-auto mb-1" />
          <div className="text-lg font-display text-gold-primary">{(exp / 1000).toFixed(1)}k</div>
          <div className="text-xs text-text-secondary">Total XP</div>
        </div>
        <div className="bg-raised border border-border-subtle rounded-md p-3 text-center">
          <TrendingUp className="w-5 h-5 text-green-clear mx-auto mb-1" />
          <div className="text-lg font-display text-green-clear">{guild.level}</div>
          <div className="text-xs text-text-secondary">Level</div>
        </div>
      </div>

      {!isMember && onJoin && (
        <Button variant="primary" onClick={() => onJoin(guild.id)} className="w-full">
          <Users className="w-4 h-4" />
          Join Guild
        </Button>
      )}

      {isMember && (
        <div className="w-full bg-green-clear/20 border border-green-clear/50 px-4 py-2 rounded-md font-display font-semibold text-green-clear text-center">
          ✓ Member
        </div>
      )}
    </Card>
  );
}