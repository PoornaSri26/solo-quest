import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Plus } from 'lucide-react';

const GatesPage: React.FC = () => {
  const {
    gates,
    fetchGates,
    createGate,
    updateGate,
    deleteGate,
  } = useStore();

  const [newGateName, setNewGateName] = useState('');
  const [newGateRank, setNewGateRank] = useState<'E' | 'D' | 'C' | 'B' | 'A' | 'S'>('E');
  const [newGateDeadline, setNewGateDeadline] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingGateId, setEditingGateId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRank, setEditRank] = useState<'E' | 'D' | 'C' | 'B' | 'A' | 'S'>('E');
  const [editDeadline, setEditDeadline] = useState<string | null>(null);

  const ranks: ('E' | 'D' | 'C' | 'B' | 'A' | 'S')[] = ['E', 'D', 'C', 'B', 'A', 'S'];

  const handleCreateGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGateName.trim()) return;
    setIsCreating(true);
    try {
      await createGate({
        name: newGateName.trim(),
        rank: newGateRank,
        deadline: newGateDeadline ? newGateDeadline : null,
        status: 'active',
      });
      setNewGateName('');
      setNewGateRank('E');
      setNewGateDeadline(null);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editingGateId) return;
    try {
      await updateGate(editingGateId, {
        name: editName.trim(),
        rank: editRank,
        deadline: editDeadline ? editDeadline : null,
      });
      setEditingGateId(null);
    } finally {
      // No need to setIsCreating here as we are not using that state for edit
    }
  };

  const handleCancelEdit = () => {
    setEditingGateId(null);
  };

  const handleDeleteGate = async (id: string) => {
    if (window.confirm('Delete this gate?')) {
      await deleteGate(id);
    }
  };

  // Fetch gates on mount
  useEffect(() => {
    fetchGates();
  }, [fetchGates]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display text-text-primary mb-6">Gates (Projects)</h1>

      {/* Add Gate Form */}
      <div className="bg-raised border border-border-subtle rounded-md p-6 mb-8">
        <h2 className="text-lg font-display mb-4 text-text-primary">Create New Gate</h2>
        <form onSubmit={handleCreateGate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Gate Name
            </label>
            <input
              type="text"
              value={newGateName}
              onChange={(e) => setNewGateName(e.target.value)}
              placeholder="Enter gate name (e.g., Website Redesign)"
              className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-sm focus:outline-none focus:border-gold-primary text-text-primary placeholder:text-text-muted"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Rank
              </label>
              <select
                value={newGateRank}
                onChange={(e) => setNewGateRank(e.target.value as 'E' | 'D' | 'C' | 'B' | 'A' | 'S')}
                className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-sm focus:outline-none focus:border-gold-primary text-text-primary"
              >
                {ranks.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Deadline (optional)
              </label>
              <input
                type="date"
                value={newGateDeadline || ''}
                onChange={(e) => setNewGateDeadline(e.target.value || null)}
                className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-sm focus:outline-none focus:border-gold-primary text-text-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="w-full items-center justify-center px-4 py-2 bg-gold-primary text-void hover:bg-gold-primary/90 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-fast"
          >
            {isCreating ? 'Creating...' : 'Create Gate'}
          </button>
        </form>
      </div>

      {/* Gates List */}
      {!gates.length ? (
        <p className="text-text-muted text-center py-12 text-sm">
          No gates created yet. Create your first gate above!
        </p>
      ) : (
        <div className="space-y-6">
          {gates.map((gate) => (
            <div key={gate.id} className={`bg-raised border rounded-md p-6 relative ${
              gate.rank === 'S' 
                ? 'border-rank-s shadow-[0_0_20px_rgba(201,168,76,0.3)] animate-pulse-slow' 
                : gate.rank === 'A' 
                  ? 'border-rank-a shadow-[0_0_15px_rgba(201,168,76,0.2)]' 
                  : 'border-border-subtle'
            }`}>
              {editingGateId === gate.id ? (
                // Edit Form
                <form onSubmit={handleUpdateGate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Gate Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-sm focus:outline-none focus:border-gold-primary text-text-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Rank
                      </label>
                      <select
                        value={editRank}
                        onChange={(e) => setEditRank(e.target.value as 'E' | 'D' | 'C' | 'B' | 'A' | 'S')}
                        className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-sm focus:outline-none focus:border-gold-primary text-text-primary"
                      >
                        {ranks.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Deadline (optional)
                      </label>
                      <input
                        type="date"
                        value={editDeadline || ''}
                        onChange={(e) => setEditDeadline(e.target.value || null)}
                        className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-sm focus:outline-none focus:border-gold-primary text-text-primary"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-3 py-1 text-xs border border-border-subtle text-text-secondary hover:bg-raised rounded-sm transition-fast"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs bg-gold-primary text-void hover:bg-gold-primary/90 rounded-sm transition-fast"
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                // Gate Display
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className={`h-3 w-3 rounded-sm
                      ${gate.rank === 'S' ? 'bg-rank-s'
                        : gate.rank === 'A' ? 'bg-rank-a'
                        : gate.rank === 'B' ? 'bg-rank-b'
                        : gate.rank === 'C' ? 'bg-rank-c'
                        : gate.rank === 'D' ? 'bg-rank-d'
                        : 'bg-rank-e'}
                    `} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-text-primary">{gate.name}</h3>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-sm border font-display tracking-wider
                          ${gate.rank === 'S' ? 'bg-rank-s/20 border-rank-s text-rank-s'
                            : gate.rank === 'A' ? 'bg-rank-a/20 border-rank-a text-rank-a'
                            : gate.rank === 'B' ? 'bg-rank-b/20 border-rank-b text-rank-b'
                            : gate.rank === 'C' ? 'bg-rank-c/20 border-rank-c text-rank-c'
                            : gate.rank === 'D' ? 'bg-rank-d/20 border-rank-d text-rank-d'
                            : 'bg-rank-e/20 border-rank-e text-rank-e'}
                        `}>
                          {gate.rank}
                        </span>

                        {gate.deadline && (
                          <span className={`px-2 py-0.5 rounded-sm border text-xs font-data
                            ${new Date(gate.deadline) < new Date()
                              ? 'bg-crimson/20 border-crimson text-crimson'
                              : new Date(gate.deadline).toDateString() === new Date().toDateString()
                                ? 'bg-gold-primary/20 border-gold-primary text-gold-primary'
                                : 'bg-raised border-border-subtle text-text-secondary'}
                          `}>
                            {new Date(gate.deadline).toDateString() === new Date().toDateString()
                              ? 'Today'
                              : new Date(gate.deadline).toDateString() === new Date(Date.now() + 86400000).toDateString()
                                ? 'Tomorrow'
                                : new Date(gate.deadline) < new Date()
                                  ? 'Overdue'
                                  : new Date(gate.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      {/* Portal Ring Progress */}
                      <div className="relative w-16 h-16 mx-auto">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            className="stroke-gold-dim"
                            strokeWidth="4"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            className={`stroke-violet-gate transition-slow ${
                              (gate.progress ?? 0) === 100 ? 'animate-pulse' : ''
                            }`}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={175.9}
                            strokeDashoffset={175.9 - (175.9 * (gate.progress ?? 0)) / 100}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-data text-text-primary">{gate.progress ?? 0}%</span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs font-data text-text-secondary text-center">
                        {(gate.progress ?? 0) === 100 ? 'CLEARED' : 'In Progress'}
                      </p>
                    </div>
                  </div>

                  <div className="ml-4 flex-shrink-0 flex space-x-3">
                    <button
                      onClick={() => setEditingGateId(gate.id)}
                      className="p-1 border border-border-subtle text-text-secondary hover:bg-raised hover:text-text-primary rounded-sm transition-fast"
                    >
                      <Plus className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteGate(gate.id)}
                      className="p-1 border border-crimson text-crimson hover:bg-crimson/10 rounded-sm transition-fast"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GatesPage;