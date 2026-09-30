import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { isChronicleUnread, openChronicleDossier, clearChronicleUnread } from '../lib/story-arc';

/**
 * ChronicleSidebarButton — sidebar entry into the Chronicle dossier.
 *
 * Shows a gold unread dot when a new chapter has cleared since the dossier
 * was last opened. Renders nothing until mounted inside the authed app
 * (story state is client-local, so this is safe anywhere in the shell).
 */
const ChronicleSidebarButton: React.FC = () => {
  const [unread, setUnread] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const sync = () => setUnread(isChronicleUnread());
    sync();
    window.addEventListener('solo-quest:chronicle-changed', sync);
    return () => window.removeEventListener('solo-quest:chronicle-changed', sync);
  }, []);

  const handleClick = () => {
    clearChronicleUnread();
    setUnread(false);
    // The dossier is hosted by the Dashboard banner; go there first if needed.
    if (location.pathname !== '/dashboard' && location.pathname !== '/') {
      navigate('/dashboard');
      // Dashboard is statically imported, so it mounts within this tick.
      window.setTimeout(openChronicleDossier, 350);
    } else {
      openChronicleDossier();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-fast text-text-secondary hover:bg-raised hover:text-gold-primary"
      aria-label="Open the Chronicle dossier"
    >
      <span className="relative inline-flex" aria-hidden="true">
        <BookOpen className="w-4 h-4" />
        {unread && (
          <span
            className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full"
            style={{ background: '#C9A84C', boxShadow: '0 0 6px rgba(201,168,76,0.8)' }}
          />
        )}
      </span>
      Chronicle
    </button>
  );
};

export default ChronicleSidebarButton;
