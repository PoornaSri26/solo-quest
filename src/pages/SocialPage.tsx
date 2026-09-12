import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Share2, Trophy, Award, TrendingUp } from 'lucide-react';
import { SocialStats } from '../shared/types';
import { useStore } from '../store/useStore';

export default function SocialPage() {
  const navigate = useNavigate();
  const { token } = useStore();
  const [socialStats, setSocialStats] = useState<SocialStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading social features...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-8 h-8 text-blue-400" />
          <h1 className="text-4xl font-bold">Social Features</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Social Stats */}
          {socialStats && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h2 className="text-2xl font-bold">Your Social Stats</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    <span>Friends Added</span>
                  </div>
                  <div className="text-2xl font-display text-blue-400">{socialStats.friendsAdded}</div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-green-400" />
                    <span>Quests Shared</span>
                  </div>
                  <div className="text-2xl font-display text-green-400">{socialStats.questsShared}</div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    <span>Achievements Shared</span>
                  </div>
                  <div className="text-2xl font-display text-purple-400">{socialStats.achievementsShared}</div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-yellow-400" />
                    <span>Leaderboard Rank</span>
                  </div>
                  <div className="text-2xl font-display text-yellow-400">#{socialStats.leaderboardRank}</div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-gold-primary" />
                    <span>Social Score</span>
                  </div>
                  <div className="text-2xl font-display text-gold-primary">{socialStats.socialScore}</div>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => handleUpdateSocial('friendsAdded', socialStats.friendsAdded + 1)}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition"
                >
                  + Friend
                </button>
                <button
                  onClick={() => handleUpdateSocial('questsShared', socialStats.questsShared + 1)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition"
                >
                  + Share Quest
                </button>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-bold">Leaderboard</h2>
            </div>

            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-3 rounded ${
                    index === 0 ? 'bg-yellow-400/20 border border-yellow-400' :
                    index === 1 ? 'bg-gray-400/20 border border-gray-400' :
                    index === 2 ? 'bg-orange-400/20 border border-orange-400' :
                    'bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-400 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-orange-400 text-black' :
                      'bg-gray-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{entry.user?.displayName || 'Anonymous'}</div>
                      <div className="text-sm text-gray-400">Level {entry.level}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-gold-primary">Rank {entry.rank}</div>
                    <div className="text-sm text-gray-400">{entry.exp} XP</div>
                  </div>
                </div>
              ))}
            </div>

            {leaderboard.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No leaderboard data available yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
