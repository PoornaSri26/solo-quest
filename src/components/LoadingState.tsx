import React from 'react';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullscreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...', 
  size = 'medium',
  fullscreen = false 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-2',
    large: 'h-12 w-12 border-3',
  };

  const container = fullscreen 
    ? 'fixed inset-0 flex items-center justify-center bg-void/80 z-50'
    : 'flex items-center justify-center';

  return (
    <div className={container} role="status" aria-live="polite" aria-busy={true}>
      <div className="flex flex-col items-center gap-3">
        <div 
          className={`animate-spin rounded-full border-gold-primary border-t-transparent ${sizeClasses[size]}`}
          aria-hidden="true"
        />
        {message && (
          <span className="text-text-secondary text-sm">{message}</span>
        )}
      </div>
    </div>
  );
};

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  dismissible?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  message, 
  onRetry, 
  onDismiss,
  dismissible = true 
}) => {
  return (
    <div 
      className="p-4 bg-crimson/10 border border-crimson/30 rounded-sm"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <span className="text-crimson text-lg" aria-hidden="true">⚠️</span>
        <div className="flex-1">
          <p className="text-crimson text-sm">{message}</p>
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1 text-xs bg-crimson text-white rounded-sm hover:bg-crimson/90 transition-fast"
              >
                Retry
              </button>
            )}
            {dismissible && onDismiss && (
              <button
                onClick={onDismiss}
                className="px-3 py-1 text-xs border border-crimson/30 text-crimson rounded-sm hover:bg-crimson/20 transition-fast"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface EmptyStateProps {
  message: string;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  message, 
  icon = '📭',
  action 
}) => {
  return (
    <div className="text-center py-12" role="status">
      <div className="text-4xl mb-4" aria-hidden="true">{icon}</div>
      <p className="text-text-muted text-sm mb-4">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-gold-primary text-void text-sm rounded-sm hover:bg-gold-primary/90 transition-fast"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};