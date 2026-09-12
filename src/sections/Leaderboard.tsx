

export const Leaderboard = () => {
  const entries = [
    { rank: 1, name: 'Aetherion', score: 9845, badge: 'S' },
    { rank: 2, name: 'NyxBlade', score: 8720, badge: 'A' },
    { rank: 3, name: 'Grimfang', score: 8150, badge: 'A' },
    { rank: 4, name: 'IronVeins', score: 7620, badge: 'B' },
    { rank: 5, name: 'Silvershot', score: 7200, badge: 'B' },
  ];

  const getRankClass = (badge: string) => {
    switch (badge) {
      case 'S': return 'text-rank-s';
      case 'A': return 'text-rank-a';
      case 'B': return 'text-rank-b';
      case 'C': return 'text-rank-c';
      case 'D': return 'text-rank-d';
      case 'E': return 'text-rank-e';
      default: return 'text-rank-e';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-display text-xl text-text-primary mb-4">Hall of Heroes</h3>
      <div className="space-y-2">
        <div className="flex justify-between px-4 py-2 bg-raised border border-border-subtle rounded-sm font-display text-sm text-text-secondary">
          <span>Rank</span>
          <span>Hunter</span>
          <span className="text-right">Score</span>
        </div>
        {entries.map((e) => (
          <div key={e.rank} className="flex justify-between px-4 py-3 bg-surface border border-border-subtle rounded-sm hover:border-gold-dim transition-fast">
            <span className="font-data text-gold-primary w-8">#{e.rank}</span>
            <span className="flex items-center gap-2">
              <span className="font-display text-text-primary">{e.name}</span>
              <span className={`px-2 py-0.5 text-xs rounded-sm font-display ${getRankClass(e.badge)}`}>
                {e.badge}
              </span>
            </span>
            <span className="font-data text-text-secondary text-right">{e.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};