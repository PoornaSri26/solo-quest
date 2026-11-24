import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [light, setLight] = useState(() => {
    try { return localStorage.getItem('sq-theme') === 'light'; } catch { return false; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (light) root.classList.add('dark'); else root.classList.remove('dark');
    try { localStorage.setItem('sq-theme', light ? 'light' : 'dark'); } catch {}
  }, [light]);

  return (
    <button
      onClick={() => setLight((v) => !v)}
      className="p-2 text-text-secondary hover:text-text-primary transition-fast rounded-sm border border-border-subtle"
      aria-label={light ? 'Switch to dark theme' : 'Switch to light theme'}
      title={light ? 'Dark mode' : 'Light mode'}
    >
      {light ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </button>
  );
}
