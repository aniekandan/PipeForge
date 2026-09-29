/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AlertCircle,
  Download,
  ExternalLink,
  Loader2,
  RotateCw,
  Sparkles,
  X,
} from 'lucide-react';
import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { UpdateState } from '../domain/UpdateTypes.ts';

export const UpdateToastNotification: React.FC = () => {
  const { updateViewModel } = useApp();

  if (!updateViewModel.isToastVisible || !updateViewModel.pendingUpdate) {
    return null;
  }

  const {
    updateState,
    pendingUpdate,
    downloadProgressPercent,
    errorMessage,
  } = updateViewModel;

  // Case 1: Download Failed Card (UC10-S4 exact spec contract)
  if (updateState === UpdateState.DownloadFailed) {
    return (
      <div className="fixed bottom-14 right-6 z-50 w-96 rounded-2xl border border-rose-200 bg-white p-4 text-xs text-slate-800 shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 border border-rose-200 text-rose-600">
              <AlertCircle className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-900">
              Couldn't download update v{pendingUpdate.version}
            </span>
          </div>
          <button
            type="button"
            onClick={() => updateViewModel.dismissUpdateToast()}
            className="text-slate-400 hover:text-slate-600 p-1"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-600 leading-relaxed">
          {errorMessage || 'Check your internet connection and try again.'}
        </p>

        {/* Action Buttons: [ Download manually ] [ Not now ] [ Retry ] */}
        <div className="mt-4 flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              if (pendingUpdate.releaseNotesUrl && navigator.clipboard) {
                navigator.clipboard.writeText(pendingUpdate.releaseNotesUrl);
              }
              updateViewModel.openSettings();
            }}
            className="flex items-center space-x-1 text-slate-600 hover:text-emerald-700 font-medium px-2 py-1 transition-colors cursor-pointer"
            title="Copy release URL & open settings"
          >
            <span>Download manually</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={() => updateViewModel.dismissUpdateToast()}
            className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 font-medium text-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            Not now
          </button>

          <button
            type="button"
            onClick={() => updateViewModel.downloadUpdate()}
            className="flex items-center space-x-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <RotateCw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // Case 2: Downloading in progress
  if (updateState === UpdateState.Downloading) {
    return (
      <div className="fixed bottom-14 right-6 z-50 w-88 rounded-2xl border border-emerald-200 bg-white p-4 text-xs text-slate-800 shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            <span className="font-bold text-slate-900">
              Downloading Update v{pendingUpdate.version}...
            </span>
          </div>
          <span className="font-mono font-bold text-emerald-700">
            {downloadProgressPercent}%
          </span>
        </div>

        <p className="mt-1 text-[11px] text-slate-500">
          Streaming update package in the background.
        </p>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
          <div
            className="h-full bg-emerald-600 transition-all duration-150 ease-out"
            style={{ width: `${downloadProgressPercent}%` }}
          />
        </div>
      </div>
    );
  }

  // Case 3: Update Available (Manual modes)
  if (updateState === UpdateState.Available) {
    return (
      <div className="fixed bottom-14 right-6 z-50 w-96 rounded-2xl border border-emerald-300 bg-white p-4 text-xs text-slate-800 shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900">
                Update Available: v{pendingUpdate.version}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {pendingUpdate.releaseTitle || 'A new release is ready for installation.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateViewModel.dismissUpdateToast()}
            className="text-slate-400 hover:text-slate-600 p-1"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => updateViewModel.openSettings()}
            className="text-slate-600 hover:text-slate-900 px-2 py-1 font-medium transition-colors cursor-pointer"
          >
            View Details
          </button>

          <button
            type="button"
            onClick={() => updateViewModel.downloadUpdate()}
            className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download & Install</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
