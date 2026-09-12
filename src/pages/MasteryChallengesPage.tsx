import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, Zap, TrendingUp, CheckCircle, Circle } from 'lucide-react';
import { MasteryChallenge, MasteryChallengeProgress } from '../shared/types';
import { useStore } from '../store/useStore';

export default function MasteryChallengesPage() {
  const navigate = useNavigate();
  const { token } = useStore();
  const [challenges, setChallenges] = useState<MasteryChallenge[]>([]);
  const [progress, setProgress] = useState<MasteryChallengeProgress[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getProgressForChallenge = (challengeId: string) => {
    return progress.find(p => p.challengeId === challengeId);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'hard':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading mastery challenges...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <h1 className="text-4xl font-bold">Mastery Challenges</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {challenges.map((challenge) => {
            const challengeProgress = getProgressForChallenge(challenge.id);
            const isCompleted = challengeProgress?.completed;

            return (
              <div
                key={challenge.id}
                className={`bg-gray-800 rounded-lg p-6 border-2 ${
                  isCompleted ? 'border-yellow-400' : 'border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-yellow-400" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-500" />
                      )}
                      <h2 className="text-xl font-bold">{challenge.name}</h2>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">{challenge.description}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <Target className="w-4 h-4" />
                      <span>{challenge.requirement}</span>
                    </div>
                    <div className={`text-sm font-semibold ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400">+{challenge.xpReward} XP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-500">+{challenge.goldReward} Gold</span>
                  </div>
                </div>

                {challengeProgress && (
                  <div className="text-gray-400 text-sm mb-4">
                    Attempts: {challengeProgress.attempts}
                    {challengeProgress.bestScore !== null && (
                      <span className="ml-2">Best Score: {challengeProgress.bestScore}</span>
                    )}
                  </div>
                )}

                {!isCompleted && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Score (0-100)"
                      className="bg-gray-700 px-3 py-2 rounded w-24 text-white"
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
                      className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold transition flex-1"
                    >
                      Submit Attempt
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {challenges.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4" />
            <p className="text-xl">No mastery challenges available yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
