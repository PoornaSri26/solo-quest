import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Share2, Trophy, Award, TrendingUp, Plus, Edit, Trash2 } from 'lucide-react';
import { SocialStats } from '../shared/types';
import { useStore } from '../store/useStore';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function SocialPage() {
  const navigate = useNavigate();
  const { token } = useStore();
  const [socialStats, setSocialStats] = useState<SocialStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const pageRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      try {
        const [socialRes, leaderRes] = await Promise.all([
          fetch('http://localhost:5000/api/social/stats', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:5000/api/leaderboard', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (socialRes.ok) {
          const socialData = await socialRes.json();
          setSocialStats(socialData);
        }

        if (leaderRes.ok) {
          const leaderData = await leaderRes.json();
          setLeaderboard(leaderData);
        }
      } catch (error) {
        console.error('Failed to fetch social data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, navigate]);

  // GSAP animations
  useEffect(() => {
    if (!loading && socialStats) {
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
  }, [loading, socialStats]);

  const handleUpdateSocial = async (field: string, value: number) => {
    try {
      const res = await fetch('http://localhost:5000/api/social/stats', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (res.ok) {
        const data = await res.json();
        setSocialStats(data.socialStats);
      }
    } catch (error) {
      console.error('Failed to update social stats:', error);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset your social stats?')) return;

    try {
      const res = await fetch('http://localhost:5000/api/social/stats', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('Social stats reset successfully!');
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to reset social stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading social features...</div>
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
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-10 h-10 text-blue-400" />
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
            Social Features
          </h1>
        </div>

        <div ref={sectionsRef} className="grid gap-6 lg:grid-cols-2">
          {/* Social Stats */}
          {socialStats && (
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-blue-500/50 shadow-lg shadow-blue-500/20">
              <div className="flex items-center gap-3 mb-6">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">Your Social Stats</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    <span className="text-gray-300">Friends Added</span>
                  </div>
                  <div className="text-3xl font-display text-blue-400">{socialStats.friendsAdded}</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Quests Shared</span>
                  </div>
                  <div className="text-3xl font-display text-green-400">{socialStats.questsShared}</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-300">Achievements Shared</span>
                  </div>
                  <div className="text-3xl font-display text-purple-400">{socialStats.achievementsShared}</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-yellow-400" />
                    <span className="text-gray-300">Leaderboard Rank</span>
                  </div>
                  <div className="text-3xl font-display text-yellow-400">#{socialStats.leaderboardRank}</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-gray-300">Social Score</span>
                  </div>
                  <div className="text-3xl font-display text-yellow-500">{socialStats.socialScore}</div>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => handleUpdateSocial('friendsAdded', socialStats.friendsAdded + 1)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                >
                  + Friend
                </button>
                <button
                  onClick={() => handleUpdateSocial('questsShared', socialStats.questsShared + 1)}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-400 hover:from-green-500 hover:to-green-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                >
                  + Share Quest
                </button>
                <button
                  onClick={() => handleUpdateSocial('achievementsShared', socialStats.achievementsShared + 1)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                >
                  + Share Achievement
                </button>
              </div>

              <div className="mt-4">
                <button
                  onClick={handleReset}
                  className="w-full bg-gradient-to-r from-red-600 to-red-400 hover:from-red-500 hover:to-red-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                >
                  Reset Social Stats
                </button>
              </div>

              <div className="text-center text-gray-400 text-sm bg-slate-700/50 rounded-lg p-3 mt-4">
                Last updated: {new Date(socialStats.lastUpdated).toLocaleString()}
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-yellow-500/50 shadow-lg shadow-yellow-500/20">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
            </div>

            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                    index === 0 ? 'bg-yellow-400/20 border-2 border-yellow-400 shadow-lg shadow-yellow-400/20' :
                    index === 1 ? 'bg-gray-400/20 border-2 border-gray-400' :
                    index === 2 ? 'bg-orange-400/20 border-2 border-orange-400' :
                    'bg-slate-700/50 border border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
                      index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600 text-black' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                      'bg-slate-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{entry.user?.displayName || 'Anonymous'}</div>
                      <div className="text-sm text-gray-400">Level {entry.level}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-yellow-400 text-lg">Rank {entry.rank}</div>
                    <div className="text-sm text-gray-400">{entry.exp} XP</div>
                  </div>
                </div>
              ))}
            </div>

            {leaderboard.length === 0 && (
              <div className="text-center text-gray-400 py-8 bg-slate-700/50 rounded-lg">
                No leaderboard data available yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}