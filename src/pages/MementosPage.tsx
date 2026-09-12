import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gem, Lock, Star, Plus, Edit, Trash2 } from 'lucide-react';
import { Memento, UserMemento } from '../shared/types';
import { useStore } from '../store/useStore';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function MementosPage() {
  const navigate = useNavigate();
  const { token } = useStore();
  const [allMementos, setAllMementos] = useState<Memento[]>([]);
  const [userMementos, setUserMementos] = useState<UserMemento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMemento, setSelectedMemento] = useState<Memento | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🎁',
    rarity: 'COMMON',
    category: 'ACHIEVEMENT',
  });

  const pageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

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

  // GSAP animations
  useEffect(() => {
    if (!loading && allMementos.length > 0) {
      gsap.fromTo(pageRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      );

      gsap.fromTo(cardsRef.current?.children || [],
        { y: 50, opacity: 0, rotationX: 10 },
        {
          y: 0, opacity: 1, rotationX: 0,
          duration: 0.6, stagger: 0.1,
          scrollTrigger: {
            trigger: cardsRef.current,
            start: "top 80%",
          }
        }
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [loading, allMementos]);

  const handleCreate = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/mementos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('Memento created successfully!');
        setShowCreateModal(false);
        setFormData({ name: '', description: '', icon: '🎁', rarity: 'COMMON', category: 'ACHIEVEMENT' });
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to create memento:', error);
    }
  };

  const handleUpdate = async () => {
    if (!selectedMemento) return;

    try {
      const res = await fetch(`http://localhost:5000/api/mementos/${selectedMemento.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('Memento updated successfully!');
        setShowEditModal(false);
        setSelectedMemento(null);
        setFormData({ name: '', description: '', icon: '🎁', rarity: 'COMMON', category: 'ACHIEVEMENT' });
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to update memento:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this memento?')) return;

    try {
      const res = await fetch(`http://localhost:5000/api/mementos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('Memento deleted successfully!');
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to delete memento:', error);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common':
        return 'text-gray-400 border-gray-400 bg-gray-400/10';
      case 'uncommon':
        return 'text-green-400 border-green-400 bg-green-400/10';
      case 'rare':
        return 'text-blue-400 border-blue-400 bg-blue-400/10';
      case 'epic':
        return 'text-purple-400 border-purple-400 bg-purple-400/10';
      case 'legendary':
        return 'text-yellow-400 border-yellow-400 bg-yellow-400/10';
      default:
        return 'text-gray-400 border-gray-400 bg-gray-400/10';
    }
  };

  const isUnlocked = (mementoId: string) => {
    return userMementos.some(um => um.mementoId === mementoId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading mementos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-8">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      <div ref={pageRef} className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Gem className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-purple-200 bg-clip-text text-transparent">
              Mementos
            </h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Memento
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-300">Collect mementos by completing milestones and achievements</p>
        </div>

        <div ref={cardsRef} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {allMementos.map((memento) => {
            const unlocked = isUnlocked(memento.id);

            return (
              <div
                key={memento.id}
                className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl p-6 border-2 transition-all duration-300 transform hover:scale-105 hover:rotate-1 ${getRarityColor(memento.rarity)} ${
                  !unlocked ? 'opacity-60' : ''
                }`}
              >
                <div className="text-center mb-4">
                  <div className="text-5xl mb-2 transform hover:scale-110 transition-transform">{memento.icon}</div>
                  <h2 className="text-xl font-bold text-white">{memento.name}</h2>
                  <div className={`text-sm font-semibold px-2 py-1 rounded inline-block ${getRarityColor(memento.rarity)}`}>
                    {memento.rarity.toUpperCase()}
                  </div>
                </div>

                <p className="text-gray-300 text-sm mb-4 text-center">{memento.description}</p>

                <div className="text-center text-sm text-gray-400 mb-4">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span>{memento.category}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {unlocked ? (
                    <div className="flex-1 text-center text-green-400 font-semibold bg-green-400/20 rounded-lg py-2">
                      ✓ Unlocked
                    </div>
                  ) : (
                    <div className="flex-1 text-center text-gray-500 flex items-center justify-center gap-2 bg-slate-700/50 rounded-lg py-2">
                      <Lock className="w-4 h-4" />
                      <span>Locked</span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setSelectedMemento(memento);
                      setFormData({
                        name: memento.name,
                        description: memento.description,
                        icon: memento.icon,
                        rarity: memento.rarity,
                        category: memento.category,
                      });
                      setShowEditModal(true);
                    }}
                    className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 px-3 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(memento.id)}
                    className="bg-gradient-to-r from-red-600 to-red-400 hover:from-red-500 hover:to-red-300 px-3 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {allMementos.length === 0 && (
          <div className="text-center text-gray-400 py-12 bg-slate-800/50 backdrop-blur-sm rounded-xl">
            <Gem className="w-16 h-16 mx-auto mb-4 text-purple-400" />
            <p className="text-xl">No mementos available yet</p>
            <p className="text-sm mt-2">Create your first memento to reward achievements!</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-purple-500/50 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-white">Create Memento</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                rows={3}
              />
              <input
                type="text"
                placeholder="Icon (emoji)"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
              <select
                value={formData.rarity}
                onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="COMMON">Common</option>
                <option value="UNCOMMON">Uncommon</option>
                <option value="RARE">Rare</option>
                <option value="EPIC">Epic</option>
                <option value="LEGENDARY">Legendary</option>
              </select>
              <input
                type="text"
                placeholder="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 px-4 py-2 rounded-lg font-semibold transition"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedMemento && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-purple-500/50 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-white">Edit Memento</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                rows={3}
              />
              <input
                type="text"
                placeholder="Icon (emoji)"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
              <select
                value={formData.rarity}
                onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="COMMON">Common</option>
                <option value="UNCOMMON">Uncommon</option>
                <option value="RARE">Rare</option>
                <option value="EPIC">Epic</option>
                <option value="LEGENDARY">Legendary</option>
              </select>
              <input
                type="text"
                placeholder="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 px-4 py-2 rounded-lg font-semibold transition"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
