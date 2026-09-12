import { Zap, XCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useState, useEffect, useRef } from 'react';

const QuickCapture: React.FC = () => {
  const { createQuest } = useStore();

  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut handler for `/` to focus input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setInputValue('');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    await createQuest({
      title: inputValue.trim(),
      rank: 'E',
      category: 'Wildcard',
      status: 'SHADOW',
      isBossQuest: false,
    });

    setInputValue('');
    setIsOpen(false);
  };

  const handleCancel = () => {
    setInputValue('');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-gold-primary hover:bg-gold-primary/90 text-void rounded-sm flex items-center justify-center shadow-lg transform transition-fast hover:scale-105 z-10"
          aria-label="Add quick quest"
        >
          <Zap className="h-6 w-6" />
        </button>
      )}

      {/* Quick Capture Panel */}
      {isOpen && (
        <div className="w-96 max-w-[calc(100vw-2rem)] bg-surface/95 backdrop-blur-sm border border-border-subtle rounded-sm p-4 shadow-xl z-20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-display text-text-primary">Quick Capture</h3>
            <button
              onClick={handleCancel}
              className="text-text-secondary hover:text-text-primary transition-fast"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="text"
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="> Enter quest title..."
                className="w-full px-3 py-2 bg-raised border border-border-subtle rounded-sm focus:outline-none focus:border-gold-primary text-text-primary placeholder:text-text-muted font-system"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Sent to Shadow Realm (E-rank)</span>
              <span>Press Enter to submit</span>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1 text-xs border border-border-subtle text-text-secondary hover:bg-raised rounded-sm transition-fast"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs bg-gold-primary text-void hover:bg-gold-primary/90 rounded-sm transition-fast"
              >
                Capture
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default QuickCapture;