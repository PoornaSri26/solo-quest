import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import QuestCard from '../components/QuestCard';
import { Plus } from 'lucide-react';

const QuestLogPage: React.FC = () => {
  const {
    activeQuests,
    shadowQuests,
    completedQuests,
    fetchQuests,
    createQuest,
  } = useStore();

  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestRank, setNewQuestRank] = useState<'E' | 'D' | 'C' | 'B' | 'A' | 'S'>('E');
  const [newQuestCategory, setNewQuestCategory] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestTitle.trim()) return;
    setIsCreating(true);
    try {
      await createQuest({
        title: newQuestTitle.trim(),
        rank: newQuestRank,
        category: newQuestCategory.trim() || 'Wildcard',
        status: 'ACTIVE',
        isBossQuest: false,
      });
      setNewQuestTitle('');
      setNewQuestRank('E');
      setNewQuestCategory('');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display text-text-primary mb-6">Quest Log</h1>

      {/* Inline Quest Creation Form */}
      <div className="bg-raised border border-border-subtle rounded-md p-6 mb-8">
        <h2 className="text-lg font-display mb-4 text-text-primary">Create New Quest</h2>
        <form onSubmit={handleCreateQuest} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">Quest Title</label>
              <input
                type="text"
                value={newQuestTitle}
                onChange={(e) => setNewQuestTitle(e.target.value)}
                placeholder="Enter quest title..."
                className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-sm focus:outline-none focus:border-gold-primary text-text-primary placeholder:text-text-muted"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Rank</label>
              <select
                value={newQuestRank}
                onChange={(e) => setNewQuestRank(e.target.value as 'E' | 'D' | 'C' | 'B' | 'A' | 'S')}
                className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-sm focus:outline-none focus:border-gold-primary text-text-primary"
              >
                <option value="E">E-Rank</option>
                <option value="D">D-Rank</option>
                <option value="C">C-Rank</option>
                <option value="B">B-Rank</option>
                <option value="A">A-Rank</option>
                <option value="S">S-Rank</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">Category (optional)</label>
              <input
                type="text"
                value={newQuestCategory}
                onChange={(e) => setNewQuestCategory(e.target.value)}
                placeholder="e.g. Fitness, Work, Study"
                className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-sm focus:outline-none focus:border-gold-primary text-text-primary placeholder:text-text-muted"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isCreating || !newQuestTitle.trim()}
                className="w-full h-[42px] flex items-center justify-center gap-2 bg-gold-primary text-void hover:bg-gold-primary/90 rounded-sm transition-fast disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isCreating ? 'Creating...' : 'Create Quest'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-display flex items-center space-x-2 text-text-primary">
          <span className="text-gold-primary">⚔️</span>
          Active Quests
        </h2>
        <span className={`
          ml-2 px-2 py-0.5 rounded-sm border text-xs font-display tracking-wider
          bg-green-clear/20 border-green-clear text-green-clear
        `}>
          {activeQuests.length}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {activeQuests.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
          />
        ))}
        {activeQuests.length === 0 && (
          <div className="col-span-2 text-center text-text-muted py-8 text-sm">
            No active quests. Activate some from your Shadow Realm!
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-display mb-4 flex items-center space-x-2 text-text-primary">
          <span className="text-gold-primary">👁️‍🗨️</span>
          Shadow Realm
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {shadowQuests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
            />
          ))}
          {shadowQuests.length === 0 && (
            <div className="col-span-2 text-center text-text-muted py-8 text-sm">
              Capture quests in the Shadow Realm to bring them to light.
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-display mb-4 flex items-center space-x-2 text-text-primary">
          <span className="text-gold-primary">✅</span>
          Completed Quests
        </h2>
        <span className={`
          ml-2 px-2 py-0.5 rounded-sm border text-xs font-display tracking-wider
          bg-green-clear/20 border-green-clear text-green-clear
        `}>
          {completedQuests.length}
        </span>
        <div className="grid gap-4 md:grid-cols-2">
          {completedQuests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
            />
          ))}
          {completedQuests.length === 0 && (
            <div className="col-span-2 text-center text-text-muted py-8 text-sm">
              Complete quests to see them here!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestLogPage;