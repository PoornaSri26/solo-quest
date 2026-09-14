import React from 'react';
import { useStore } from '../store/useStore';
import { Layers, LayoutGrid } from 'lucide-react';

export default function UIModeToggle() {
  const { uiMode, setUIMode } = useStore();

  return (
    <div className="ui-mode-toggle">
      <button
        onClick={() => setUIMode('minimal')}
        className={`mode-button ${uiMode === 'minimal' ? 'active' : ''}`}
        title="Minimal Mode - Calm, focused view"
      >
        <Layers size={18} />
        <span>Quest</span>
      </button>
      <button
        onClick={() => setUIMode('dense')}
        className={`mode-button ${uiMode === 'dense' ? 'active' : ''}`}
        title="Dense Mode - Full hunter dashboard"
      >
        <LayoutGrid size={18} />
        <span>Hunter</span>
      </button>
    </div>
  );
}