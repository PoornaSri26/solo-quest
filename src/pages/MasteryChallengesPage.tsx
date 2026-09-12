import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, Zap, TrendingUp, CheckCircle, Circle, Plus, Edit, Trash2 } from 'lucide-react';
import { MasteryChallenge, MasteryChallengeProgress } from '../shared/types';
import { useStore } from '../store/useStore';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function MasteryChallengesPage() {
  const navigate = useNavigate();
  const { token } = useStore();
  const [challenges, setChallenges] = useState<MasteryChallenge[]>([]);
  const [progress, setProgress] = useState<MasteryChallengeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<MasteryChallenge | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    requirement: '',
    xpReward: 0,
    goldReward: 0,
    difficulty: 'EASY',
  });

  const pageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }

    const fetchChallenges = async () => {
      try {
        const [chalRes, progRes] = await Promise.all([
          fetch('http://localhost:5000/api/mastery-challenges', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:5000/api/mastery-challenges/progress', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (chalRes.ok && progRes.ok) {
          const chalData = await chalRes.json();
          const progData = await progRes.json();
          setChallenges(chalData);
          setProgress(progData);
        }
      } catch (error) {
        console.error('Failed to fetch challenges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, [token, navigate]);

  // GSAP animations
  useEffect(() => {
    if (!loading && challenges.length > 0) {
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
  }, [loading, challenges]);

  const handleAttempt = async (challengeId: string, score: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/mastery-challenges/${challengeId}/attempt`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.progress.completed) {
          alert(`Challenge completed! Score: ${score}`);
        } else {
          alert(`Attempt recorded. Best score: ${data.progress.bestScore}`);
        }
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to attempt challenge:', error);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/mastery-challenges', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('Challenge created successfully!');
        setShowCreateModal(false);
        setFormData({ name: '', description: '', requirement: '', xpReward: 0, goldReward: 0, difficulty: 'EASY' });
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to create challenge:', error);
    }
  };

  const handleUpdate = async () => {
    if (!selectedChallenge) return;

    try {
      const res = await fetch(`http://localhost:5000/api/mastery-challenges/${selectedChallenge.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('Challenge updated successfully!');
        setShowEditModal(false);
        setSelectedChallenge(null);
        setFormData({ name: '', description: '', requirement: '', xpReward: 0, goldReward: 0, difficulty: 'EASY' });
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to update challenge:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return;

    try {
      const res = await fetch(`http://localhost:5000/api/mastery-challenges/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('Challenge deleted successfully!');
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to delete challenge:', error);
    }
  };

  const getProgressForChallenge = (challengeId: string) => {
    return progress.find(p => p.challengeId === challengeId);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'text-green-400 border-green-400';
      case 'medium':
        return 'text-yellow-400 border-yellow-400';
      case 'hard':
        return 'text-red-400 border-red-400';
      default:
        return 'text-gray-400 border-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading mastery challenges...</div>
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
              Mastery Challenges
            </h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Challenge
          </button>
        </div>

        <div ref={cardsRef} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {challenges.map((challenge) => {
            const challengeProgress = getProgressForChallenge(challenge.id);
            const isCompleted = challengeProgress?.completed;

            return (
              <div
                key={challenge.id}
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
                      <h2 className="text-xl font-bold text-white">{challenge.name}</h2>
                    </div>
                    <p className="text-gray-300 mb-3 text-sm">{challenge.description}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                      <Target className="w-4 h-4 text-cyan-400" />
                      <span>{challenge.requirement}</span>
                    </div>
                    <div className={`text-sm font-semibold px-2 py-1 rounded inline-block ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-yellow-400 font-bold text-lg">
                      <Zap className="w-4 h-4" />
                      +{challenge.xpReward}
                    </div>
                    <div className="text-xs text-gray-400">XP</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-yellow-500 font-bold text-lg">
                      <TrendingUp className="w-4 h-4" />
                      +{challenge.goldReward}
                    </div>
                    <div className="text-xs text-gray-400">Gold</div>
                  </div>
                </div>

                {challengeProgress && (
                  <div className="text-gray-400 text-sm mb-4 bg-slate-700/50 rounded-lg p-2">
                    Attempts: {challengeProgress.attempts}
                    {challengeProgress.bestScore !== null && (
                      <span className="ml-2">Best Score: {challengeProgress.bestScore}</span>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {!isCompleted && (
                    <div className="flex gap-2 flex-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Score"
                        className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white w-20"
                        id={`score-${challenge.id}`}
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById(`score-${challenge.id}`) as HTMLInputElement;
                          const score = parseInt(input.value);
                          if (!isNaN(score) && score >= 0 && score <= 100) {
                            handleAttempt(challenge.id, score);
                          } else {
                            alert('Please enter a valid score between 0 and 100');
                          }
                        }}
                        className="flex-1 bg-gradient-to-r from-green-600 to-green-400 hover:from-green-500 hover:to-green-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                      >
                        Submit
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setSelectedChallenge(challenge);
                      setFormData({
                        name: challenge.name,
                        description: challenge.description,
                        requirement: challenge.requirement,
                        xpReward: challenge.xpReward,
                        goldReward: challenge.goldReward,
                        difficulty: challenge.difficulty,
                      });
                      setShowEditModal(true);
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(challenge.id)}
                    className="bg-gradient-to-r from-red-600 to-red-400 hover:from-red-500 hover:to-red-300 px-3 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {challenges.length === 0 && (
          <div className="text-center text-gray-400 py-12 bg-slate-800/50 backdrop-blur-sm rounded-xl">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-purple-400" />
            <p className="text-xl">No mastery challenges available yet</p>
            <p className="text-sm mt-2">Create your first challenge to test your skills!</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-purple-500/50 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-white">Create Challenge</h2>
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
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
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
      {showEditModal && selectedChallenge && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-purple-500/50 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-white">Edit Challenge</h2>
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
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
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