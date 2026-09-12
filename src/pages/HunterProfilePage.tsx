import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getAvatarUrl } from '../lib/avatars';
import { InventoryItem } from '../shared/types';

const HunterProfilePage: React.FC = () => {
  const {
    hunter,
    stats,
    fetchHunter,
    fetchStats,
    fetchUserInventory,
    fetchWeeklyStats,
    fetchQuestSummary,
    userInventory,
    weeklyActivity,
    questSummary,
  } = useStore();

  useEffect(() => {
    fetchHunter();
    fetchStats();
    fetchUserInventory();
    fetchWeeklyStats();
    fetchQuestSummary();
  }, [fetchHunter, fetchStats, fetchUserInventory, fetchWeeklyStats, fetchQuestSummary]);

  if (!hunter || !stats) {
    return <div className="p-6 text-text-secondary">Loading hunter data...</div>;
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display text-text-primary mb-6">Hunter Profile</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Hunter Info */}
        <div className="bg-surface border border-border-subtle rounded-md p-6">
          <h2 className="text-lg font-display mb-4 text-text-primary">Hunter Information</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <img
                src={hunter.avatarUrl || getAvatarUrl(hunter.hunterId || hunter.displayName)}
                alt={hunter.displayName}
                className="w-12 h-12 rounded-sm mr-4 border border-border-subtle bg-raised"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getAvatarUrl(hunter.hunterId || hunter.displayName);
                }}
              />
              <div>
                <p className="font-medium text-text-primary">{hunter.displayName}</p>
                <p className="text-sm font-data text-text-secondary">{hunter.hunterId}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-text-secondary text-sm">Joined</p>
              <p className="text-lg font-display text-text-primary">{formatDate(hunter.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-surface border border-border-subtle rounded-md p-6">
          <h2 className="text-lg font-display mb-4 text-text-primary">Hunter Stats</h2>
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-text-secondary text-sm">Level</p>
              <p className="text-3xl font-display text-gold-primary">{stats.level}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-text-secondary text-sm">Rank</p>
                <p className="text-xl font-display text-text-primary">{stats.rank}</p>
              </div>

              <div>
                <p className="text-text-secondary text-sm">Level Progress</p>
                <p className="text-xl font-data text-text-primary">
                  {Math.round(stats.progressPercent || 0)}%
                </p>
              </div>

              <div>
                <p className="text-text-secondary text-sm">HP</p>
                <p className="text-xl font-data text-text-primary">
                  {stats.hp} / {stats.hpMax}
                </p>
              </div>

              <div>
                <p className="text-text-secondary text-sm">Gold</p>
                <p className="text-xl font-data text-gold-primary">{stats.gold}</p>
              </div>

              <div>
                <p className="text-text-secondary text-sm">Streak</p>
                <p className="text-xl font-display text-gold-primary">{stats.streak} 🔥</p>
              </div>
            </div>

            {/* Attributes */}
            <div className="mt-6 pt-4 border-t border-border-subtle">
              <p className="text-text-secondary font-medium mb-2 text-sm">Attributes</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Strength</span>
                  <span className="font-data text-text-primary">{stats.statStrength}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Agility</span>
                  <span className="font-data text-text-primary">{stats.statAgility}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Intelligence</span>
                  <span className="font-data text-text-primary">{stats.statIntelligence}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Endurance</span>
                  <span className="font-data text-text-primary">{stats.statEndurance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Luck</span>
                  <span className="font-data text-text-primary">{stats.statLuck}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-6">
        <h2 className="text-lg font-display mb-4 text-text-primary">Progress to Next Level</h2>
        <div className="bg-gold-dim rounded-sm h-2">
          <div
            className="bg-gold-primary h-2 rounded-sm transition-slow"
            style={{ width: `${stats.progressPercent || 0}%` }}
          ></div>
        </div>
        <p className="mt-2 text-xs font-data text-text-secondary text-right">
          {stats.xpToNext || stats.expToNext || 0} XP to go
        </p>
      </div>

      {/* Badge Grid (Inventory) */}
      <div className="mt-6">
        <h2 className="text-lg font-display mb-4 flex items-center space-x-2 text-text-primary">
          <span className="text-gold-primary">🏅</span>
          <span>Badges &amp; Equipment</span>
        </h2>
        <div className="bg-surface border border-border-subtle rounded-md p-6">
          {userInventory.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {userInventory.map((invItem) => {
                const item = invItem.item;
                return (
                  <div key={invItem.id} className="bg-raised p-4 rounded-sm text-center">
                    <div className="h-16 w-16 bg-surface rounded-sm flex items-center justify-center mb-3 mx-auto border border-border-subtle">
                      {item?.category === 'TITLE' ? (
                        <span className="text-xl font-display text-gold-primary">👑</span>
                      ) : item?.category === 'FRAME' ? (
                        <span className="text-xl">🖼️</span>
                      ) : item?.category === 'ICON_SET' ? (
                        <span className="text-xl">🎨</span>
                      ) : item?.category === 'THEME' ? (
                        <span className="text-xl">🎨</span>
                      ) : (
                        <span className="text-xl">🎁</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-text-primary text-sm">{item?.name || 'Item'}</h3>
                    <p className="text-sm text-text-secondary">{item?.category || ''}</p>
                    <p className="text-xs text-text-muted mt-2">
                      Acquired: {formatDate(invItem.acquiredAt)}
                    </p>
                    {invItem.equipped && (
                      <span className="mt-2 inline-block px-2 py-0.5 bg-green-clear/20 border border-green-clear text-green-clear text-xs rounded-sm font-display tracking-wider">
                        Equipped
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-text-muted text-center py-8 text-sm">
              No items acquired yet. Visit the Shop to get gear!
            </p>
          )}
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="mt-6">
        <h2 className="text-lg font-display mb-4 flex items-center space-x-2 text-text-primary">
          <span className="text-gold-primary">📊</span>
          <span>Weekly Activity</span>
        </h2>
        <div className="bg-surface border border-border-subtle rounded-md p-6">
          {weeklyActivity.dailyActivity.length > 0 ? (
            <div className="space-y-4">
              {weeklyActivity.dailyActivity.map((day, index) => (
                <div key={index} className="bg-raised p-3 rounded-sm">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-text-primary">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                    <span className="text-sm text-text-secondary">Day {index + 1}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Quests Completed:</span>
                      <span className="font-data text-text-primary">{day.questsCompleted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Dungeons Completed:</span>
                      <span className="font-data text-text-primary">
                        {day.dungeonsCompleted}/{day.dungeonsTotal}
                      </span>
                    </div>
                  </div>
                  {day.questsCompleted > 0 || day.dungeonsCompleted > 0 ? (
                    <div className="mt-2 h-2 bg-gold-dim rounded-sm">
                      <div
                        className="h-2 bg-green-clear rounded-sm transition-slow"
                        style={{
                          width: `${Math.min(
                            ((day.questsCompleted * 10) + (day.dungeonsCompleted * 20)),
                            100
                          )}%`
                        }}
                      ></div>
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted text-center">No activity</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-center py-8 text-sm">
              No activity data yet. Complete quests and dungeons to see your weekly progress!
            </p>
          )}
        </div>
      </div>

      {/* Quest History Summary */}
      <div className="mt-6">
        <h2 className="text-lg font-display mb-4 flex items-center space-x-2 text-text-primary">
          <span className="text-gold-primary">📋</span>
          <span>Quest Statistics</span>
        </h2>
        <div className="bg-surface border border-border-subtle rounded-md p-6 grid gap-4 md:grid-cols-2">
          <div className="text-center">
            <p className="text-text-secondary text-sm">Total Quests</p>
            <p className="text-2xl font-display text-text-primary">{questSummary.total}</p>
          </div>
          <div className="text-center">
            <p className="text-text-secondary text-sm">Completed</p>
            <p className="text-2xl font-display text-green-clear">{questSummary.completed}</p>
          </div>
          <div className="text-center">
            <p className="text-text-secondary text-sm">Active</p>
            <p className="text-2xl font-display text-rank-b">{questSummary.active}</p>
          </div>
          <div className="text-center">
            <p className="text-text-secondary text-sm">Failed</p>
            <p className="text-2xl font-display text-crimson">{questSummary.failed}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HunterProfilePage;