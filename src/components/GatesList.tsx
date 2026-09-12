import { useState } from 'react';
import { Folder, Trash2, Edit } from 'lucide-react';
import { Gate } from '../shared/types';
import { useStore } from '../store/useStore';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

const GatesList: React.FC = () => {
  const {
    gates,
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display text-text-primary">Gates</h2>
        <button
          onClick={() => setEditingGateId(null)} // Reset edit state
          className="text-xs text-text-secondary hover:text-text-primary transition-fast"
        >
          Collapse All
        </button>
      </div>

      {/* Add Gate Form */}
      <form onSubmit={handleCreateGate} className="bg-raised border border-border-subtle rounded-md p-4">
        <div className="mb-3">
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Gate Name
          </label>
          <input
            type="text"
            value={newGateName}
            onChange={(e) => setNewGateName(e.target.value)}
            placeholder="Enter gate name (e.g., Project Alpha)"
            className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-sm focus:outline-none focus:border-gold-primary text-text-primary placeholder:text-text-muted"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Rank
            </label>
            <select
              value={newGateRank}
              onChange={(e) => setNewGateRank(e.target.value as 'E' | 'D' | 'C' | 'B' | 'A' | 'S')}
              className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-sm focus:outline-none focus:border-gold-primary text-text-primary"
            >
              {ranks.map(r => (
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
          className="w-flex items-center justify-center px-4 py-2 bg-gold-primary text-void hover:bg-gold-primary/90 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-fast"
        >
          {isCreating ? 'Creating...' : 'Create Gate'}
        </button>
      </form>

      {/* Gates List */}
      {!gates.length ? (
        <p className="text-text-muted text-center py-8 text-sm">
          No gates created yet. Create your first gate above!
        </p>
      ) : (
        <div className="space-y-3">
          {gates.map((gate) => (
            <div key={gate.id} className="bg-raised border border-border-subtle rounded-md p-4">
              {editingGateId === gate.id ? (
                // Edit Form
                <form onSubmit={handleUpdateGate} className="space-y-3">
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

                  <div className="grid grid-cols-2 gap-3">
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

                  <div className="flex justify-end gap-2">
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
                  <Folder className="mt-1 h-5 w-5 text-text-secondary" />

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
                            ${isPast(parseISO(gate.deadline))
                              ? 'bg-crimson/20 border-crimson text-crimson'
                              : isToday(parseISO(gate.deadline))
                                ? 'bg-gold-primary/20 border-gold-primary text-gold-primary'
                                : 'bg-raised border-border-subtle text-text-secondary'}
                          `}>
                            {isToday(parseISO(gate.deadline))
                              ? 'Today'
                              : isTomorrow(parseISO(gate.deadline))
                                ? 'Tomorrow'
                                : isPast(parseISO(gate.deadline))
                                  ? 'Overdue'
                                  : format(parseISO(gate.deadline), 'PP')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => setEditingGateId(gate.id)}
                        className="px-3 py-1 text-xs border border-border-subtle text-text-secondary hover:bg-raised hover:text-text-primary rounded-sm transition-fast"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteGate(gate.id)}
                        className="px-3 py-1 text-xs border border-crimson text-crimson hover:bg-crimson/10 rounded-sm transition-fast"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
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

export default GatesList;