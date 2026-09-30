import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'default' | 'gold' | 'green' | 'red' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };
  
  const variantStyles = {
    default: 'bg-gold-primary',
    gold: 'bg-gradient-to-r from-gold-primary to-gold-dim',
    green: 'bg-gradient-to-r from-green-clear to-green-dim',
    red: 'bg-gradient-to-r from-red-500 to-red-400',
    purple: 'bg-gradient-to-r from-purple-500 to-purple-400',
  };
  
  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-text-secondary">Progress</span>
          <span className="text-text-primary font-display">{percentage.toFixed(1)}%</span>
        </div>
      )}
      <div className={`w-full bg-raised rounded-full overflow-hidden ${sizeStyles[size]}`}>
        <div
          className={`${variantStyles[variant]} ${sizeStyles[size]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
