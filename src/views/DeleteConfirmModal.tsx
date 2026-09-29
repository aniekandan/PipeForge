/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertCircle, AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { DeleteConfirmDialogViewModel } from '../viewmodels/DeleteConfirmDialogViewModel.ts';

interface DeleteConfirmModalProps {
  dialog: DeleteConfirmDialogViewModel;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ dialog }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    // Force re-render on dialog state change
    const interval = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl animate-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 border border-rose-200 text-rose-600">
              <Trash2 className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Delete Project</h3>
          </div>
          <button
            type="button"
            disabled={!dialog.canCancel}
            onClick={() => dialog.executeCancel()}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col p-5 space-y-3 bg-[#f9fbfd]">
          <div className="flex items-start space-x-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-900">Permanent Action</p>
              <p className="leading-relaxed text-amber-800">
                Are you sure you want to delete <strong className="text-slate-900 font-mono font-semibold">"{dialog.projectName}"</strong>?
              </p>
              <p className="text-[11px] text-amber-700">
                This will permanently delete the project container and all extracted tables from storage.
              </p>
            </div>
          </div>

          {dialog.errorMessage && (
            <div className="flex items-start space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">{dialog.errorMessage}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 border-t border-slate-200 bg-white px-5 py-3">
          <button
            type="button"
            disabled={!dialog.canCancel}
            onClick={() => dialog.executeCancel()}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!dialog.canConfirm}
            onClick={() => dialog.executeConfirmDelete()}
            className="flex items-center space-x-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-semibold text-white transition-all shadow-xs active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {dialog.isBusy && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            <span>Confirm Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
