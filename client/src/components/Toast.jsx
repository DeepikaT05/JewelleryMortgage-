import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeConfig = {
    success: {
      bg: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300',
      icon: <CheckCircle className="h-5 w-5 text-emerald-400" />
    },
    error: {
      bg: 'bg-rose-950/90 border-rose-500/40 text-rose-300',
      icon: <AlertCircle className="h-5 w-5 text-rose-400" />
    },
    info: {
      bg: 'bg-sky-950/90 border-sky-500/40 text-sky-300',
      icon: <Info className="h-5 w-5 text-sky-400" />
    }
  };

  const config = typeConfig[type] || typeConfig.success;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-in">
      <div className={`flex items-center space-x-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl ${config.bg} max-w-sm`}>
        {config.icon}
        <span className="text-sm font-medium pr-4">{message}</span>
        <button 
          onClick={onClose} 
          className="p-0.5 hover:bg-white/10 rounded-full transition-colors ml-auto"
        >
          <X className="h-4 w-4 opacity-70 hover:opacity-100" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
