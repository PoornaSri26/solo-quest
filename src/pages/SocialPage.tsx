import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Share2, Trophy, Award, TrendingUp, Building2, Sword, Plus } from 'lucide-react';
import { SocialStats } from '../shared/types';
import { useStore } from '../store/useStore';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import GuildCard from '../components/GuildCard';
import RaidCard from '../components/RaidCard';

gsap.registerPlugin(ScrollTrigger);

export default function SocialPage() {
  const navigate = useNavigate();
  const { token } = useStore();
  const [socialStats, setSocialStats] = useState<SocialStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [raids, setRaids] = useState<any[]>([]);
  const [userGuild, setUserGuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateGuild, setShowCreateGuild] = useState(false);
  const [showCreateRaid, setShowCreateRaid] = useState(false);
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildDesc, setNewGuildDesc] = useState('');
  const [newRaidName, setNewRaidName] = useState('');
  const [newRaidDesc, setNewRaidDesc] = useState('');
  const [newRaidTarget, setNewRaidTarget] = useState('');

  const pageRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      try {
        const [socialRes, leaderRes, guildsRes] = await Promise.all([
          fetch('http://localhost:5000/api/social/stats', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:5000/api/leaderboard', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:5000/api/guilds', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (socialRes.ok) {
          const socialData = await socialRes.json();
          setSocialStats(socialData);
          if (socialData.guildId) {
            setUserGuild(socialData.guildId);
            // Fetch raids for user's guild
            const raidsRes = await fetch(`http://localhost:5000/api/guilds/${socialData.guildId}/raids`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (raidsRes.ok) {
              const raidsData = await raidsRes.json();
              setRaids(raidsData);
            }
          }
        }

        if (leaderRes.ok) {
          const leaderData = await leaderRes.json();
          setLeaderboard(leaderData);
        }

        if (guildsRes.ok) {
          const guildsData = await guildsRes.json();
          setGuilds(guildsData);
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

  const handleCreateGuild = async () => {
    if (!newGuildName.trim()) {
      alert('Guild name is required');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/guilds', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newGuildName,
          description: newGuildDesc,
        }),
      });

      if (res.ok) {
        const guild = await res.json();
        alert('Guild created successfully!');
        setNewGuildName('');
        setNewGuildDesc('');
        setShowCreateGuild(false);
        // Refresh data
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create guild');
      }
    } catch (error) {
      console.error('Failed to create guild:', error);
      alert('Failed to create guild');
    }
  };

  const handleJoinGuild = async (guildId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/guilds/${guildId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('Joined guild successfully!');
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to join guild');
      }
    } catch (error) {
      console.error('Failed to join guild:', error);
      alert('Failed to join guild');
    }
  };

  const handleCreateRaid = async () => {
    if (!newRaidName.trim() || !newRaidTarget) {
      alert('Raid name and target XP are required');
      return;
    }

    if (!userGuild) {
      alert('You must be in a guild to create a raid');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/raids', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guildId: userGuild,
          name: newRaidName,
          description: newRaidDesc,
          targetExp: parseInt(newRaidTarget),
        }),
      });

      if (res.ok) {
        const raid = await res.json();
        alert('Raid created successfully!');
        setNewRaidName('');
        setNewRaidDesc('');
        setNewRaidTarget('');
        setShowCreateRaid(false);
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create raid');
      }
    } catch (error) {
      console.error('Failed to create raid:', error);
      alert('Failed to create raid');
    }
  };

  const handleJoinRaid = async (raidId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/raids/${raidId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert('Joined raid successfully!');
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to join raid');
      }
    } catch (error) {
      console.error('Failed to join raid:', error);
      alert('Failed to join raid');
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

        {/* Guilds Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">Guilds</h2>
            </div>
            {!userGuild && (
              <button
                onClick={() => setShowCreateGuild(!showCreateGuild)}
                className="bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Guild
              </button>
            )}
          </div>

          {showCreateGuild && (
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 border border-purple-500/50 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Create New Guild</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Guild Name</label>
                  <input
                    type="text"
                    value={newGuildName}
                    onChange={(e) => setNewGuildName(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    placeholder="Enter guild name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Description</label>
                  <textarea
                    value={newGuildDesc}
                    onChange={(e) => setNewGuildDesc(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    placeholder="Enter guild description"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateGuild}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-400 hover:from-purple-500 hover:to-purple-300 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                  >
                    Create Guild
                  </button>
                  <button
                    onClick={() => setShowCreateGuild(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {userGuild ? (
            <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-green-400" />
                <div>
                  <h3 className="text-xl font-bold text-green-400">You are in a guild</h3>
                  <p className="text-gray-300">Guild ID: {userGuild}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
              {guilds.map((guild) => (
                <GuildCard
                  key={guild.id}
                  guild={guild}
                  onJoin={handleJoinGuild}
                  isMember={false}
                />
              ))}
            </div>
          )}
        </div>

        {/* Raids Section */}
        {userGuild && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sword className="w-8 h-8 text-red-400" />
                <h2 className="text-2xl font-bold text-white">Guild Raids</h2>
              </div>
              <button
                onClick={() => setShowCreateRaid(!showCreateRaid)}
                className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Raid
              </button>
            </div>

            {showCreateRaid && (
              <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 border border-red-500/50 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">Create New Raid</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Raid Name</label>
                    <input
                      type="text"
                      value={newRaidName}
                      onChange={(e) => setNewRaidName(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                      placeholder="Enter raid name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Description</label>
                    <textarea
                      value={newRaidDesc}
                      onChange={(e) => setNewRaidDesc(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                      placeholder="Enter raid description"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Target XP</label>
                    <input
                      type="number"
                      value={newRaidTarget}
                      onChange={(e) => setNewRaidTarget(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
                      placeholder="Enter target XP"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateRaid}
                      className="flex-1 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                    >
                      Create Raid
                    </button>
                    <button
                      onClick={() => setShowCreateRaid(false)}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {raids.length > 0 ? (
                raids.map((raid) => (
                  <RaidCard
                    key={raid.id}
                    raid={raid}
                    onJoin={handleJoinRaid}
                    isParticipant={false}
                  />
                ))
              ) : (
                <div className="col-span-full text-center text-gray-400 py-8 bg-slate-700/50 rounded-lg">
                  No active raids. Create one to get started!
                </div>
              )}
            </div>
          </div>
        )}

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

          {/* Guild Activity */}
          {userGuild && (
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-purple-500/50 shadow-lg shadow-purple-500/20">
              <div className="flex items-center gap-3 mb-6">
                <Building2 className="w-6 h-6 text-purple-400" />
                <h2 className="text-2xl font-bold text-white">Guild Activity</h2>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300">Active Raids</span>
                    <span className="text-2xl font-display text-purple-400">{raids.filter(r => r.status === 'ACTIVE').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Completed Raids</span>
                    <span className="text-2xl font-display text-green-400">{raids.filter(r => r.status === 'COMPLETED').length}</span>
                  </div>
                </div>

                <div className="text-center text-gray-400 text-sm bg-slate-700/50 rounded-lg p-3">
                  Participate in raids to earn guild XP and level up your guild!
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}