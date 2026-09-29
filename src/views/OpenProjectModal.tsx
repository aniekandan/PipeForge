/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AlertCircle,
  Calendar,
  Check,
  FileSpreadsheet,
  Folder,
  FolderOpen,
  Layers,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import React, { useEffect } from 'react';
import { OpenProjectDialogViewModel } from '../viewmodels/OpenProjectDialogViewModel.ts';

interface OpenProjectModalProps {
  dialog: OpenProjectDialogViewModel;
}

export const OpenProjectModal: React.FC<OpenProjectModalProps> = ({ dialog }) => {
  const {
    availableProjects,
    filteredProjects,
    selectedProject,
    isLoading,
    errorMessage,
    searchQuery,
    canConfirm,
    canCancel,
  } = dialog;

  useEffect(() => {
    // Ensure catalog is freshly loaded whenever modal is mounted
    dialog.executeLoad();
  }, [dialog]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Open Project</h3>
              <p className="text-[11px] text-slate-500">
                Select a saved project from storage or browse a project file
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={!canCancel}
            onClick={() => dialog.executeCancel()}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col p-6 space-y-4 bg-[#f9fbfd]">
          {/* Search Filter if multiple projects exist */}
          {availableProjects.length > 2 && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter saved projects..."
                value={searchQuery}
                onChange={(e) => dialog.setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 font-medium"
              />
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
              <p className="text-xs text-slate-500 font-medium">Loading project catalog from storage...</p>
            </div>
          ) : availableProjects.length === 0 ? (
            /* Screen 3b: Empty State */
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-3 border border-slate-200">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">No saved projects found</p>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                No projects are currently saved in local storage. You can import an Excel or CSV file to create your first project.
              </p>
              <button
                type="button"
                onClick={() => dialog.browseAndOpenExternalFile()}
                className="mt-4 flex items-center space-x-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                <Folder className="h-3.5 w-3.5 text-emerald-600" />
                <span>Browse File from Computer</span>
              </button>
            </div>
          ) : (
            /* Screen 3: Project List with Radio Selection & Double-Click Support */
            <div className="flex flex-col space-y-2 max-h-72 overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1 mb-1">
                <span>Saved Projects ({filteredProjects.length})</span>
                <span className="text-[10px] text-slate-400 font-normal normal-case">
                  Click to select • Double-click to open
                </span>
              </div>

              {filteredProjects.map((project) => {
                const isSelected = selectedProject?.id === project.id;
                const formattedDate = new Date(project.lastOpenedAt || project.updatedAt).toLocaleDateString(
                  undefined,
                  {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }
                );

                return (
                  <div
                    key={project.id}
                    onClick={() => dialog.selectProject(project)}
                    onDoubleClick={() => dialog.executeConfirm()}
                    className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 text-slate-900 shadow-2xs ring-1 ring-emerald-500/40'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* Radio dot */}
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                      </div>

                      {/* Project info */}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900 truncate">{project.name}</span>
                          <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-mono uppercase font-semibold text-emerald-800 shrink-0">
                            {project.sourceType}
                          </span>
                        </div>
                        {project.sourceFilePath && (
                          <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-mono truncate mt-0.5">
                            <Folder className="h-3 w-3 shrink-0 text-amber-500" />
                            <span className="truncate">{project.sourceFilePath}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-3 mt-1 text-[11px] text-slate-500 font-mono">
                          <span className="flex items-center space-x-1">
                            <Layers className="h-3 w-3" />
                            <span>
                              {project.tableCount} {project.tableCount === 1 ? 'table' : 'tables'}
                            </span>
                          </span>
                          {project.rowCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{project.rowCount.toLocaleString()} rows</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formattedDate}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start space-x-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <span className="font-bold text-rose-900">Load Error</span>
                <p className="mt-0.5 text-rose-800/90 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
          <div>
            <button
              type="button"
              onClick={() => dialog.browseAndOpenExternalFile()}
              className="flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              <FolderOpen className="h-3.5 w-3.5 text-emerald-600" />
              <span>Browse from Computer...</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={!canCancel}
              onClick={() => dialog.executeCancel()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => dialog.executeConfirm()}
              className={`flex items-center space-x-1.5 rounded-lg px-5 py-2 text-xs font-semibold text-white transition-all shadow-xs ${
                canConfirm
                  ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer active:scale-[0.98]'
                  : 'bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
              }`}
            >
              {isLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              <span>Open Project</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
