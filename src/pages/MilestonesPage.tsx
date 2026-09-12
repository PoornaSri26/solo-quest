import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, Lock, CheckCircle, Circle } from 'lucide-react';
import { Milestone, MilestoneProgress } from '../shared/types';
import { useStore } from '../store/useStore';

export default function MilestonesPage() {
  const navigate = useNavigate();
  const { token } = useStore();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [progress, setProgress] = useState<MilestoneProgress[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getProgressForMilestone = (milestoneId: string) => {
    return progress.find(p => p.milestoneId === milestoneId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading milestones...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <h1 className="text-4xl font-bold">Milestones</h1>
        </div>

        <div className="grid gap-6">
          {milestones.map((milestone) => {
            const milestoneProgress = getProgressForMilestone(milestone.id);
            const isCompleted = milestoneProgress?.completed;

            return (
              <div
                key={milestone.id}
                className={`bg-gray-800 rounded-lg p-6 border-2 ${
                  isCompleted ? 'border-yellow-400' : 'border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-yellow-400" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-500" />
                      )}
                      <h2 className="text-2xl font-bold">{milestone.name}</h2>
                    </div>
                    <p className="text-gray-400 mb-3">{milestone.description}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Target className="w-4 h-4" />
                      <span>{milestone.requirement}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-yellow-400 font-bold mb-2">
                      +{milestone.xpReward} XP
                    </div>
                    <div className="text-yellow-500 font-bold mb-4">
                      +{milestone.goldReward} Gold
                    </div>
                    {milestone.mementoId && (
                      <div className="text-purple-400 text-sm mb-4">
                        🎁 Memento Reward
                      </div>
                    )}
                    {!isCompleted && (
                      <button
                        onClick={() => handleComplete(milestone.id)}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold transition"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {milestones.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <Lock className="w-16 h-16 mx-auto mb-4" />
            <p className="text-xl">No milestones available yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
