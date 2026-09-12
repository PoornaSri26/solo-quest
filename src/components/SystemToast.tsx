import React, { useEffect, useState } from 'react';

interface SystemToastProps {
  message: string;
  duration?: number;
  onClose?: () => void;
}

const SystemToast: React.FC<SystemToastProps> = ({ 
  message, 
  duration = 4000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Slide in animation
    setIsVisible(true);

    // Auto-dismiss
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 300); // Exit animation duration
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 w-[280px] bg-surface border-l-4 border-gold-primary border-r-0 border-t-0 border-b-0 p-4 font-system text-text-system shadow-lg transition-transform duration-300 ease-out z-50 ${
        isVisible && !isExiting ? 'translate-x-0' : 'translate-x-full'
      } ${isExiting ? 'opacity-0' : 'opacity-100'}`}
    >
      {message}
    </div>
  );
};

export default SystemToast;
