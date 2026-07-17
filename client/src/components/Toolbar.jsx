import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Plus, 
  Edit2, 
  Save, 
  Trash2, 
  Printer, 
  XSquare 
} from 'lucide-react';

const Toolbar = ({
  onPrev,
  onNext,
  onFind,
  onAdd,
  onEdit,
  onSave,
  onDelete,
  onPrint,
  onCancel,
  isEditMode = false, // Edit/Add mode
  hasPrev = true,
  hasNext = true,
  showPrint = true,
  showFind = true,
  showDelete = true
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl mb-6 shadow-lg no-print">
      {/* Navigation Controls */}
      <button
        onClick={onPrev}
        disabled={isEditMode || !hasPrev}
        type="button"
        className="flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg disabled:opacity-30 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Prev</span>
      </button>
      <button
        onClick={onNext}
        disabled={isEditMode || !hasNext}
        type="button"
        className="flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg disabled:opacity-30 transition-colors"
      >
        <span>Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Primary Actions */}
      {showFind && (
        <button
          onClick={onFind}
          disabled={isEditMode}
          type="button"
          className="flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg disabled:opacity-40 transition-colors"
        >
          <Search className="h-4 w-4" />
          <span>Find</span>
        </button>
      )}

      <button
        onClick={onAdd}
        disabled={isEditMode}
        type="button"
        className="flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 rounded-lg disabled:opacity-40 transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>Add</span>
      </button>

      <button
        onClick={onEdit}
        disabled={isEditMode}
        type="button"
        className="flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 rounded-lg disabled:opacity-40 transition-colors"
      >
        <Edit2 className="h-4 w-4" />
        <span>Edit</span>
      </button>

      {/* Edit Mode Actions */}
      <div className="flex items-center border-l border-r border-slate-800 px-2 gap-2">
        <button
          onClick={onSave}
          disabled={!isEditMode}
          type="button"
          className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium bg-primary-600 text-white hover:bg-primary-500 rounded-lg disabled:bg-slate-800 disabled:text-slate-500 disabled:opacity-50 transition-all shadow-md shadow-primary-950/20"
        >
          <Save className="h-4 w-4" />
          <span>Save</span>
        </button>

        <button
          onClick={onCancel}
          disabled={!isEditMode}
          type="button"
          className="flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg disabled:opacity-40 transition-colors"
        >
          <XSquare className="h-4 w-4" />
          <span>Cancel</span>
        </button>
      </div>

      {/* Secondary Actions */}
      {showDelete && (
        <button
          onClick={onDelete}
          disabled={isEditMode}
          type="button"
          className="flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg disabled:opacity-40 transition-colors ml-auto"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </button>
      )}

      {showPrint && (
        <button
          onClick={onPrint}
          disabled={isEditMode}
          type="button"
          className="flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-sky-400 hover:text-sky-300 hover:bg-sky-950/30 rounded-lg disabled:opacity-40 transition-colors"
        >
          <Printer className="h-4 w-4" />
          <span>Print</span>
        </button>
      )}
    </div>
  );
};

export default Toolbar;
