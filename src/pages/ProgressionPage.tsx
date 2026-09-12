import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Trophy, Star, Award, CheckCircle, Lock } from 'lucide-react';
import { useStore } from '../store/useStore';

interface ProgressionData {
  currentLevel: number;
  currentRank: string;
  currentEndpoint: any;
  nextEndpoint: any;
  milestonesCompleted: number;
  masteryChallengesCompleted: number;
  mementosCollected: number;
  totalMementos: number;
  completionPercentage: number;
  isEndgame: boolean;
}

export default function ProgressionPage() {
  const navigate = useNavigate();
  const { token } = useStore();
  const [progression, setProgression] = useState<ProgressionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }

    const fetchProgression = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/progression/endpoint', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setProgression(data);
        }
      } catch (error) {
        console.error('Failed to fetch progression:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgression();
  }, [token, navigate]);

  const handleCompleteChapter = async (chapterName: string) => {
    try {
      const res = await fetch('http://localhost:5000/api/progression/complete-chapter', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chapterName }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to complete chapter:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading progression...</div>
      </div>
    );
  }

  const chapters = [
    { name: 'Novice Hunter', level: 10, rank: 'D' },
    { name: 'Skilled Hunter', level: 20, rank: 'C' },
    { name: 'Elite Hunter', level: 30, rank: 'B' },
    { name: 'Master Hunter', level: 40, rank: 'A' },
    { name: 'Legendary Hunter', level: 50, rank: 'S' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Flag className="w-8 h-8 text-yellow-400" />
          <h1 className="text-4xl font-bold">Progression Path</h1>
        </div>

        {progression && (
          <>
            {/* Current Status */}
            <div className="bg-gray-800 rounded-lg p-6 border border-yellow-400 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">Current Status</h2>
                  <p className="text-gray-400">Level {progression.currentLevel} - Rank {progression.currentRank}</p>
                </div>
                {progression.isEndgame && (
                  <div className="bg-yellow-400/20 border border-yellow-400 px-4 py-2 rounded">
                    <span className="text-yellow-400 font-bold">🏆 ENDGAME</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-display text-yellow-400">{progression.milestonesCompleted}</div>
                  <div className="text-sm text-gray-400">Milestones</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-display text-purple-400">{progression.masteryChallengesCompleted}</div>
                  <div className="text-sm text-gray-400">Mastery Challenges</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-display text-blue-400">{progression.mementosCollected}/{progression.totalMementos}</div>
                  <div className="text-sm text-gray-400">Mementos</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Overall Completion</span>
                  <span>{progression.completionPercentage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-3 rounded-full transition-all"
                    style={{ width: `${progression.completionPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Chapter Progression */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-4">Chapter Progression</h2>
              {chapters.map((chapter, index) => {
                const isCompleted = progression.currentLevel >= chapter.level;
                const isCurrent = progression.currentLevel < chapter.level && (index === 0 || progression.currentLevel >= chapters[index - 1].level);
                const isLocked = !isCompleted && !isCurrent;

                return (
                  <div
                    key={chapter.name}
                    className={`bg-gray-800 rounded-lg p-6 border-2 ${
                      isCompleted ? 'border-green-400' :
                      isCurrent ? 'border-yellow-400' :
                      'border-gray-700 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-green-400' :
                          isCurrent ? 'bg-yellow-400' :
                          'bg-gray-600'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-6 h-6 text-black" />
                          ) : isCurrent ? (
                            <Star className="w-6 h-6 text-black" />
                          ) : (
                            <Lock className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{chapter.name}</h3>
                          <p className="text-gray-400">Level {chapter.level} - Rank {chapter.rank}</p>
                        </div>
                      </div>

                      {isCompleted && (
                        <div className="text-green-400 font-semibold">Completed</div>
                      )}

                      {isCurrent && (
                        <button
                          onClick={() => handleCompleteChapter(chapter.name)}
                          className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded font-semibold transition"
                        >
                          Complete Chapter
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Endgame Message */}
            {progression.isEndgame && (
              <div className="mt-8 bg-gradient-to-r from-yellow-400/20 to-purple-400/20 rounded-lg p-8 border border-yellow-400 text-center">
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2">Congratulations, Legendary Hunter!</h2>
                <p className="text-gray-300 mb-4">
                  You have reached the pinnacle of hunter progression. Continue to complete mastery challenges
                  and collect all mementos to achieve 100% completion.
                </p>
                <div className="flex justify-center gap-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    <span>{progression.mementosCollected}/{progression.totalMementos} Mementos</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
