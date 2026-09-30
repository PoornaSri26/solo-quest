import { Sword, Target, Clock, CheckCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';

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
    ACTIVE: 'text-green-clear',
    COMPLETED: 'text-blue-400',
    FAILED: 'text-text-danger',
    CANCELLED: 'text-text-muted',
  };

  const statusColor = statusColors[raid.status as keyof typeof statusColors] || 'text-text-muted';

  return (
    <Card variant="raid" className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Sword className="w-8 h-8 text-text-danger" />
          <div>
            <h3 className="text-xl font-display font-bold text-text-primary mb-1">{raid.name}</h3>
            <div className={`text-sm font-display font-semibold ${statusColor}`}>
              {raid.status}
            </div>
          </div>
        </div>
        {raid.status === 'COMPLETED' && (
          <CheckCircle className="w-6 h-6 text-green-clear" />
        )}
      </div>

      {raid.description && (
        <p className="text-text-primary text-sm mb-4 line-clamp-2">{raid.description}</p>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <ProgressBar value={progress} variant="red" showLabel />
        <div className="flex justify-between text-xs text-text-secondary mt-1">
          <span>{(progressExp / 1000).toFixed(1)}k XP</span>
          <span>Target: {(targetExp / 1000).toFixed(1)}k XP</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-raised border border-border-subtle rounded-md p-3 flex items-center gap-2">
          <Target className="w-5 h-5 text-gold-primary" />
          <div>
            <div className="text-xs text-text-secondary">Target</div>
            <div className="text-lg font-display text-gold-primary">{(targetExp / 1000).toFixed(1)}k</div>
          </div>
        </div>
        <div className="bg-raised border border-border-subtle rounded-md p-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-xs text-text-secondary">Started</div>
            <div className="text-sm text-blue-400">
              {new Date(raid.startDate).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {!isParticipant && raid.status === 'ACTIVE' && onJoin && (
        <Button variant="danger" onClick={() => onJoin(raid.id)} className="w-full">
          <Sword className="w-4 h-4" />
          Join Raid
        </Button>
      )}

      {isParticipant && (
        <div className="w-full bg-green-clear/20 border border-green-clear/50 px-4 py-2 rounded-md font-display font-semibold text-green-clear text-center flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Participating
        </div>
      )}

      {raid.status !== 'ACTIVE' && (
        <div className="w-full bg-raised border border-border-subtle px-4 py-2 rounded-md font-display font-semibold text-text-muted text-center">
          {raid.status}
        </div>
      )}
    </Card>
  );
}