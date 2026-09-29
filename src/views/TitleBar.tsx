/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Database, Minus, Square, X } from 'lucide-react';
import React from 'react';
import { SessionState } from '../viewmodels/types.ts';

interface TitleBarProps {
  sessionState: SessionState;
  projectName?: string | null;
}

export const TitleBar: React.FC<TitleBarProps> = ({ sessionState, projectName }) => {
  return (
    <div className="flex h-10 w-full select-none items-center justify-between border-b border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-2xs">
      <div className="flex items-center space-x-2">
        <div className="flex h-5.5 w-5.5 items-center justify-center rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
          <Database className="h-3.5 w-3.5" />
        </div>
        <span className="font-semibold tracking-tight text-slate-900">PipeForge</span>
        {projectName && (
          <>
            <span className="text-slate-400">—</span>
            <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-slate-800 font-medium">{projectName}</span>
          </>
        )}
      </div>

      <div className="flex items-center space-x-3">
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

        {/* Desktop window controls simulation */}
        <div className="flex items-center space-x-1 border-l border-slate-200 pl-2">
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            title="Minimize"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            title="Maximize"
          >
            <Square className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-rose-600 hover:text-white transition-colors"
            title="Close"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
