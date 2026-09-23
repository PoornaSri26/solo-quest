import { Zap, XCircle, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useState, useEffect, useRef } from 'react';

const QuickCapture: React.FC = () => {
  const { createQuest } = useStore();

  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        setError(null);
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
    if (!inputValue.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createQuest({
        title: inputValue.trim(),
        rank: 'E',
        category: 'Wildcard',
        status: 'SHADOW',
        isBossQuest: false,
      });

      setInputValue('');
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create quest. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setInputValue('');
    setError(null);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-gold-primary hover:bg-gold-primary/90 text-void rounded-sm flex items-center justify-center shadow-lg transform transition-fast hover:scale-105 z-10"
          aria-label="Add quick quest (press /)"
          title="Add quick quest (press /)"
        >
          <Zap className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      {/* Quick Capture Panel */}
      {isOpen && (
        <div 
          className="w-96 max-w-[calc(100vw-2rem)] bg-surface/95 backdrop-blur-sm border border-border-subtle rounded-sm p-4 shadow-xl z-20"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-capture-title"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 id="quick-capture-title" className="text-sm font-display text-text-primary">
              Quick Capture
            </h3>
            <button
              onClick={handleCancel}
              className="text-text-secondary hover:text-text-primary transition-fast"
              aria-label="Close quick capture"
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div>
              <label htmlFor="quick-quest-input" className="sr-only">
                Quest title
              </label>
              <input
                id="quick-quest-input"
                type="text"
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setError(null);
                }}
                placeholder="> Enter quest title..."
                className="w-full px-3 py-2 bg-raised border border-border-subtle rounded-sm focus:outline-none focus:border-gold-primary text-text-primary placeholder:text-text-muted font-system"
                autoFocus
                maxLength={200}
                aria-invalid={!!error}
                aria-describedby={error ? 'quick-capture-error' : undefined}
              />
            </div>

            {error && (
              <p 
                id="quick-capture-error" 
                className="text-crimson text-xs"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Sent to Shadow Realm (E-rank)</span>
              <span>Press Enter to submit, Escape to cancel</span>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-3 py-1 text-xs border border-border-subtle text-text-secondary hover:bg-raised rounded-sm transition-fast disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !inputValue.trim()}
                className="px-3 py-1 text-xs bg-gold-primary text-void hover:bg-gold-primary/90 rounded-sm transition-fast disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    Capturing...
                  </>
                ) : (
                  'Capture'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default QuickCapture;