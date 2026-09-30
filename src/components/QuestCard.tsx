import React, { useState } from 'react';
import Tilt from 'react-parallax-tilt';
import { Trash2, Edit, CheckCircle, Clock, MessageSquare, Target, RefreshCw, Loader2, AlertCircle, AlarmClockPlus, BookOpen } from 'lucide-react';
import { Quest, Gate, DecisionType } from '../shared/types';
import { useStore } from '../store/useStore';
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import QuestDecision from './QuestDecision';
import { createAuthApi } from '../lib/api';
import { Card } from './ui/Card';
import { ProgressBar } from './ui/ProgressBar';

const isPastDate = (date: Date) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < now;
};

const QuestCard: React.FC<{
  quest: Quest;
  gate?: Gate;
  onDelete?: (id: string) => void;
  isHighlighted?: boolean;
}> = ({ quest, gate, onDelete, isHighlighted = false }) => {
  const {
    completeQuest,
    failQuest,
    openEditQuestModal,
    snoozeQuest,
    saveReflection,
    addToast,
    token,
  } = useStore();

  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showReflectModal, setShowReflectModal] = useState(false);
  const [showTieredModal, setShowTieredModal] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete(quest.id);
    }
  };

  const handleDecision = async (decisionType: DecisionType, choice: string) => {
    try {
      setIsLoading('decision');
      setError(null);
      
      const api = createAuthApi(() => token);
      await api.post(`/quests/${quest.id}/decision`, { decisionType, choice });

      setShowDecisionModal(false);
    } catch (error) {
      console.error('Failed to record decision:', error);
      setError('Failed to record decision. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleSnooze = async () => {
    try {
      setIsLoading('snooze');
      setError(null);
      await snoozeQuest(quest.id, 24);
      addToast('info', `Quest snoozed until tomorrow.`);
    } catch {
      setError('Failed to snooze quest. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleSaveReflection = async () => {
    if (!reflectionText.trim()) return;
    try {
      setIsLoading('reflect');
      setError(null);
      await saveReflection(quest.id, reflectionText.trim());
      setShowReflectModal(false);
      setReflectionText('');
      addToast('success', 'Reflection saved. Every failure teaches something.');
    } catch {
      setError('Failed to save reflection. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleRecover = async () => {
    try {
      setIsLoading('recover');
      setError(null);
      
      const api = createAuthApi(() => token);
      await api.post(`/quests/${quest.id}/recover`);

      // Refresh data after recovery
      window.location.reload();
    } catch (error) {
      console.error('Failed to recover quest:', error);
      setError('Failed to recover quest. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleTieredComplete = async (quality: 'PERFECT' | 'GOOD' | 'POOR') => {
    try {
      setIsLoading('tiered');
      setError(null);

      const api = createAuthApi(() => token);
      const data = await api.post<{ success: boolean; quality: string; rewards: { xp: number; gold: number } }>(
        `/quests/${quest.id}/complete-tiered`,
        { completionQuality: quality }
      );

      if (data.success) {
        setShowTieredModal(false);
        addToast('success', `Quest completed with ${data.quality.toLowerCase()} quality! +${data.rewards.xp} XP, +${data.rewards.gold} gold.`);
        await useStore.getState().fetchQuests();
        await useStore.getState().fetchStats();
      }
    } catch (error) {
      console.error('Failed to complete quest with tiered rewards:', error);
      setError('Failed to complete quest. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';
      if (isYesterday(date)) return 'Yesterday';
      return format(date, 'PP');
    } catch {
      return dateString;
    }
  };

  const getPriorityClass = (rank: Quest['rank']) => {
    switch (rank) {
      case 'S': return 'bg-rank-s/20 text-rank-s border-rank-s';
      case 'A': return 'bg-rank-a/20 text-rank-a border-rank-a';
      case 'B': return 'bg-rank-b/20 text-rank-b border-rank-b';
      case 'C': return 'bg-rank-c/20 text-rank-c border-rank-c';
      case 'D': return 'bg-rank-d/20 text-rank-d border-rank-d';
      case 'E': return 'bg-rank-e/20 text-rank-e border-rank-e';
      default: return 'bg-rank-e/20 text-rank-e border-rank-e';
    }
  };

  const getStatusClass = (status: Quest['status']) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-clear/20 text-green-clear border-green-clear';
      case 'FAILED': return 'bg-crimson/20 text-crimson border-crimson';
      case 'IN_PROGRESS': return 'bg-rank-c/20 text-rank-c border-rank-c';
      case 'ACTIVE': return 'bg-rank-b/20 text-rank-b border-rank-b';
      case 'SHADOW': return 'bg-rank-e/20 text-rank-e border-rank-e';
      default: return 'bg-rank-e/20 text-rank-e border-rank-e';
    }
  };

  return (
    <>
      <Tilt
        tiltMaxAngleX={8}
        tiltMaxAngleY={8}
        glareEnable={true}
        glareMaxOpacity={0.15}
        glareColor="#a594f5"
        glarePosition="all"
        glareBorderRadius="4px"
        transitionSpeed={400}
        className="group w-full"
      >
      <Card 
        variant="quest" 
        className={`p-4 ${isHighlighted ? 'border-2 border-gold-primary shadow-gold-glow' : ''}`}
      >
        <div className="relative z-10 flex items-start gap-4">

          {/* Quest Status Badge */}
          <div className="flex-shrink-0 mt-1">
            <span className={`px-2 py-0.5 text-xs rounded-sm border font-display tracking-wider
              ${getStatusClass(quest.status)}
            `}>
              {quest.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Quest Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-text-primary line-clamp-1">
                {quest.title}
              </h3>
              <div className="flex items-center gap-2 text-xs">
                {/* Rank Badge */}
                <span className={`px-2 py-0.5 rounded-sm border font-display tracking-wider
                  ${getPriorityClass(quest.rank)}
                `}>
                  {quest.rank}
                </span>

                {/* Category */}
                <span className="bg-raised text-text-secondary px-2 py-0.5 rounded-sm">
                  {quest.category}
                </span>

                {/* Gate if exists */}
                {gate && (
                  <span className="bg-raised text-text-secondary px-2 py-0.5 rounded-sm text-xs">
                    {gate.name}
                  </span>
                )}
              </div>
            </div>

            {quest.notes && (
              <p className="text-text-secondary text-sm mb-3 line-clamp-2">
                {quest.notes}
              </p>
            )}

            {/* Deadline */}
            {quest.deadline && (
              <div className="flex items-center gap-2 mb-3 text-xs">
                <Clock className="w-3 h-3 mr-1 text-text-secondary" />
                <span className={`font-data ${
                  isToday(parseISO(quest.deadline))
                    ? 'text-gold-primary font-medium'
                    : isPastDate(parseISO(quest.deadline))
                      ? 'text-crimson font-medium'
                      : 'text-text-secondary'
                }`}>
                  {formatDate(quest.deadline)}
                </span>
              </div>
            )}

            {/* Rewards */}
            <div className="flex items-center gap-3 mb-2 text-xs">
              <span className="font-data text-gold-primary">+{quest.expReward} XP</span>
              <span className="font-data text-gold-primary">+{quest.goldReward}g</span>
            </div>

            {/* Error Display */}
            {error && (
              <div 
                className="mb-2 p-2 bg-crimson/10 border border-crimson/30 rounded-sm"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-crimson" aria-hidden="true" />
                  <span className="text-crimson text-xs">{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-crimson/70 hover:text-crimson"
                    aria-label="Dismiss error"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Decision Button - Phase 2 Dilemma Triangle */}
              {['ACTIVE', 'IN_PROGRESS'].includes(quest.status) && (
                <button
                  onClick={() => setShowDecisionModal(true)}
                  disabled={isLoading !== null}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-violet-gate/20 text-violet-gate hover:bg-violet-gate/30 rounded-sm transition-fast disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Make a strategic decision"
                  aria-label={`Make decision for quest: ${quest.title}`}
                >
                  <Target className="w-3 h-3" aria-hidden="true" />
                  Decide
                </button>
              )}

              {/* Complete Button */}
              {!['COMPLETED', 'FAILED', 'ARCHIVED'].includes(quest.status) && (
                <button
                  onClick={() => completeQuest(quest.id)}
                  disabled={isLoading !== null}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-clear/20 text-green-clear hover:bg-green-clear/30 rounded-sm transition-fast disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Complete quest: ${quest.title}`}
                >
                  {isLoading === 'complete' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3" aria-hidden="true" />
                      Complete
                    </>
                  )}
                </button>
              )}

              {/* Tiered Complete Button - Phase 2 */}
              {!['COMPLETED', 'FAILED', 'ARCHIVED'].includes(quest.status) && (
                <button
                  onClick={() => setShowTieredModal(true)}
                  disabled={isLoading !== null}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-400/20 text-purple-400 hover:bg-purple-400/30 rounded-sm transition-fast disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Complete with quality rating for adjusted rewards"
                  aria-label={`Complete quest with tiered rewards: ${quest.title}`}
                >
                  {isLoading === 'tiered' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Target className="w-3 h-3" aria-hidden="true" />
                      Tiered
                    </>
                  )}
                </button>
              )}

              {/* Snooze Button — alternative to binary complete/fail (#73) */}
              {['ACTIVE', 'IN_PROGRESS'].includes(quest.status) && (quest.snoozeCount ?? 0) < 3 && (
                <button
                  onClick={handleSnooze}
                  disabled={isLoading !== null}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-sky-400/20 text-sky-300 hover:bg-sky-400/30 rounded-sm transition-fast disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Postpone this quest by 24 hours (max 3 times)"
                  aria-label={`Snooze quest: ${quest.title}`}
                >
                  {isLoading === 'snooze' ? (
                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                  ) : (
                    <AlarmClockPlus className="w-3 h-3" aria-hidden="true" />
                  )}
                  Snooze
                </button>
              )}

              {/* Fail Button */}
              {['ACTIVE', 'IN_PROGRESS'].includes(quest.status) && (
                <button
                  onClick={() => failQuest(quest.id)}
                  disabled={isLoading !== null}
                  className="flex items-center gap-1 px-2 py-1 text-xs border border-crimson text-crimson hover:bg-crimson/10 rounded-sm transition-fast disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Mark quest as failed: ${quest.title}`}
                >
                  <MessageSquare className="w-3 h-3" aria-hidden="true" />
                  Fail
                </button>
              )}

              {/* Reflect Button — failure reflection prompt (#66) */}
              {quest.status === 'FAILED' && (
                <button
                  onClick={() => setShowReflectModal(true)}
                  disabled={isLoading !== null}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-violet-gate/20 text-violet-gate hover:bg-violet-gate/30 rounded-sm transition-fast disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Reflect on why this quest failed"
                  aria-label={`Reflect on failed quest: ${quest.title}`}
                >
                  <BookOpen className="w-3 h-3" aria-hidden="true" />
                  Reflect
                </button>
              )}

              {/* Recover Button - Elastic Failure System */}
              {quest.status === 'FAILED' && (
                <button
                  onClick={handleRecover}
                  disabled={isLoading !== null}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30 rounded-sm transition-fast disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Recover quest with 30% reward penalty"
                  aria-label={`Recover quest: ${quest.title}`}
                >
                  {isLoading === 'recover' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      Recovering...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3" aria-hidden="true" />
                      Recover
                    </>
                  )}
                </button>
              )}

              {/* Edit Button */}
              {['ACTIVE', 'IN_PROGRESS', 'SHADOW'].includes(quest.status) && (
                <button
                  onClick={() => openEditQuestModal(quest.id)}
                  disabled={isLoading !== null}
                  className="flex items-center gap-1 px-2 py-1 text-xs border border-border-subtle text-text-secondary hover:bg-raised hover:text-text-primary rounded-sm transition-fast disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Edit quest: ${quest.title}`}
                >
                  <Edit className="w-3 h-3" aria-hidden="true" />
                  Edit
                </button>
              )}

              {/* Delete Button */}
              {onDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isLoading !== null}
                  className="flex items-center gap-1 px-2 py-1 text-xs border border-crimson text-crimson hover:bg-crimson/10 rounded-sm transition-fast disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Delete quest: ${quest.title}`}
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar for in_progress quests */}
        {quest.status === 'IN_PROGRESS' && (
          <div className="mt-3">
            <ProgressBar value={60} variant="gold" size="sm" />
          </div>
        )}
      </Card>
      </Tilt>

      {/* Quest Decision Modal */}
      {showDecisionModal && (
        <QuestDecision
          questId={quest.id}
          onDecision={handleDecision}
          onCancel={() => setShowDecisionModal(false)}
        />
      )}

      {/* Tiered Completion Modal - Phase 2 */}
      {showTieredModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-label="Quest completion quality"
          onClick={() => setShowTieredModal(false)}
        >
          <div
            className="bg-surface border border-border-subtle rounded-md p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-text-primary text-lg mb-2">How did it go?</h3>
            <p className="text-text-secondary text-sm mb-4">
              Rate your completion quality — rewards scale accordingly.
            </p>
            <div className="grid gap-2">
              {([
                { value: 'PERFECT' as const, label: 'Perfect', desc: 'Nailed it — full plus bonus rewards', cls: 'bg-rank-s/20 text-rank-s border-rank-s hover:bg-rank-s/30' },
                { value: 'GOOD' as const, label: 'Good', desc: 'Solid effort — standard rewards', cls: 'bg-green-clear/20 text-green-clear border-green-clear hover:bg-green-clear/30' },
                { value: 'POOR' as const, label: 'Barely', desc: 'Got there eventually — reduced rewards', cls: 'bg-gold-primary/20 text-gold-primary border-gold-primary hover:bg-gold-primary/30' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleTieredComplete(opt.value)}
                  disabled={isLoading === 'tiered'}
                  className={`flex items-center justify-between px-4 py-3 border rounded-sm text-left transition-fast disabled:opacity-50 ${opt.cls}`}
                >
                  <span>
                    <span className="font-display block">{opt.label}</span>
                    <span className="text-xs opacity-75">{opt.desc}</span>
                  </span>
                  {isLoading === 'tiered' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTieredModal(false)}
              className="mt-4 w-full px-4 py-2 text-sm border border-border-subtle text-text-secondary hover:text-text-primary rounded-sm transition-fast"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Failure Reflection Modal (#66) */}
      {showReflectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-label="Quest failure reflection"
          onClick={() => setShowReflectModal(false)}
        >
          <div
            className="bg-surface border border-border-subtle rounded-md p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-text-primary text-lg mb-2">Why did this quest fail?</h3>
            <p className="text-text-secondary text-sm mb-4">
              No judgment — understanding the obstacle is how hunters grow.
            </p>
            <textarea
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="e.g., I underestimated how long this would take after work…"
              className="w-full bg-raised border border-border-subtle rounded-sm p-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-violet-gate"
              autoFocus
            />
            <p className="text-xs text-text-muted text-right mb-4">{reflectionText.length}/1000</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowReflectModal(false)}
                className="px-4 py-2 text-sm border border-border-subtle text-text-secondary hover:text-text-primary rounded-sm transition-fast"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReflection}
                disabled={!reflectionText.trim() || isLoading === 'reflect'}
                className="px-4 py-2 text-sm bg-violet-gate/30 text-violet-gate hover:bg-violet-gate/40 rounded-sm transition-fast disabled:opacity-40"
              >
                {isLoading === 'reflect' ? 'Saving…' : 'Save Reflection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuestCard;