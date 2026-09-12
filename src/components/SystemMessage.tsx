import React from 'react';

interface SystemMessageProps {
  message: string;
  className?: string;
}

const SystemMessage: React.FC<SystemMessageProps> = ({ message, className = '' }) => {
  return (
    <div className={`font-system text-text-system bg-surface border-l-0 border-r border-t border-b border-gold-dim px-4 py-3 ${className}`}>
      [System: {message}]
    </div>
  );
};

export default SystemMessage;
