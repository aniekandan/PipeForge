/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertTriangle, HardDriveDownload, Loader2, Trash2, X } from 'lucide-react';
import React from 'react';
import { CloseFailureDialogViewModel } from '../viewmodels/CloseFailureDialogViewModel.ts';

interface CloseFailureModalProps {
  dialog: CloseFailureDialogViewModel;
}

export const CloseFailureModal: React.FC<CloseFailureModalProps> = ({ dialog }) => {
  const { message, isBusy } = dialog;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-rose-300 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5">
          <div className="flex items-center space-x-2.5 text-rose-600">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="text-sm font-bold tracking-wide text-slate-900">Couldn't Close Project</h3>
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => dialog.executeCancel()}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col p-6 space-y-4 bg-[#f9fbfd]">
          <div className="flex items-start space-x-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-rose-900">Persistence Store Write Failure</span>
              <p className="text-slate-700 leading-relaxed">{message}</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Your project data is still safe in active memory. You can retry saving to disk, discard recent updates and close immediately, or cancel to keep working on this project.
          </p>

          {isBusy && (
            <div className="flex items-center space-x-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
              <span>Retrying project save to disk store...</span>
            </div>
          )}
        </div>

        {/* Modal Footer with the 3 distinct spec commands */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-5 py-3">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => dialog.executeCancel()}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => dialog.executeCloseWithoutSaving()}
              className="flex items-center space-x-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50 cursor-pointer"
              title="Discard unsaved changes and close"
            >
              <Trash2 className="h-3 w-3" />
              <span>Close Without Saving</span>
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => dialog.executeSaveAndClose()}
              className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <HardDriveDownload className="h-3 w-3" />}
              <span>Save & Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
