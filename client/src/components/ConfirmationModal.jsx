import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmationModal = ({ isOpen, title = 'Confirm Action', message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md p-6 glass-panel rounded-2xl shadow-2xl border border-red-500/20 text-slate-100">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3 text-red-400">
            <AlertTriangle className="h-6 w-6" />
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <button 
            onClick={onCancel} 
            className="p-1 hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-slate-400 hover:text-slate-200" />
          </button>
        </div>
        
        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
          {message || 'Are you sure you want to perform this action? This operation cannot be undone.'}
        </p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors border border-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-red-950/20"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
