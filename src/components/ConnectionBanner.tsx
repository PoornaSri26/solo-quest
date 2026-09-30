import React from 'react';
import { WifiOff } from 'lucide-react';
import { useStore } from '../store/useStore';

/**
 * Offline indicator (backlog #421).
 * Shows a fixed banner while the realtime socket is disconnected or reconnecting,
 * so the user knows stats/quest sync may be stale. Hidden entirely when connected.
 */
const ConnectionBanner: React.FC = () => {
  const connectionStatus = useStore((s) => s.connectionStatus);

  if (connectionStatus === 'connected') return null;

  const isConnecting = connectionStatus === 'connecting';

  return (
    <div
      className="fixed top-16 md:top-0 left-0 right-0 z-30 flex items-center justify-center gap-2 px-4 py-1.5 bg-crimson/90 text-white text-xs font-display tracking-wide"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
      {isConnecting
        ? 'Connecting to the System…'
        : 'Connection lost — your progress syncs when you\u2019re back online'}
    </div>
  );
};

export default ConnectionBanner;
