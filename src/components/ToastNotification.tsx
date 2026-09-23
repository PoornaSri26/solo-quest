import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastNotificationProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(toast.id), 300);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <XCircle className="w-5 h-5" />;
      case 'warning': return <AlertCircle className="w-5 h-5" />;
      case 'info': return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success': return 'bg-green-clear/20 border-green-clear text-green-clear';
      case 'error': return 'bg-crimson/20 border-crimson text-crimson';
      case 'warning': return 'bg-yellow-400/20 border-yellow-400 text-yellow-400';
      case 'info': return 'bg-blue-400/20 border-blue-400 text-blue-400';
    }
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-sm border backdrop-blur-sm
        transition-all duration-300 transform
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${getStyles()}
      `}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <span className="flex-shrink-0" aria-hidden="true">{getIcon()}</span>
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose(toast.id), 300);
        }}
        className="flex-shrink-0 p-1 hover:bg-black/10 rounded-sm transition-fast"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastNotification toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};

// Simple hook for using toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: ToastType, message: string, duration?: number) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, type, message, duration };
    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const success = (message: string, duration?: number) => addToast('success', message, duration);
  const error = (message: string, duration?: number) => addToast('error', message, duration);
  const warning = (message: string, duration?: number) => addToast('warning', message, duration);
  const info = (message: string, duration?: number) => addToast('info', message, duration);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
};