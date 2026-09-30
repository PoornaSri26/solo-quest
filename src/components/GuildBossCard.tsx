import { useEffect, useState } from 'react';
import { Skull, Swords, Users, Crown } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ProgressBar } from './ui/ProgressBar';
import { createAuthApi } from '../lib/api';
import { useStore } from '../store/useStore';

/**
 * Shared guild boss fight (#96). Damage comes only from server-verified quest
 * completions: each eligible completion (≤7 days old, not already used) deals
 * a rank-scaled strike (E=100 … S=600 HP) via POST /api/guilds/boss/strike.
 */
interface BossState {
  boss: {
    id: string;
    name: string;
    description?: string | null;
    bossTier: number;
    status: string;
  } | null;
  hp?: string;
  damage?: string;
  hpRemaining?: string;
  percent?: number;
  me?: string;
}

const GUILD_BOSSES: { tier: number; name: string; hp: number }[] = [
  { tier: 1, name: 'Gatekeeper Hound', hp: 1500 },
  { tier: 2, name: 'Dire Beast of the Rift', hp: 4000 },
  { tier: 3, name: 'Rift Marshal', hp: 9000 },
  { tier: 4, name: 'Archon of the Deep Rift', hp: 16000 },
  { tier: 5, name: 'The Rift Sovereign', hp: 25000 },
];

export default function GuildBossCard({ onChanged }: { onChanged?: () => void }) {
  const token = useStore((s) => s.token);
  const addToast = useStore((s) => s.addToast);
  const [boss, setBoss] = useState<BossState | null>(null);
  const [loading, setLoading] = useState(true);
  const [striking, setStriking] = useState(false);
  const [summonTier, setSummonTier] = useState(1);
  const [eligibleQuestId, setEligibleQuestId] = useState('');

  const refresh = async () => {
    try {
      const api = createAuthApi(() => token);
      const data = await api.get<BossState>('/guilds/boss/current');
      setBoss(data);
    } catch {
      setBoss(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleStrike = async () => {
    if (!eligibleQuestId.trim()) {
      addToast('error', 'Enter the ID of a quest you completed recently.');
      return;
    }
    setStriking(true);
    try {
      const api = createAuthApi(() => token);
      const data = await api.post<{ message: string }>('/guilds/boss/strike', {
        questId: eligibleQuestId.trim(),
      });
      addToast('success', data.message || 'Strike landed!');
      setEligibleQuestId('');
      await refresh();
      onChanged?.();
    } catch (err: any) {
      addToast('error', err?.message || 'Strike failed.');
    } finally {
      setStriking(false);
    }
  };

  const handleSummon = async () => {
    setStriking(true);
    try {
      const api = createAuthApi(() => token);
      await api.post('/guilds/boss/spawn', { tier: summonTier });
      addToast('success', 'The boss has been summoned. Clear quests to deal damage!');
      await refresh();
      onChanged?.();
    } catch (err: any) {
      addToast('error', err?.message || 'Summon failed.');
    } finally {
      setStriking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6" role="status" aria-label="Loading boss fight">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-crimson border-t-transparent" />
      </div>
    );
  }

  // No active boss: summon UI
  if (!boss?.boss) {
    return (
      <Card variant="raid" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Skull className="w-7 h-7 text-crimson" aria-hidden="true" />
          <div>
            <h3 className="font-display font-bold text-text-primary">Shared Boss Fight</h3>
            <p className="text-xs text-text-secondary">Summon a rift boss for your whole guild to bring down.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="boss-tier" className="block text-xs text-text-secondary mb-1">Boss Tier</label>
            <select
              id="boss-tier"
              value={summonTier}
              onChange={(e) => setSummonTier(Number(e.target.value))}
              className="bg-surface border border-border-subtle rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-crimson"
            >
              {GUILD_BOSSES.map((b) => (
                <option key={b.tier} value={b.tier}>
                  T{b.tier} — {b.name} ({b.hp.toLocaleString()} HP)
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleSummon} disabled={striking} variant="danger">
            <Crown className="w-4 h-4 mr-1" aria-hidden="true" />
            {striking ? 'Summoning…' : 'Summon Boss'}
          </Button>
        </div>
      </Card>
    );
  }

  const { boss: active } = boss;
  const percent = Math.min(boss.percent ?? 0, 100);

  return (
    <Card variant="raid" className="p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Skull className="w-8 h-8 text-crimson" aria-hidden="true" />
          <div>
            <h3 className="font-display font-bold text-text-primary text-lg">
              {active!.name}
            </h3>
            <p className="text-xs text-text-secondary">
              Tier {active!.bossTier} shared boss · {active!.status}
            </p>
          </div>
        </div>
        {active!.status === 'COMPLETED' && (
          <span className="flex items-center gap-1 text-green-clear text-sm font-display">
            <Swords className="w-4 h-4" aria-hidden="true" /> Defeated
          </span>
        )}
      </div>

      {active!.description && (
        <p className="text-text-secondary text-sm mb-4">{active!.description}</p>
      )}

      {/* Boss HP bar */}
      <div className="mb-4">
        <ProgressBar value={percent} variant="red" showLabel />
        <div className="flex justify-between text-xs text-text-secondary mt-1 font-data">
          <span>
            {boss.hpRemaining ? Number(boss.hpRemaining).toLocaleString() : '0'} HP left
          </span>
          <span>{Number(boss.damage ?? 0).toLocaleString()} / {Number(boss.hp ?? 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 text-xs text-text-secondary">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" aria-hidden="true" />
          Your damage: <span className="font-data text-gold-primary">{Number(boss.me ?? 0).toLocaleString()}</span>
        </span>
      </div>

      {active!.status === 'ACTIVE' && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="strike-quest" className="block text-xs text-text-secondary mb-1">
              Completed quest ID (one strike per quest, rank sets damage)
            </label>
            <input
              id="strike-quest"
              type="text"
              value={eligibleQuestId}
              onChange={(e) => setEligibleQuestId(e.target.value)}
              placeholder="Quest you cleared in the last 7 days"
              className="w-full bg-surface border border-border-subtle rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-crimson"
            />
          </div>
          <Button onClick={handleStrike} disabled={striking} variant="danger">
            <Swords className="w-4 h-4 mr-1" aria-hidden="true" />
            {striking ? 'Striking…' : 'Strike'}
          </Button>
        </div>
      )}
    </Card>
  );
}
