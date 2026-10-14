import { useEffect, useState } from 'react';

interface FeedbackEvent {
  type: 'quest_complete' | 'level_up' | 'streak' | 'combo' | 'mastery';
  message: string;
  value?: number;
  icon?: string;
}

/**
 * DopamineFeedback - Instant gratification feedback system
 * Triggers satisfying visual and audio feedback for achievements
 */
export default function DopamineFeedback() {
  const [feedback, setFeedback] = useState<FeedbackEvent | null>(null);
  const [show, setShow] = useState(false);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number}>>([]);

  const playSynthChime = (type: FeedbackEvent['type']) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'level_up' || type === 'mastery') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.35);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch {
      // AudioContext blocked or unsupported
    }
  };

  const triggerFeedback = (event: FeedbackEvent) => {
    setFeedback(event);
    setShow(true);

    // Haptic feedback if supported on mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([20, 50, 40]);
      } catch {
        // Ignored
      }
    }

    playSynthChime(event.type);

    // Generate particles
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setParticles(newParticles);

    setTimeout(() => setShow(false), 2200);
  };

  // Expose the trigger to window and custom event
  useEffect(() => {
    (window as any).__dopamineFeedback = triggerFeedback;
    const handler = (e: CustomEvent<FeedbackEvent>) => {
      if (e.detail) triggerFeedback(e.detail);
    };
    window.addEventListener('solo-quest:dopamine' as any, handler);
    return () => {
      window.removeEventListener('solo-quest:dopamine' as any, handler);
    };
  }, []);

  if (!show || !feedback) return null;

  const getStyles = () => {
    switch (feedback.type) {
      case 'quest_complete':
        return {
          bg: 'from-green-500/90 to-emerald-600/90',
          border: 'border-green-400',
          icon: '✅',
          glow: 'shadow-green-500/50',
        };
      case 'level_up':
        return {
          bg: 'from-purple-500/90 to-violet-600/90',
          border: 'border-purple-400',
          icon: '⬆️',
          glow: 'shadow-purple-500/50',
        };
      case 'streak':
        return {
          bg: 'from-orange-500/90 to-red-600/90',
          border: 'border-orange-400',
          icon: '🔥',
          glow: 'shadow-orange-500/50',
        };
      case 'combo':
        return {
          bg: 'from-blue-500/90 to-cyan-600/90',
          border: 'border-blue-400',
          icon: '⚡',
          glow: 'shadow-blue-500/50',
        };
      case 'mastery':
        return {
          bg: 'from-yellow-500/90 to-amber-600/90',
          border: 'border-yellow-400',
          icon: '🏆',
          glow: 'shadow-yellow-500/50',
        };
      default:
        return {
          bg: 'from-gray-500/90 to-slate-600/90',
          border: 'border-gray-400',
          icon: '✨',
          glow: 'shadow-gray-500/50',
        };
    }
  };

  const styles = getStyles();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
      {/* Dim backdrop */}
      <div className="absolute inset-0 bg-black/40 animate-[fadeIn_0.2s_ease-out]" />

      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 bg-gold-primary rounded-full animate-ping"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animationDelay: `${Math.random() * 0.3}s`,
          }}
        />
      ))}

      {/* Feedback card */}
      <div
        className={`relative bg-gradient-to-br ${styles.bg} border-4 ${styles.border} rounded-2xl px-8 py-6 text-center shadow-2xl ${styles.glow} animate-[bounce_0.5s_ease-out]`}
      >
        <div className="text-5xl mb-3 animate-bounce">{feedback.icon || styles.icon}</div>
        <h3 className="text-xl font-display font-bold text-white mb-2">{feedback.message}</h3>
        {feedback.value !== undefined && (
          <div className="text-2xl font-data text-white font-bold">+{feedback.value}</div>
        )}
      </div>
    </div>
  );
}

// Export hook for triggering feedback
export const useDopamineFeedback = () => {
  // This would be integrated with the store to trigger feedback
  // For now, it's a placeholder
  return (event: FeedbackEvent) => {
    console.log('Dopamine feedback:', event);
  };
};
