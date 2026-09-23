import React from 'react';

/**
 * SkipLink component for accessibility
 * Allows keyboard users to skip navigation and go directly to main content
 */
export const SkipLink: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-gold-primary focus:text-void focus:rounded-sm focus:font-medium focus:transition-fast"
    >
      Skip to main content
    </a>
  );
};

/**
 * LiveRegion component for announcing dynamic content changes to screen readers
 */
interface LiveRegionProps {
  message: string;
  ariaLive?: 'polite' | 'assertive' | 'off';
}

export const LiveRegion: React.FC<LiveRegionProps> = ({ 
  message, 
  ariaLive = 'polite' 
}) => {
  return (
    <div
      role="status"
      aria-live={ariaLive}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};

/**
 * VisuallyHidden component for content that should be available to screen readers but not visible
 */
type VisuallyHiddenTag = 'span' | 'div' | 'p';

export const VisuallyHidden: React.FC<{ children: React.ReactNode; as?: VisuallyHiddenTag }> = ({ 
  children, 
  as = 'span' 
}) => {
  const Tag = as as VisuallyHiddenTag;
  return (
    <Tag className="sr-only">
      {children}
    </Tag>
  );
};

/**
 * FocusTrap component for modals and dialogs
 */
interface FocusTrapProps {
  children: React.ReactNode;
  isActive: boolean;
  onEscape?: () => void;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({ 
  children, 
  isActive, 
  onEscape 
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape();
      }
    };

    container.addEventListener('keydown', handleTab);
    document.addEventListener('keydown', handleEscape);

    // Focus first element when trap activates
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTab);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isActive, onEscape]);

  return <div ref={containerRef}>{children}</div>;
};