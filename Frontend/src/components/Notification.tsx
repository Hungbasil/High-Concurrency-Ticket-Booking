import React, { useEffect } from 'react';
import { useBookingStore } from '../store/useBookingStore.js';

/**
 * Notification Component
 * Displays success, error, warning, and info messages
 */
export const Notification: React.FC = () => {
  const { notification, closeNotification } = useBookingStore();
  const { show, type, message } = notification;

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        closeNotification();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, closeNotification]);

  if (!show) return null;

  const typeClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const iconMap = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top">
      <div className={`border rounded-lg p-4 flex items-start gap-3 ${typeClasses[type]}`}>
        <span className="text-xl flex-shrink-0">{iconMap[type]}</span>
        <div className="flex-1">
          <p className="font-medium">{message}</p>
        </div>
        <button
          onClick={closeNotification}
          className="flex-shrink-0 text-lg leading-none hover:opacity-70"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Notification;
