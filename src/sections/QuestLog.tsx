import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export const QuestLog = () => {
  const { quests, isLoading } = useStore();
  const questsRef = useRef<Array<HTMLDivElement | null>>([]);

  // Hooks must be called before any conditional returns
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // Only animate if we have quests and GSAP is available
    const validCards = questsRef.current.filter(Boolean);
    if (validCards.length > 0 && typeof window !== 'undefined') {
      try {
        import('gsap').then(({ gsap }) => {
          import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
            gsap.registerPlugin(ScrollTrigger);
            gsap.from(validCards, {
              opacity: 0,
              y: 50,
              duration: 0.6,
              ease: 'power2.out',
              stagger: 0.1,
              scrollTrigger: {
                trigger: validCards[0],
                start: 'top 80%',
                end: 'bottom 20%',
                toggleActions: 'play none none reverse',
              },
            });
          });
        });
      } catch {
        // GSAP not available, skip animations
      }
    }
  }, [quests]);

  if (isLoading && quests.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="font-display text-xl text-text-primary mb-4">Quest Log</h3>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface border border-border-subtle rounded-md p-4 animate-pulse">
            <div className="h-4 bg-border-subtle rounded-sm mb-2 w-3/4"></div>
            <div className="h-3 bg-border-subtle rounded-sm mb-3 w-1/2"></div>
            <div className="flex gap-4">
              <div className="h-3 bg-border-subtle rounded-sm w-16"></div>
              <div className="h-3 bg-border-subtle rounded-sm w-16"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-display text-xl text-text-primary mb-4">Quest Log</h3>
      {quests.length === 0 ? (
        <p className="font-system text-text-secondary text-center py-8">
          No quests registered. Visit the Shadow Realm to activate quests.
        </p>
      ) : (
        quests.map((quest, idx) => (
          <div
            ref={ele => {
              questsRef.current[idx] = ele;
            }}
            key={quest.id}
            className="bg-surface border border-border-subtle rounded-md p-4 hover:border-gold-dim transition-fast"
          >
            <div className="flex items-start gap-4">
              <div className={`w-8 h-8 rounded-sm flex items-center justify-center text-void font-display text-sm ${
                quest.rank === 'S' ? 'bg-rank-s' :
                quest.rank === 'A' ? 'bg-rank-a' :
                quest.rank === 'B' ? 'bg-rank-b' :
                quest.rank === 'C' ? 'bg-rank-c' :
                quest.rank === 'D' ? 'bg-rank-d' : 'bg-rank-e'
              }`}>
                {quest.rank}
              </div>
              <div className="flex-1">
                <h4 className="font-display text-text-primary mb-1">{quest.title}</h4>
                <p className="font-system text-text-secondary text-sm mb-3">{quest.notes || 'No description'}</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="font-data text-gold-primary">+{quest.expReward} EXP</span>
                  <span className="font-data text-gold-primary">+{quest.goldReward} Gold</span>
                  <span className="font-system text-text-secondary">{quest.category}</span>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};