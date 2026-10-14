import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sound } from '../lib/sound';

export const SoundToggle: React.FC = () => {
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('solo-quest-muted') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    sound.setMuted(isMuted);
    try {
      localStorage.setItem('solo-quest-muted', String(isMuted));
    } catch {
      // Ignored in private browsing
    }
  }, [isMuted]);

  const handleToggle = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
    if (!next) {
      sound.play('click');
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-lg bg-surface/80 border border-white/10 hover:border-white/20 text-text-secondary hover:text-white transition-all duration-200 flex items-center gap-1.5 text-xs font-mono"
      title={isMuted ? 'Unmute SFX' : 'Mute SFX'}
      aria-label={isMuted ? 'Unmute sound effects' : 'Mute sound effects'}
    >
      {isMuted ? (
        <>
          <VolumeX className="w-4 h-4 text-text-muted" />
          <span className="hidden sm:inline text-text-muted">MUTED</span>
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline text-cyan-400">SFX ON</span>
        </>
      )}
    </button>
  );
};

export default SoundToggle;
