import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, Lock, CheckCircle, Circle, Plus, Edit, Trash2 } from 'lucide-react';
import { Milestone, MilestoneProgress } from '../shared/types';
import { useStore } from '../store/useStore';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function MilestonesPage() {
  const navigate = useNavigate();
  const { token } = useStore();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [progress, setProgress] = useState<MilestoneProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    requirement: '',
    xpReward: 0,
    goldReward: 0,
  });

  const pageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }

    const fetchMilestones = async () => {
      try {
        const [mileRes, progRes] = await Promise.all([
          fetch('http://localhost:5000/api/milestones', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:5000/api/milestones/progress', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (mileRes.ok && progRes.ok) {
          const mileData = await mileRes.json();
          const progData = await progRes.json();
          setMilestones(mileData);
          setProgress(progData);
        }
      } catch (error) {
        console.error('Failed to fetch milestones:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMilestones();
  }, [token, navigate]);

  // GSAP animations
  useEffect(() => {
    if (!loading && milestones.length > 0) {
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
  }, [loading, milestones]);

  const handleComplete = async (milestoneId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/milestones/${milestoneId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Milestone completed! Earned ${data.reward.xp} XP and ${data.reward.gold} Gold`);
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to complete milestone:', error);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/milestones', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('Milestone created successfully!');
        setShowCreateModal(false);
        setFormData({ name: '', description: '', requirement: '', xpReward: 0, goldReward: 0 });
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to create milestone:', error);
    }
  };

  const handleUpdate = async () => {
    if (!selectedMilestone) return;

    try {
      const res = await fetch(`http://localhost:5000/api/milestones/${selectedMilestone.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('Milestone updated successfully!');
        setShowEditModal(false);
        setSelectedMilestone(null);
        setFormData({ name: '', description: '', requirement: '', xpReward: 0, goldReward: 0 });
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to update milestone:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;

    try {
      const res = await fetch(`http://localhost:5000/api/milestones/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('Milestone deleted successfully!');
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to delete milestone:', error);
    }
  };

  const getProgressForMilestone = (milestoneId: string) => {
    return progress.find(p => p.milestoneId === milestoneId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading milestones...</div>
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
            <Trophy className="w-10 h-10 text-yellow-400" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
              Milestones
            </h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Milestone
          </button>
        </div>

        <div ref={cardsRef} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {milestones.map((milestone) => {
            const milestoneProgress = getProgressForMilestone(milestone.id);
            const isCompleted = milestoneProgress?.completed;

            return (
              <div
                key={milestone.id}
                className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl p-6 border-2 transition-all duration-300 transform hover:scale-105 hover:rotate-1 ${
                  isCompleted ? 'border-yellow-400 shadow-lg shadow-yellow-400/20' : 'border-purple-500/50 shadow-lg shadow-purple-500/20'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-yellow-400" />
                      ) : (
                        <Circle className="w-6 h-6 text-purple-400" />
                      )}
                      <h2 className="text-xl font-bold text-white">{milestone.name}</h2>
                    </div>
                    <p className="text-gray-300 mb-3 text-sm">{milestone.description}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Target className="w-4 h-4 text-cyan-400" />
                      <span>{milestone.requirement}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-yellow-400 font-bold text-lg">+{milestone.xpReward}</div>
                    <div className="text-xs text-gray-400">XP</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-yellow-500 font-bold text-lg">+{milestone.goldReward}</div>
                    <div className="text-xs text-gray-400">Gold</div>
                  </div>
                </div>

                {milestone.mementoId && (
                  <div className="text-purple-400 text-sm mb-4 bg-purple-500/20 rounded-lg p-2 text-center">
                    🎁 Memento Reward
                  </div>
                )}

                <div className="flex gap-2">
                  {!isCompleted && (
                    <button
                      onClick={() => handleComplete(milestone.id)}
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-400 hover:from-green-500 hover:to-green-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                    >
                      Complete
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedMilestone(milestone);
                      setFormData({
                        name: milestone.name,
                        description: milestone.description,
                        requirement: milestone.requirement,
                        xpReward: milestone.xpReward,
                        goldReward: milestone.goldReward,
                      });
                      setShowEditModal(true);
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(milestone.id)}
                    className="bg-gradient-to-r from-red-600 to-red-400 hover:from-red-500 hover:to-red-300 px-3 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {milestones.length === 0 && (
          <div className="text-center text-gray-400 py-12 bg-slate-800/50 backdrop-blur-sm rounded-xl">
            <Lock className="w-16 h-16 mx-auto mb-4 text-purple-400" />
            <p className="text-xl">No milestones available yet</p>
            <p className="text-sm mt-2">Create your first milestone to start tracking progress!</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-purple-500/50 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-white">Create Milestone</h2>
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
                placeholder="Requirement"
                value={formData.requirement}
                onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="XP Reward"
                  value={formData.xpReward}
                  onChange={(e) => setFormData({ ...formData, xpReward: parseInt(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                />
                <input
                  type="number"
                  placeholder="Gold Reward"
                  value={formData.goldReward}
                  onChange={(e) => setFormData({ ...formData, goldReward: parseInt(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
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
      {showEditModal && selectedMilestone && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-purple-500/50 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-white">Edit Milestone</h2>
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
                placeholder="Requirement"
                value={formData.requirement}
                onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="XP Reward"
                  value={formData.xpReward}
                  onChange={(e) => setFormData({ ...formData, xpReward: parseInt(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                />
                <input
                  type="number"
                  placeholder="Gold Reward"
                  value={formData.goldReward}
                  onChange={(e) => setFormData({ ...formData, goldReward: parseInt(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
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
