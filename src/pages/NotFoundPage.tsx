import { Link } from 'react-router-dom';
import { Ghost } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-void text-text-primary p-6 text-center">
      <Ghost className="w-16 h-16 text-text-muted mb-4" />
      <h1 className="text-4xl font-display text-gold-primary mb-2">404</h1>
      <p className="text-text-secondary mb-6">This page wandered into the Shadow Realm.</p>
      <Link to="/dashboard" className="px-4 py-2 rounded-sm border border-border-subtle hover:bg-raised transition-fast">
        Return to Dashboard
      </Link>
    </div>
  );
}
