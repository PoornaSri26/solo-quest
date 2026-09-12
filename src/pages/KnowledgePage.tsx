import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, TrendingUp, Route, Lightbulb, Award } from 'lucide-react';
import { KnowledgeProgress } from '../shared/types';
import { useStore } from '../store/useStore';

export default function KnowledgePage() {
  const navigate = useNavigate();
  const { token } = useStore();
  const [knowledge, setKnowledge] = useState<KnowledgeProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }

    const fetchKnowledge = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/knowledge', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setKnowledge(data);
        }
      } catch (error) {
        console.error('Failed to fetch knowledge progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKnowledge();
  }, [token, navigate]);

  const handleUpdate = async (field: string, value: number) => {
    try {
      const res = await fetch('http://localhost:5000/api/knowledge', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (res.ok) {
        const data = await res.json();
        setKnowledge(data.knowledge);
      }
    } catch (error) {
      console.error('Failed to update knowledge:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading knowledge progress...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Brain className="w-8 h-8 text-purple-400" />
          <h1 className="text-4xl font-bold">Knowledge Progression</h1>
        </div>

        <div className="mb-6">
          <p className="text-gray-400">
            Track your understanding of quest patterns, optimal routes, and efficiency improvements.
            Knowledge progression rewards strategic play over raw task volume.
          </p>
        </div>

        {knowledge && (
          <div className="space-y-6">
            {/* Quest Patterns Learned */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="w-6 h-6 text-yellow-400" />
                <h2 className="text-xl font-bold">Quest Patterns Learned</h2>
              </div>
              <div className="text-4xl font-display text-yellow-400 mb-4">
                {knowledge.questPatternsLearned}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate('questPatternsLearned', knowledge.questPatternsLearned + 1)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition"
                >
                  +1 Pattern
                </button>
              </div>
            </div>

            {/* Optimal Routes Discovered */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <Route className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold">Optimal Routes Discovered</h2>
              </div>
              <div className="text-4xl font-display text-blue-400 mb-4">
                {knowledge.optimalRoutesDiscovered}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate('optimalRoutesDiscovered', knowledge.optimalRoutesDiscovered + 1)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition"
                >
                  +1 Route
                </button>
              </div>
            </div>

            {/* Shortcuts Unlocked */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-green-400" />
                <h2 className="text-xl font-bold">Shortcuts Unlocked</h2>
              </div>
              <div className="text-4xl font-display text-green-400 mb-4">
                {knowledge.shortcutsUnlocked}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate('shortcutsUnlocked', knowledge.shortcutsUnlocked + 1)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition"
                >
                  +1 Shortcut
                </button>
              </div>
            </div>

            {/* Efficiency Rating */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-bold">Efficiency Rating</h2>
              </div>
              <div className="text-4xl font-display text-purple-400 mb-4">
                {knowledge.efficiencyRating}%
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
                <div
                  className="bg-purple-400 h-4 rounded-full transition-all"
                  style={{ width: `${knowledge.efficiencyRating}%` }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate('efficiencyRating', Math.min(100, knowledge.efficiencyRating + 5))}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition"
                >
                  +5% Rating
                </button>
              </div>
            </div>

            {/* Last Updated */}
            <div className="text-center text-gray-500 text-sm">
              Last updated: {new Date(knowledge.lastUpdated).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
