/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AlertCircle,
  Copy,
  Database,
  Loader2,
  Minus,
  RefreshCw,
  Settings,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { UpdateState } from '../domain/UpdateTypes.ts';
import { SessionState } from '../viewmodels/types.ts';

interface TitleBarProps {
  sessionState: SessionState;
  projectName?: string | null;
}

export const TitleBar: React.FC<TitleBarProps> = ({ sessionState, projectName }) => {
  const { updateViewModel, viewModel } = useApp();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.isMaximized) {
      window.electronAPI.isMaximized().then((max) => {
        setIsMaximized(Boolean(max));
      }).catch(() => {});
    }
  }, []);

  const handleMinimize = () => {
    if (typeof window !== 'undefined' && window.electronAPI?.minimizeWindow) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.maximizeWindow) {
      try {
        const nextState = await window.electronAPI.maximizeWindow();
        setIsMaximized(Boolean(nextState));
      } catch {
        // fallback
      }
    }
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.electronAPI?.closeWindow) {
      window.electronAPI.closeWindow();
    }
  };

  const {
    currentVersion,
    updateState,
    pendingUpdate,
    downloadProgressPercent,
  } = updateViewModel;

  // CSS drag helper for Electron window
  const dragStyle = {
    WebkitAppRegion: 'drag',
  } as React.CSSProperties;
  const noDragStyle = {
    WebkitAppRegion: 'no-drag',
  } as React.CSSProperties;

  return (
    <header
      style={dragStyle}
      onDoubleClick={handleMaximize}
      className="flex h-10 w-full select-none items-center justify-between border-b border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-2xs cursor-default"
    >
      {/* Left Branding & Active Project */}
      <div className="flex items-center space-x-2" style={noDragStyle}>
        <div className="flex h-5.5 w-5.5 items-center justify-center rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
          <Database className="h-3.5 w-3.5" />
        </div>
        <span className="font-semibold tracking-tight text-slate-900">PipeForge</span>
        <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[10px] font-mono text-slate-600">
          v{currentVersion}
        </span>
        {projectName && (
          <>
            <span className="text-slate-400">—</span>
            <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-slate-800 font-medium">
              {projectName}
            </span>
          </>
        )}
      </div>

      {/* Right Controls & Interactive Elements */}
      <div className="flex items-center space-x-2.5" style={noDragStyle}>
        {/* Update Status Badge / Interactive Trigger */}
        {updateState === UpdateState.Checking && (
          <div className="flex items-center space-x-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] text-slate-600">
            <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
            <span>Checking updates...</span>
          </div>
        )}

        {updateState === UpdateState.Available && pendingUpdate && (
          <button
            type="button"
            onClick={() => updateViewModel.openSettings()}
            className="flex items-center space-x-1.5 rounded-full bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 px-2.5 py-0.5 text-[11px] text-emerald-800 font-semibold transition-colors cursor-pointer shadow-2xs animate-pulse"
            title="Click to view update details"
          >
            <Sparkles className="h-3 w-3 text-emerald-600" />
            <span>v{pendingUpdate.version} Available</span>
          </button>
        )}

        {updateState === UpdateState.Downloading && (
          <button
            type="button"
            onClick={() => updateViewModel.openSettings()}
            className="flex items-center space-x-1.5 rounded-full bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 px-2.5 py-0.5 text-[11px] text-emerald-800 font-mono font-semibold transition-colors cursor-pointer"
          >
            <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
            <span>Downloading {downloadProgressPercent}%</span>
          </button>
        )}

        {updateState === UpdateState.Ready && (
          <button
            type="button"
            onClick={() => updateViewModel.restartNow(viewModel)}
            className="flex items-center space-x-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 px-2.5 py-0.5 text-[11px] text-white font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Click to restart and apply update"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Restart to Update</span>
          </button>
        )}

        {updateState === UpdateState.DownloadFailed && (
          <button
            type="button"
            onClick={() => updateViewModel.openSettings()}
            className="flex items-center space-x-1.5 rounded-full bg-rose-50 border border-rose-300 hover:bg-rose-100 px-2.5 py-0.5 text-[11px] text-rose-800 font-semibold transition-colors cursor-pointer"
            title="Download failed - click to retry"
          >
            <AlertCircle className="h-3 w-3 text-rose-600" />
            <span>Download Failed</span>
          </button>
        )}

        {/* Session State Tag */}
        <div className="flex items-center space-x-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              sessionState === SessionState.ProjectOpen
                ? 'bg-emerald-600 animate-pulse'
                : sessionState === SessionState.Importing || sessionState === SessionState.Closing
                ? 'bg-amber-500 animate-ping'
                : sessionState === SessionState.CloseBlocked
                ? 'bg-rose-500'
                : 'bg-slate-400'
            }`}
          />
          <span className="font-mono text-slate-500">State:</span>
          <span className="font-medium text-slate-800">{sessionState}</span>
        </div>

        {/* Settings Button */}
        <button
          type="button"
          onClick={() => updateViewModel.openSettings()}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
          title="Settings & Updates"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>

        {/* Native frameless window controls */}
        <div className="flex items-center space-x-1 border-l border-slate-200 pl-2">
          <button
            type="button"
            onClick={handleMinimize}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleMaximize}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            title={isMaximized ? 'Restore Down' : 'Maximize'}
          >
            {isMaximized ? (
              <Copy className="h-2.5 w-2.5" />
            ) : (
              <Square className="h-2.5 w-2.5" />
            )}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </header>
  );
};
