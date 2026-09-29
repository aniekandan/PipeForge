/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Globe,
  Info,
  Loader2,
  Lock,
  Radio,
  RefreshCw,
  RotateCw,
  Sparkles,
  X,
} from 'lucide-react';
import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { UpdateMode, UpdateState } from '../domain/UpdateTypes.ts';

export const SettingsModal: React.FC = () => {
  const { updateViewModel, viewModel } = useApp();

  if (!updateViewModel.isSettingsOpen) {
    return null;
  }

  const {
    currentVersion,
    updateMode,
    lastCheckedAt,
    updateState,
    pendingUpdate,
    downloadProgressPercent,
    isModeLocked,
    errorMessage,
    statusMessage,
  } = updateViewModel;

  const isChecking = updateState === UpdateState.Checking;
  const isDownloading = updateState === UpdateState.Downloading;
  const isReady = updateState === UpdateState.Ready;
  const isAvailable = updateState === UpdateState.Available;
  const isDownloadFailed = updateState === UpdateState.DownloadFailed;
  const isCheckFailed = updateState === UpdateState.CheckFailed;

  const formatTimestamp = (iso: string | null): string => {
    if (!iso) return 'Never checked';
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Application Settings</h3>
              <p className="text-xs text-slate-500">
                Manage update preferences, release channels, and software maintenance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateViewModel.closeSettings()}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            title="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col p-6 space-y-6 bg-[#f9fbfd] max-h-[75vh] overflow-y-auto">
          {/* Section: App Version & Check Status */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs border border-slate-200">
                  v{currentVersion}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-900">PipeForge Studio</span>
                    <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[10px] font-mono uppercase font-semibold text-emerald-800">
                      Stable Release
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-slate-500 mt-0.5 font-mono">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span>Last checked: {formatTimestamp(lastCheckedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Check for updates button */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={isChecking || isDownloading || isModeLocked}
                  onClick={() => updateViewModel.checkForUpdate(true)}
                  className={`flex items-center space-x-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all shadow-2xs ${
                    isChecking || isDownloading || isModeLocked
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-slate-900 active:scale-95 cursor-pointer'
                  }`}
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                      <span>Check for Updates Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status Feedback Banners */}
            {statusMessage && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 shadow-2xs animate-in fade-in duration-150">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateViewModel.clearStatusMessage()}
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {isCheckFailed && errorMessage && (
              <div className="mt-3 flex items-start justify-between rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 shadow-2xs animate-in fade-in duration-150">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Update check failed</span>
                    <p className="mt-0.5 text-rose-800/90">{errorMessage}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateViewModel.checkForUpdate(true)}
                  className="ml-3 flex items-center space-x-1 rounded bg-rose-100 hover:bg-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-800 transition-colors"
                >
                  <RotateCw className="h-3 w-3" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Active Update State Banner */}
            {pendingUpdate && (
              <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50/60 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-950">
                        Version v{pendingUpdate.version} is available!
                      </span>
                      {pendingUpdate.downloadSizeMb && (
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded border border-emerald-200">
                          {pendingUpdate.downloadSizeMb} MB
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-emerald-800/90 mt-0.5">
                      {pendingUpdate.releaseTitle || 'A new version of PipeForge is ready for download.'}
                    </p>
                  </div>

                  {/* Actions depending on UpdateState */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {pendingUpdate.releaseNotesUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(pendingUpdate.releaseNotesUrl);
                          }
                        }}
                        className="flex items-center space-x-1 text-xs font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2 cursor-pointer"
                        title="Copy GitHub Release URL to clipboard"
                      >
                        <span>Release URL</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}

                    {isAvailable && (
                      <button
                        type="button"
                        onClick={() => updateViewModel.downloadUpdate()}
                        className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download & Install</span>
                      </button>
                    )}

                    {isReady && (
                      <button
                        type="button"
                        onClick={() => updateViewModel.restartNow(viewModel)}
                        className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Restart to Apply</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar if downloading */}
                {isDownloading && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-emerald-800">
                      <span className="flex items-center space-x-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                        <span>Downloading payload...</span>
                      </span>
                      <span className="font-bold">{downloadProgressPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-200/80">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-150 ease-out"
                        style={{ width: `${downloadProgressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Download Failed Banner */}
                {isDownloadFailed && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-rose-100/80 border border-rose-300 p-2.5 text-xs text-rose-900">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>{errorMessage || 'Download interrupted.'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateViewModel.downloadUpdate()}
                      className="flex items-center space-x-1 rounded bg-rose-200 hover:bg-rose-300 px-2.5 py-1 text-[11px] font-semibold text-rose-900 transition-colors cursor-pointer"
                    >
                      <RotateCw className="h-3 w-3" />
                      <span>Retry Download</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Update Mode Preferences (UC8) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Update Delivery Behavior</h4>
                <p className="text-xs text-slate-500">
                  Configure how PipeForge handles release checks and background downloads.
                </p>
              </div>

              {isModeLocked && (
                <div className="flex items-center space-x-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] text-amber-800 font-medium">
                  <Lock className="h-3 w-3" />
                  <span>Mode locked during download</span>
                </div>
              )}
            </div>

            {/* Radio Options Group */}
            <div className="space-y-2.5">
              {/* Option 1: Automatic */}
              <label
                className={`flex items-start space-x-3 rounded-xl border p-3.5 transition-all ${
                  isModeLocked
                    ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200'
                    : updateMode === UpdateMode.Automatic
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-2xs ring-1 ring-emerald-500/30 cursor-pointer'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="updateMode"
                  disabled={isModeLocked}
                  checked={updateMode === UpdateMode.Automatic}
                  onChange={() => updateViewModel.setUpdateMode(UpdateMode.Automatic)}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">
                      Automatic (Recommended)
                    </span>
                    <span className="rounded bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800">
                      Default
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                    Automatically checks for updates in the background, downloads payloads silently, and notifies you when ready to restart.
                  </p>
                </div>
              </label>

              {/* Option 2: AutoCheckManualInstall */}
              <label
                className={`flex items-start space-x-3 rounded-xl border p-3.5 transition-all ${
                  isModeLocked
                    ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200'
                    : updateMode === UpdateMode.AutoCheckManualInstall
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-2xs ring-1 ring-emerald-500/30 cursor-pointer'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="updateMode"
                  disabled={isModeLocked}
                  checked={updateMode === UpdateMode.AutoCheckManualInstall}
                  onChange={() => updateViewModel.setUpdateMode(UpdateMode.AutoCheckManualInstall)}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-900">
                    Check automatically, install manually
                  </span>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                    Checks for new releases periodically and notifies you when one is found. Downloads only start when you click Download & Install.
                  </p>
                </div>
              </label>

              {/* Option 3: ManualOnly */}
              <label
                className={`flex items-start space-x-3 rounded-xl border p-3.5 transition-all ${
                  isModeLocked
                    ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200'
                    : updateMode === UpdateMode.ManualOnly
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-2xs ring-1 ring-emerald-500/30 cursor-pointer'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="updateMode"
                  disabled={isModeLocked}
                  checked={updateMode === UpdateMode.ManualOnly}
                  onChange={() => updateViewModel.setUpdateMode(UpdateMode.ManualOnly)}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-900">
                    Manual checks only
                  </span>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                    Disables all background checks and bandwidth usage. PipeForge only checks for releases when you explicitly click Check for Updates Now.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Section: Project Safety Guarantee (US5) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 flex items-start space-x-3">
            <Info className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="leading-relaxed">
              <span className="font-semibold text-slate-800">Safe Workspace Protection:</span> Active open projects and DataFrame caches are always validated and safely flushed to disk before any software restart.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={() => updateViewModel.closeSettings()}
            className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-5 py-2 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
