import React from 'react';
import { TypeSequence } from './originkit/ui/ambient-void';

interface SystemPageHeaderProps {
  /** Display title (font-display, Rajdhani). */
  title: string;
  /** System voice line — rendered as a typed [System: ...] transmission. */
  systemLine: string;
  className?: string;
}

/**
 * SystemPageHeader — the uniform page masthead of the System.
 *
 * Display title, a typed [System: ...] transmission beneath it, and a
 * gold-to-violet hairline that fades into the void. Used on every inner
 * page so the app speaks with one voice.
 */
const SystemPageHeader: React.FC<SystemPageHeaderProps> = ({
  title,
  systemLine,
  className = '',
}) => {
  return (
    <header className={`mb-6 ${className}`}>
      <h1 className="text-2xl font-display text-text-primary tracking-wide">
        {title}
      </h1>
      <p className="font-system text-text-system text-xs mt-1" aria-label={`System: ${systemLine}`}>
        <TypeSequence text={`[System: ${systemLine}]`} />
      </p>
      <div
        aria-hidden="true"
        className="mt-3 h-px w-full bg-gradient-to-r from-gold-primary/60 via-violet-gate/30 to-transparent"
      />
    </header>
  );
};

export default SystemPageHeader;
