import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const SHORTCUTS = [
  { keys: 'g d', desc: 'Go to Dashboard' },
  { keys: 'g q', desc: 'Go to Quest Log' },
  { keys: '?', desc: 'Show this help' },
];

export default function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const t = e.target as HTMLElement;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
      <div className="bg-surface border border-border-subtle rounded-md p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-gold-primary text-lg">Keyboard Shortcuts</h2>
          <button onClick={() => setOpen(false)} aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <ul className="space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-raised border border-border-subtle font-mono text-xs">{s.keys}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
