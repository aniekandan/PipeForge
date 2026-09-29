/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CheckCircle2, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { UpdateState } from '../domain/UpdateTypes.ts';

export const UpdateReadyModal: React.FC = () => {
  const { updateViewModel, viewModel } = useApp();

  if (!updateViewModel.isReadyModalVisible || updateViewModel.updateState !== UpdateState.Ready) {
    return null;
  }

  const version = updateViewModel.pendingUpdate?.version || 'new version';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Update Ready to Install</h3>
              <p className="text-[11px] text-slate-500">PipeForge v{version}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateViewModel.later()}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 bg-[#f9fbfd] text-xs text-slate-700">
          <div className="flex items-center space-x-2 text-emerald-900 font-semibold bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>The update payload has been verified and cached on disk.</span>
          </div>

          <p className="leading-relaxed">
            Restart PipeForge now to finish applying the update. You can also postpone and restart whenever you're ready.
          </p>

          <div className="flex items-start space-x-2.5 rounded-xl border border-slate-200 bg-white p-3 text-slate-600 shadow-2xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Workspace Protection:</strong> If a project is currently open, it will be automatically saved and closed before restarting to prevent any data loss.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={() => updateViewModel.later()}
            className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            Later
          </button>

          <button
            type="button"
            onClick={() => updateViewModel.restartNow(viewModel)}
            className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Restart Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
