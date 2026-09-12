import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Trophy, Star, Award, CheckCircle, Lock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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

  const pageRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);

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

  // GSAP animations
  useEffect(() => {
    if (!loading && progression) {
      gsap.fromTo(pageRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      );

      gsap.fromTo(sectionsRef.current?.children || [],
        { y: 50, opacity: 0, rotationX: 10 },
        {
          y: 0, opacity: 1, rotationX: 0,
          duration: 0.6, stagger: 0.1,
          scrollTrigger: {
            trigger: sectionsRef.current,
            start: "top 80%",
          }
        }
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [loading, progression]);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-8">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      <div ref={pageRef} className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <Flag className="w-10 h-10 text-yellow-400" />
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
            Progression Path
          </h1>
        </div>

        {progression && (
          <>
            {/* Current Status */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-yellow-400 shadow-lg shadow-yellow-400/20 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Current Status</h2>
                  <p className="text-gray-300">Level {progression.currentLevel} - Rank {progression.currentRank}</p>
                </div>
                {progression.isEndgame && (
                  <div className="bg-yellow-400/20 border-2 border-yellow-400 px-4 py-2 rounded-lg">
                    <span className="text-yellow-400 font-bold">🏆 ENDGAME</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center bg-slate-700/50 rounded-lg p-4">
                  <div className="text-3xl font-display text-yellow-400">{progression.milestonesCompleted}</div>
                  <div className="text-sm text-gray-400">Milestones</div>
                </div>
                <div className="text-center bg-slate-700/50 rounded-lg p-4">
                  <div className="text-3xl font-display text-purple-400">{progression.masteryChallengesCompleted}</div>
                  <div className="text-sm text-gray-400">Mastery Challenges</div>
                </div>
                <div className="text-center bg-slate-700/50 rounded-lg p-4">
                  <div className="text-3xl font-display text-blue-400">{progression.mementosCollected}/{progression.totalMementos}</div>
                  <div className="text-sm text-gray-400">Mementos</div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Overall Completion</span>
                  <span className="text-yellow-400 font-bold">{progression.completionPercentage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-4 rounded-full transition-all shadow-lg shadow-yellow-400/20"
                    style={{ width: `${progression.completionPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Chapter Progression */}
            <div ref={sectionsRef} className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">Chapter Progression</h2>
              {chapters.map((chapter, index) => {
                const isCompleted = progression.currentLevel >= chapter.level;
                const isCurrent = progression.currentLevel < chapter.level && (index === 0 || progression.currentLevel >= chapters[index - 1].level);
                const isLocked = !isCompleted && !isCurrent;

                return (
                  <div
                    key={chapter.name}
                    className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl p-6 border-2 transition-all duration-300 transform hover:scale-105 ${
                      isCompleted ? 'border-green-400 shadow-lg shadow-green-400/20' :
                      isCurrent ? 'border-yellow-400 shadow-lg shadow-yellow-400/20' :
                      'border-gray-700 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-gradient-to-br from-green-400 to-green-600' :
                          isCurrent ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                          'bg-slate-600'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-7 h-7 text-black" />
                          ) : isCurrent ? (
                            <Star className="w-7 h-7 text-black" />
                          ) : (
                            <Lock className="w-7 h-7 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{chapter.name}</h3>
                          <p className="text-gray-300">Level {chapter.level} - Rank {chapter.rank}</p>
                        </div>
                      </div>

                      {isCompleted && (
                        <div className="text-green-400 font-semibold bg-green-400/20 px-4 py-2 rounded-lg">Completed</div>
                      )}

                      {isCurrent && (
                        <button
                          onClick={() => handleCompleteChapter(chapter.name)}
                          className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
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
              <div className="mt-8 bg-gradient-to-br from-yellow-400/20 to-purple-400/20 backdrop-blur-sm rounded-xl p-8 border-2 border-yellow-400 text-center shadow-lg shadow-yellow-400/20">
                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2 text-white">Congratulations, Legendary Hunter!</h2>
                <p className="text-gray-300 mb-4">
                  You have reached the pinnacle of hunter progression. Continue to complete mastery challenges
                  and collect all mementos to achieve 100% completion.
                </p>
                <div className="flex justify-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-700/50 px-4 py-2 rounded-lg">
                    <Award className="w-5 h-5 text-purple-400" />
                    <span className="text-white">{progression.mementosCollected}/{progression.totalMementos} Mementos</span>
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