import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gem, Lock, Star } from 'lucide-react';
import { Memento, UserMemento } from '../shared/types';
import { useStore } from '../store/useStore';

export default function MementosPage() {
  const navigate = useNavigate();
  const { token } = useStore();
  const [allMementos, setAllMementos] = useState<Memento[]>([]);
  const [userMementos, setUserMementos] = useState<UserMemento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }

    const fetchMementos = async () => {
      try {
        const [allRes, userRes] = await Promise.all([
          fetch('http://localhost:5000/api/mementos', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:5000/api/mementos/user', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (allRes.ok && userRes.ok) {
          const allData = await allRes.json();
          const userData = await userRes.json();
          setAllMementos(allData);
          setUserMementos(userData);
        }
      } catch (error) {
        console.error('Failed to fetch mementos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMementos();
  }, [token, navigate]);

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common':
        return 'text-gray-400 border-gray-400';
      case 'uncommon':
        return 'text-green-400 border-green-400';
      case 'rare':
        return 'text-blue-400 border-blue-400';
      case 'epic':
        return 'text-purple-400 border-purple-400';
      case 'legendary':
        return 'text-yellow-400 border-yellow-400';
      default:
        return 'text-gray-400 border-gray-400';
    }
  };

  const isUnlocked = (mementoId: string) => {
    return userMementos.some(um => um.mementoId === mementoId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading mementos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Gem className="w-8 h-8 text-purple-400" />
          <h1 className="text-4xl font-bold">Mementos</h1>
        </div>

        <div className="mb-6">
          <p className="text-gray-400">Collect mementos by completing milestones and achievements</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {allMementos.map((memento) => {
            const unlocked = isUnlocked(memento.id);

            return (
              <div
                key={memento.id}
                className={`bg-gray-800 rounded-lg p-6 border-2 ${getRarityColor(memento.rarity)} ${
                  !unlocked ? 'opacity-60' : ''
                }`}
              >
                <div className="text-center mb-4">
                  <div className="text-5xl mb-2">{memento.icon}</div>
                  <h2 className="text-xl font-bold">{memento.name}</h2>
                  <div className={`text-sm font-semibold ${getRarityColor(memento.rarity)}`}>
                    {memento.rarity.toUpperCase()}
                  </div>
                </div>

                <p className="text-gray-400 text-sm mb-4 text-center">{memento.description}</p>

                <div className="text-center text-sm text-gray-500 mb-4">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-4 h-4" />
                    <span>{memento.category}</span>
                  </div>
                </div>

                {unlocked ? (
                  <div className="text-center text-green-400 font-semibold">
                    ✓ Unlocked
                  </div>
                ) : (
                  <div className="text-center text-gray-500 flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>Locked</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {allMementos.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <Gem className="w-16 h-16 mx-auto mb-4" />
            <p className="text-xl">No mementos available yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
