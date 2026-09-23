import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, Lock, CheckCircle, Circle, Plus, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Milestone, MilestoneProgress } from '../shared/types';
import { useStore } from '../store/useStore';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createAuthApi } from '../lib/api';

gsap.registerPlugin(ScrollTrigger);

export default function MilestonesPage() {
  const navigate = useNavigate();
  const { token } = useStore();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [progress, setProgress] = useState<MilestoneProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const pageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }

    const fetchMilestones = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const api = createAuthApi(() => token);
        const [mileData, progData] = await Promise.all([
          api.get('/milestones'),
          api.get('/milestones/progress'),
        ]);

        setMilestones(mileData);
        setProgress(progData);
      } catch (error) {
        console.error('Failed to fetch milestones:', error);
        setError('Failed to load milestones. Please try again.');
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

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }
    if (!formData.requirement.trim()) {
      errors.requirement = 'Requirement is required';
    }
    if (formData.xpReward < 0) {
      errors.xpReward = 'XP reward must be positive';
    }
    if (formData.goldReward < 0) {
      errors.goldReward = 'Gold reward must be positive';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleComplete = async (milestoneId: string) => {
    try {
      setActionLoading('complete');
      setError(null);
      
      const api = createAuthApi(() => token);
      const data = await api.post(`/milestones/${milestoneId}/complete`);

      alert(`Milestone completed! Earned ${data.reward.xp} XP and ${data.reward.gold} Gold`);
      window.location.reload();
    } catch (error) {
      console.error('Failed to complete milestone:', error);
      setError('Failed to complete milestone. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      setActionLoading('create');
      setError(null);
      
      const api = createAuthApi(() => token);
      await api.post('/milestones', formData);

      alert('Milestone created successfully!');
      setShowCreateModal(false);
      setFormData({ name: '', description: '', requirement: '', xpReward: 0, goldReward: 0 });
      setFormErrors({});
      window.location.reload();
    } catch (error) {
      console.error('Failed to create milestone:', error);
      setError('Failed to create milestone. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdate = async () => {
    if (!selectedMilestone) return;
    if (!validateForm()) return;

    try {
      setActionLoading('update');
      setError(null);
      
      const api = createAuthApi(() => token);
      await api.patch(`/milestones/${selectedMilestone.id}`, formData);

      alert('Milestone updated successfully!');
      setShowEditModal(false);
      setSelectedMilestone(null);
      setFormData({ name: '', description: '', requirement: '', xpReward: 0, goldReward: 0 });
      setFormErrors({});
      window.location.reload();
    } catch (error) {
      console.error('Failed to update milestone:', error);
      setError('Failed to update milestone. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;

    try {
      setActionLoading('delete');
      setError(null);
      
      const api = createAuthApi(() => token);
      await api.delete(`/milestones/${id}`);

      alert('Milestone deleted successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete milestone:', error);
      setError('Failed to delete milestone. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const getProgressForMilestone = (milestoneId: string) => {
    return progress.find(p => p.milestoneId === milestoneId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" aria-hidden="true" />
          <div className="text-xl">Loading milestones...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-8">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      <div ref={pageRef} className="max-w-7xl mx-auto relative z-10">
        {/* Error Display */}
        {error && (
          <div 
            className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" aria-hidden="true" />
              <span className="text-red-200">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-200"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-400" aria-hidden="true" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
              Milestones
            </h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
            aria-label="Create new milestone"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
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
                      disabled={actionLoading !== null}
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-400 hover:from-green-500 hover:to-green-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      aria-label={`Complete milestone: ${milestone.name}`}
                    >
                      {actionLoading === 'complete' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          Completing...
                        </>
                      ) : (
                        'Complete'
                      )}
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
                    disabled={actionLoading !== null}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Edit milestone: ${milestone.name}`}
                  >
                    <Edit className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => handleDelete(milestone.id)}
                    disabled={actionLoading !== null}
                    className="bg-gradient-to-r from-red-600 to-red-400 hover:from-red-500 hover:to-red-300 px-3 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Delete milestone: ${milestone.name}`}
                  >
                    {actionLoading === 'delete' ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    )}
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
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-milestone-title"
        >
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-purple-500/50 max-w-md w-full">
            <h2 id="create-milestone-title" className="text-2xl font-bold mb-4 text-white">Create Milestone</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4" noValidate>
              <div>
                <label htmlFor="milestone-name" className="sr-only">Name</label>
                <input
                  id="milestone-name"
                  type="text"
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setFormErrors({ ...formErrors, name: '' });
                  }}
                  className={`w-full bg-slate-700 border rounded-lg px-4 py-2 text-white ${
                    formErrors.name ? 'border-red-500' : 'border-slate-600'
                  }`}
                  aria-invalid={!!formErrors.name}
                  aria-describedby={formErrors.name ? 'name-error' : undefined}
                  maxLength={100}
                />
                {formErrors.name && (
                  <p id="name-error" className="text-red-400 text-sm mt-1" role="alert">{formErrors.name}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="milestone-description" className="sr-only">Description</label>
                <textarea
                  id="milestone-description"
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    setFormErrors({ ...formErrors, description: '' });
                  }}
                  className={`w-full bg-slate-700 border rounded-lg px-4 py-2 text-white ${
                    formErrors.description ? 'border-red-500' : 'border-slate-600'
                  }`}
                  rows={3}
                  aria-invalid={!!formErrors.description}
                  aria-describedby={formErrors.description ? 'description-error' : undefined}
                  maxLength={500}
                />
                {formErrors.description && (
                  <p id="description-error" className="text-red-400 text-sm mt-1" role="alert">{formErrors.description}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="milestone-requirement" className="sr-only">Requirement</label>
                <input
                  id="milestone-requirement"
                  type="text"
                  placeholder="Requirement"
                  value={formData.requirement}
                  onChange={(e) => {
                    setFormData({ ...formData, requirement: e.target.value });
                    setFormErrors({ ...formErrors, requirement: '' });
                  }}
                  className={`w-full bg-slate-700 border rounded-lg px-4 py-2 text-white ${
                    formErrors.requirement ? 'border-red-500' : 'border-slate-600'
                  }`}
                  aria-invalid={!!formErrors.requirement}
                  aria-describedby={formErrors.requirement ? 'requirement-error' : undefined}
                  maxLength={200}
                />
                {formErrors.requirement && (
                  <p id="requirement-error" className="text-red-400 text-sm mt-1" role="alert">{formErrors.requirement}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="milestone-xp" className="sr-only">XP Reward</label>
                  <input
                    id="milestone-xp"
                    type="number"
                    placeholder="XP Reward"
                    value={formData.xpReward}
                    onChange={(e) => {
                      setFormData({ ...formData, xpReward: parseInt(e.target.value) || 0 });
                      setFormErrors({ ...formErrors, xpReward: '' });
                    }}
                    className={`w-full bg-slate-700 border rounded-lg px-4 py-2 text-white ${
                      formErrors.xpReward ? 'border-red-500' : 'border-slate-600'
                    }`}
                    min="0"
                    aria-invalid={!!formErrors.xpReward}
                    aria-describedby={formErrors.xpReward ? 'xp-error' : undefined}
                  />
                  {formErrors.xpReward && (
                    <p id="xp-error" className="text-red-400 text-sm mt-1" role="alert">{formErrors.xpReward}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="milestone-gold" className="sr-only">Gold Reward</label>
                  <input
                    id="milestone-gold"
                    type="number"
                    placeholder="Gold Reward"
                    value={formData.goldReward}
                    onChange={(e) => {
                      setFormData({ ...formData, goldReward: parseInt(e.target.value) || 0 });
                      setFormErrors({ ...formErrors, goldReward: '' });
                    }}
                    className={`w-full bg-slate-700 border rounded-lg px-4 py-2 text-white ${
                      formErrors.goldReward ? 'border-red-500' : 'border-slate-600'
                    }`}
                    min="0"
                    aria-invalid={!!formErrors.goldReward}
                    aria-describedby={formErrors.goldReward ? 'gold-error' : undefined}
                  />
                  {formErrors.goldReward && (
                    <p id="gold-error" className="text-red-400 text-sm mt-1" role="alert">{formErrors.goldReward}</p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormErrors({});
                  }}
                  disabled={actionLoading === 'create'}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'create'}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading === 'create' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedMilestone && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-milestone-title"
        >
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-purple-500/50 max-w-md w-full">
            <h2 id="edit-milestone-title" className="text-2xl font-bold mb-4 text-white">Edit Milestone</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-4" noValidate>
              <div>
                <label htmlFor="edit-milestone-name" className="sr-only">Name</label>
                <input
                  id="edit-milestone-name"
                  type="text"
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setFormErrors({ ...formErrors, name: '' });
                  }}
                  className={`w-full bg-slate-700 border rounded-lg px-4 py-2 text-white ${
                    formErrors.name ? 'border-red-500' : 'border-slate-600'
                  }`}
                  aria-invalid={!!formErrors.name}
                  aria-describedby={formErrors.name ? 'edit-name-error' : undefined}
                  maxLength={100}
                />
                {formErrors.name && (
                  <p id="edit-name-error" className="text-red-400 text-sm mt-1" role="alert">{formErrors.name}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="edit-milestone-description" className="sr-only">Description</label>
                <textarea
                  id="edit-milestone-description"
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    setFormErrors({ ...formErrors, description: '' });
                  }}
                  className={`w-full bg-slate-700 border rounded-lg px-4 py-2 text-white ${
                    formErrors.description ? 'border-red-500' : 'border-slate-600'
                  }`}
                  rows={3}
                  aria-invalid={!!formErrors.description}
                  aria-describedby={formErrors.description ? 'edit-description-error' : undefined}
                  maxLength={500}
                />
                {formErrors.description && (
                  <p id="edit-description-error" className="text-red-400 text-sm mt-1" role="alert">{formErrors.description}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="edit-milestone-requirement" className="sr-only">Requirement</label>
                <input
                  id="edit-milestone-requirement"
                  type="text"
                  placeholder="Requirement"
                  value={formData.requirement}
                  onChange={(e) => {
                    setFormData({ ...formData, requirement: e.target.value });
                    setFormErrors({ ...formErrors, requirement: '' });
                  }}
                  className={`w-full bg-slate-700 border rounded-lg px-4 py-2 text-white ${
                    formErrors.requirement ? 'border-red-500' : 'border-slate-600'
                  }`}
                  aria-invalid={!!formErrors.requirement}
                  aria-describedby={formErrors.requirement ? 'edit-requirement-error' : undefined}
                  maxLength={200}
                />
                {formErrors.requirement && (
                  <p id="edit-requirement-error" className="text-red-400 text-sm mt-1" role="alert">{formErrors.requirement}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-milestone-xp" className="sr-only">XP Reward</label>
                  <input
                    id="edit-milestone-xp"
                    type="number"
                    placeholder="XP Reward"
                    value={formData.xpReward}
                    onChange={(e) => {
                      setFormData({ ...formData, xpReward: parseInt(e.target.value) || 0 });
                      setFormErrors({ ...formErrors, xpReward: '' });
                    }}
                    className={`w-full bg-slate-700 border rounded-lg px-4 py-2 text-white ${
                      formErrors.xpReward ? 'border-red-500' : 'border-slate-600'
                    }`}
                    min="0"
                    aria-invalid={!!formErrors.xpReward}
                    aria-describedby={formErrors.xpReward ? 'edit-xp-error' : undefined}
                  />
                  {formErrors.xpReward && (
                    <p id="edit-xp-error" className="text-red-400 text-sm mt-1" role="alert">{formErrors.xpReward}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="edit-milestone-gold" className="sr-only">Gold Reward</label>
                  <input
                    id="edit-milestone-gold"
                    type="number"
                    placeholder="Gold Reward"
                    value={formData.goldReward}
                    onChange={(e) => {
                      setFormData({ ...formData, goldReward: parseInt(e.target.value) || 0 });
                      setFormErrors({ ...formErrors, goldReward: '' });
                    }}
                    className={`w-full bg-slate-700 border rounded-lg px-4 py-2 text-white ${
                      formErrors.goldReward ? 'border-red-500' : 'border-slate-600'
                    }`}
                    min="0"
                    aria-invalid={!!formErrors.goldReward}
                    aria-describedby={formErrors.goldReward ? 'edit-gold-error' : undefined}
                  />
                  {formErrors.goldReward && (
                    <p id="edit-gold-error" className="text-red-400 text-sm mt-1" role="alert">{formErrors.goldReward}</p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setFormErrors({});
                  }}
                  disabled={actionLoading === 'update'}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'update'}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading === 'update' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Updating...
                    </>
                  ) : (
                    'Update'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
