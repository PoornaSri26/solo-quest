import React from 'react';

interface State { hasError: boolean; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('UI error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-void text-text-primary p-6 text-center">
          <h1 className="text-2xl font-display text-gold-primary mb-2">Something went wrong</h1>
          <p className="text-text-secondary mb-4">The hunter's system encountered an unexpected error.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-sm border border-border-subtle text-text-primary hover:bg-raised transition-fast"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
