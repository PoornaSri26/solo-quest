import { useEffect, useState } from 'react';
import { Skull, Swords, Users, Crown, Trophy } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ProgressBar } from './ui/ProgressBar';
import { createAuthApi } from '../lib/api';
import { useStore } from '../store/useStore';

/**
 * Shared guild boss fight (#96). Damage comes only from server-verified quest
 * completions: every eligible completion (≤7 days old, not already used)
 * automatically lands a rank-scaled strike (E=100 … S=600 HP) on the guild's
 * active boss — no manual input. This card renders the fight state, the
 * top-damage leaderboard, and the summon flow.
 */
interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  damage: string;
  isMe: boolean;
}

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
  leaderboard?: LeaderboardEntry[];
  participantCount?: number;
}

/** Past victory in the kill-feed (#96). */
interface BossVictory {
  id: string;
  name: string;
  tier: number;
  defeatedAt?: string | null;
  totalDamage: string;
  fighterCount: number;
  topSlayer: { displayName: string; isMe: boolean } | null;
}

const GUILD_BOSSES: { tier: number; name: string; hp: number }[] = [
  { tier: 1, name: 'Gatekeeper Hound', hp: 1500 },
  { tier: 2, name: 'Dire Beast of the Rift', hp: 4000 },
  { tier: 3, name: 'Rift Marshal', hp: 9000 },
  { tier: 4, name: 'Archon of the Deep Rift', hp: 16000 },
  { tier: 5, name: 'The Rift Sovereign', hp: 25000 },
];

const RANK_STRIKE_HINT = 'Every quest you clear lands a strike: E=100 · D=200 · C=300 · B=400 · A=500 · S=600 damage.';

export default function GuildBossCard({ onChanged }: { onChanged?: () => void }) {
  const token = useStore((s) => s.token);
  const addToast = useStore((s) => s.addToast);
  // Live updates: any guild member's strike pushes boss:updated via the socket,
  // the store stamps it, and this card re-fetches the fight state.
  const bossEvent = useStore((s) => s.bossState);
  const [boss, setBoss] = useState<BossState | null>(null);
  const [victories, setVictories] = useState<BossVictory[]>([]);
  const [loading, setLoading] = useState(true);
  const [summoning, setSummoning] = useState(false);
  const [summonTier, setSummonTier] = useState(1);

  const refresh = async () => {
    try {
      const api = createAuthApi(() => token);
      const [data, history] = await Promise.all([
        api.get<BossState>('/guilds/boss/current'),
        api.get<{ victories: BossVictory[] }>('/guilds/boss/history').catch(() => ({ victories: [] })),
      ]);
      setBoss(data);
      setVictories(history.victories);
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

  // Re-fetch when a boss:updated event lands (debounced via updatedAt stamp).
  useEffect(() => {
    if (!bossEvent) return;
    refresh();
    if (bossEvent.defeated) {
      addToast('success', 'The boss has been defeated!');
      useStore.getState().clearBossState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bossEvent?.updatedAt]);

  const handleSummon = async () => {
    setSummoning(true);
    try {
      const api = createAuthApi(() => token);
      await api.post('/guilds/boss/spawn', { tier: summonTier });
      addToast('success', 'The boss has been summoned. Clear quests to deal damage!');
      await refresh();
      onChanged?.();
    } catch (err: any) {
      addToast('error', err?.message || 'Summon failed.');
    } finally {
      setSummoning(false);
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
        <p className="text-xs text-text-secondary mb-4">{RANK_STRIKE_HINT}</p>

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
          <Button onClick={handleSummon} disabled={summoning} variant="danger">
            <Crown className="w-4 h-4 mr-1" aria-hidden="true" />
            {summoning ? 'Summoning…' : 'Summon Boss'}
          </Button>
        </div>
        {victories.length > 0 && <KillFeed victories={victories} />}
      </Card>
    );
  }

  const { boss: active } = boss;
  const percent = Math.min(boss.percent ?? 0, 100);
  const leaderboard = boss.leaderboard ?? [];

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
              {typeof boss.participantCount === 'number' && boss.participantCount > 0
                ? ` · ${boss.participantCount} fighter${boss.participantCount === 1 ? '' : 's'}`
                : ''}
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
      <div className="mb-2">
        <ProgressBar value={percent} variant="red" showLabel />
        <div className="flex justify-between text-xs text-text-secondary mt-1 font-data">
          <span>
            {boss.hpRemaining ? Number(boss.hpRemaining).toLocaleString() : '0'} HP left
          </span>
          <span>{Number(boss.damage ?? 0).toLocaleString()} / {Number(boss.hp ?? 0).toLocaleString()}</span>
        </div>
      </div>

      {active!.status === 'ACTIVE' && (
        <p className="text-xs text-text-secondary mb-4">{RANK_STRIKE_HINT}</p>
      )}

      {/* Top damage leaderboard */}
      {leaderboard.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <h4 className="flex items-center gap-2 text-sm font-display text-text-primary mb-3">
            <Trophy className="w-4 h-4 text-gold-primary" aria-hidden="true" />
            Top Damage Dealers
          </h4>
          <ol className="space-y-1.5" aria-label="Boss fight damage leaderboard">
            {leaderboard.map((entry) => (
              <li
                key={entry.userId}
                className={`flex items-center justify-between px-3 py-1.5 rounded-sm text-sm ${
                  entry.isMe
                    ? 'bg-gold-primary/10 border border-gold-primary/40 text-text-primary'
                    : 'text-text-secondary'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="font-data text-xs w-5 text-text-muted">#{entry.rank}</span>
                  <span className="truncate">
                    {entry.rank === 1 && <Crown className="inline w-3.5 h-3.5 text-gold-primary mr-1" aria-hidden="true" />}
                    {entry.displayName}
                    {entry.isMe && <span className="text-gold-primary text-xs ml-1">(you)</span>}
                  </span>
                </span>
                <span className="font-data text-xs text-gold-primary">
                  {Number(entry.damage).toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {leaderboard.length === 0 && active!.status === 'ACTIVE' && (
        <p className="flex items-center gap-2 text-xs text-text-muted mt-4 pt-4 border-t border-border-subtle">
          <Users className="w-3.5 h-3.5" aria-hidden="true" />
          No strikes yet — be the first to land one by clearing a quest.
        </p>
      )}

      {victories.length > 0 && <KillFeed victories={victories} />}
    </Card>
  );
}

/** Past boss victories (kill-feed), newest first — served by /guilds/boss/history. */
function KillFeed({ victories }: { victories: BossVictory[] }) {
  return (
    <div className="mt-4 pt-4 border-t border-border-subtle">
      <h4 className="flex items-center gap-2 text-sm font-display text-text-primary mb-3">
        <Skull className="w-4 h-4 text-crimson" aria-hidden="true" />
        Past Victories
      </h4>
      <ol className="space-y-1.5" aria-label="Guild boss kill-feed">
        {victories.map((v) => (
          <li
            key={v.id}
            className="flex items-center justify-between px-3 py-1.5 rounded-sm text-sm bg-raised/40 text-text-secondary"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="font-data text-xs text-crimson">T{v.tier}</span>
              <span className="truncate text-text-primary">{v.name}</span>
              <span className="text-xs text-text-muted">felled by {v.fighterCount} fighter{v.fighterCount === 1 ? '' : 's'}</span>
            </span>
            <span className="text-xs whitespace-nowrap">
              {v.topSlayer ? (
                <>
                  <Swords className="inline w-3 h-3 text-gold-primary mr-1" aria-hidden="true" />
                  <span className={v.topSlayer.isMe ? 'text-gold-primary' : ''}>
                    {v.topSlayer.displayName}
                    {v.topSlayer.isMe && <span className="text-gold-primary"> (you)</span>}
                  </span>
                </>
              ) : (
                <span className="font-data text-text-muted">
                  {v.defeatedAt ? new Date(v.defeatedAt).toLocaleDateString() : ''}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
