import { useState } from 'react';
import { useStore } from '../store/useStore';
import { loreFragments } from '../lib/system-voice';

export const LoreCompendium = () => {
  const stats = useStore((s) => s.stats);
  const currentLevel = stats?.level || 1;
  const [selectedLore, setSelectedLore] = useState<string | null>(null);

  // Group fragments by type for display
  const categorizedLore = loreFragments.reduce((acc, lore) => {
    if (!acc[lore.type]) acc[lore.type] = [];
    acc[lore.type].push(lore);
    return acc;
  }, {} as Record<string, typeof loreFragments>);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'system_log': return 'System Logs';
      case 'journal': return 'Hunter Journals';
      case 'archive': return 'World Archives';
      case 'inscription': return 'Gate Inscriptions';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl text-text-primary">Lore Compendium</h3>
        <span className="font-system text-xs text-text-muted">
          Unlocked: {loreFragments.filter((l) => currentLevel >= l.unlockLevel).length} / {loreFragments.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(categorizedLore).map(([type, fragments]) => (
          <div key={type} className="space-y-3">
            <h4 className="font-display text-sm tracking-wider uppercase text-gold-primary mb-4 border-b border-border-subtle pb-2">
              {getTypeLabel(type)}
            </h4>
            <div className="space-y-2">
              {fragments.map((lore) => {
                const isUnlocked = currentLevel >= lore.unlockLevel;

                return (
                  <button
                    key={lore.id}
                    disabled={!isUnlocked}
                    onClick={() => setSelectedLore(lore.id)}
                    className="w-full text-left px-3 py-2 rounded-sm border transition-fast"
                    title={!isUnlocked ? 'Unlocks at Level ' : ''}
                  >
                    <span className="font-system text-xs block truncate">
                      {isUnlocked ? lore.title : '[REDACTED]'}
                    </span>
                    {!isUnlocked && (
                      <span className="font-data text-[10px] text-text-secondary block mt-1">
                        Requires Lv.{lore.unlockLevel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedLore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08090C]/80 backdrop-blur-sm p-4" onClick={() => setSelectedLore(null)}>
          <div 
            className="bg-surface border border-border-subtle max-w-2xl w-full rounded-md shadow-2xl p-8 animate-slide-in relative overflow-y-auto max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedLore(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
            >
              ✕
            </button>
            {(() => {
              const lore = loreFragments.find(l => l.id === selectedLore);
              if (!lore) return null;
              return (
                <>
                  <div className="font-system text-xs text-gold-primary tracking-widest uppercase mb-6">
                    {getTypeLabel(lore.type)} // ENTRY {lore.id.split('-')[1]}
                  </div>
                  <h2 className="font-display text-2xl text-text-primary mb-6">{lore.title}</h2>
                  <div className="font-system text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {lore.content}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
