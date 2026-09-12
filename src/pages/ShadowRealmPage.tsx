import React from 'react';
import { useStore } from '../store/useStore';
import QuickCapture from '../components/QuickCapture';

const ShadowRealmPage: React.FC = () => {
  const {
    shadowQuests,
    updateQuest,
    deleteQuest,
  } = useStore();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display text-text-primary mb-6">Shadow Realm</h1>
      <p className="mb-6 text-text-secondary">
        Capture fleeting thoughts and ideas here before they fade into oblivion.
      </p>

      <div className="mb-8">
        <h2 className="text-lg font-display mb-4 text-text-primary">Quick Capture</h2>
        <QuickCapture />
      </div>

      <div className="space-y-6">
        <div className="bg-raised border border-border-subtle rounded-md p-6">
          <h2 className="text-lg font-display mb-4 text-text-primary">Shadow Quests</h2>
          {shadowQuests.length > 0 ? (
            <div className="space-y-4">
              {shadowQuests.map((quest) => (
                <div key={quest.id} className="p-4 bg-surface rounded-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className={`h-2 w-2 rounded-sm
                        ${quest.rank === 'S' ? 'bg-rank-s'
                          : quest.rank === 'A' ? 'bg-rank-a'
                          : quest.rank === 'B' ? 'bg-rank-b'
                          : quest.rank === 'C' ? 'bg-rank-c'
                          : quest.rank === 'D' ? 'bg-rank-d'
                          : 'bg-rank-e'}
                      `} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-text-primary">{quest.title}</h3>
                      <p className="text-sm text-text-secondary mt-1">
                        {quest.rank} • {quest.category}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs">
                    <button
                      onClick={() => {
                        // Promote to active
                        updateQuest(quest.id, { status: 'ACTIVE' });
                      }}
                      className="px-3 py-1 text-xs bg-rank-b/20 text-rank-b hover:bg-rank-b/30 rounded-sm transition-fast"
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => {
                        // Delete
                        deleteQuest(quest.id);
                      }}
                      className="px-3 py-1 text-xs border border-crimson text-crimson hover:bg-crimson/10 rounded-sm transition-fast"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-text-muted py-8 text-sm">
              No shadow quests. Capture some ideas above!
            </p>
          )}
        </div>

        <div className="bg-raised border border-border-subtle rounded-md p-6">
          <h2 className="text-lg font-display mb-4 text-text-primary">Recent Activity</h2>
          <p className="text-text-muted text-sm">
            Your captured ideas will appear here as you add them to the Shadow Realm.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShadowRealmPage;