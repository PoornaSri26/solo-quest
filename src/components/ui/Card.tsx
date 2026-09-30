import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'quest' | 'guild' | 'raid' | 'dungeon';
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  variant = 'default',
  hover = true 
}) => {
  const baseStyles = 'bg-surface border border-border-subtle rounded-lg';
  
  const variantStyles = {
    default: '',
    quest: 'border-l-4 border-l-gold-primary',
    guild: 'border-l-4 border-l-purple-500',
    raid: 'border-l-4 border-l-red-500',
    dungeon: 'border-l-4 border-l-green-clear',
  };
  
  const hoverStyles = hover 
    ? 'hover:border-border-active hover:shadow-gold-glow transition-all duration-300' 
    : '';
  
  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
};
