/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AlertCircle,
  Clock,
  FileSpreadsheet,
  Folder,
  FolderOpen,
  Layers,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { ShellViewModel } from '../viewmodels/ShellViewModel.ts';
import { DeleteConfirmModal } from './DeleteConfirmModal.tsx';

interface BlankShellViewProps {
  viewModel: ShellViewModel;
}

export const BlankShellView: React.FC<BlankShellViewProps> = ({ viewModel }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const isBusy = viewModel.isBusy;
  const canImport = viewModel.canImportFile;
  const canOpen = viewModel.canOpenProject;
  const recentProjects = viewModel.recentProjects;
  const errorMessage = viewModel.errorMessage;

  // Filter recent projects based on search input
  const filteredRecents = recentProjects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sourceFilePath && p.sourceFilePath.toLowerCase().includes(q)) ||
      p.sourceType.toLowerCase().includes(q)
    );
  });

  const formatRelativeTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <>
      {/* Delete Confirmation Modal Sub-View */}
      {viewModel.activeDeleteDialog && (
        <DeleteConfirmModal dialog={viewModel.activeDeleteDialog} />
      )}

      {recentProjects.length === 0 ? (
        /* Screen 1: Empty Initial Landing State when no projects exist */
        <div className="flex flex-1 flex-col items-center justify-center bg-[#f9fbfd] px-6 py-12 text-center select-none">
          <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            {/* Logo / Brand Icon */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-2xs">
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  PipeForge Data Engine
                </h1>
                <p className="mt-1 text-xs text-slate-500">
                  High-performance, read-only DataFrame explorer for Excel workbooks and CSV files.
                </p>
              </div>
            </div>

            {/* Ingestion & Loading Indicators */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
              {isBusy ? (
                <div className="flex flex-col items-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  <span className="text-xs font-medium text-slate-800">Processing file...</span>
                  <p className="text-xs text-slate-500">Extracting worksheet data and building DataFrames</p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-500">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <h2 className="text-base font-semibold tracking-tight text-slate-800">No project open</h2>
                  <p className="text-xs text-slate-500">
                    Get started by importing a local spreadsheet or opening a saved project.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons bound to ViewModel commands */}
            <div className="flex w-full items-center justify-center gap-3">
              <button
                type="button"
                disabled={!canImport}
                onClick={() => viewModel.executeImportFile()}
                className={`flex flex-1 items-center justify-center space-x-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all shadow-xs ${
                  canImport
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.99] cursor-pointer'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Import File</span>
              </button>

              <button
                type="button"
                disabled={!canOpen}
                onClick={() => viewModel.executeOpenProject()}
                className={`flex flex-1 items-center justify-center space-x-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all border ${
                  canOpen
                    ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.99] cursor-pointer shadow-2xs'
                    : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                }`}
              >
                <FolderOpen className="h-4 w-4 text-slate-500" />
                <span>Open Project</span>
              </button>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mt-4 flex w-full items-start space-x-3 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-left text-xs text-rose-800 shadow-xs animate-in fade-in slide-in-from-top-2 duration-150">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div className="flex-1">
                  <span className="font-semibold text-rose-900">Operation Error</span>
                  <p className="mt-0.5 text-rose-800/90">{errorMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => viewModel.clearErrorMessage()}
                  className="text-rose-600 hover:text-rose-900 p-0.5 rounded hover:bg-rose-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Screen 1b: Recent Projects Hub with Search & List of Divs */
        <div className="flex flex-1 flex-col overflow-hidden bg-[#f9fbfd]">
          {/* Hub Header Bar */}
          <div className="border-b border-slate-200 bg-white px-6 py-4 select-none shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg font-bold text-slate-900">Recent Projects</h1>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    {recentProjects.length}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Open a previously saved project workspace or import new spreadsheets.
                </p>
              </div>

              {/* Top Actions: Import File & Open Project */}
              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  disabled={!canOpen}
                  onClick={() => viewModel.executeOpenProject()}
                  className="flex items-center space-x-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-slate-500" />
                  <span>Open Project...</span>
                </button>

                <button
                  type="button"
                  disabled={!canImport}
                  onClick={() => viewModel.executeImportFile()}
                  className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-medium text-white shadow-xs transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>Import File</span>
                </button>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="mt-3.5 flex items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search recent projects by name or path..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50/60 pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mx-6 mt-4 flex items-start space-x-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 shadow-2xs">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div className="flex-1">
                <span className="font-semibold text-rose-900">Operation Error</span>
                <p className="mt-0.5 text-rose-800/90">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => viewModel.clearErrorMessage()}
                className="text-rose-600 hover:text-rose-900 p-0.5 rounded hover:bg-rose-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Recent Projects List of Divs View */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {filteredRecents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-600">No projects match "{searchQuery}"</p>
                <p className="text-xs text-slate-400 mt-1">Try searching with a different keyword.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Section Header */}
                <div className="flex items-center justify-between px-1 pb-1">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Saved Workspaces & Data Files
                  </h2>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {filteredRecents.length} {filteredRecents.length === 1 ? 'project' : 'projects'}
                  </span>
                </div>

                {/* Projects Div List */}
                <div className="space-y-2">
                  {filteredRecents.map((project) => {
                    const canDelete = viewModel.canDeleteProject(project.id);
                    return (
                      <div
                        key={project.id}
                        onClick={() => viewModel.openRecentProject(project.id)}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200 bg-white hover:border-emerald-500/50 hover:shadow-sm p-3.5 transition-all cursor-pointer shadow-2xs gap-3"
                      >
                        {/* Left: Format Badge + Project Info */}
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          {/* Span format badge taking the place of the icon div */}
                          <span className="inline-flex items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-mono font-semibold uppercase text-emerald-800 shrink-0">
                            {project.sourceType}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                              {project.name}
                            </div>
                            <div className="flex items-center space-x-1.5 text-slate-500 font-mono text-xs truncate mt-0.5">
                              <Folder className="h-3 w-3 shrink-0 text-amber-500" />
                              <span className="truncate" title={project.sourceFilePath}>
                                {project.sourceFilePath || 'Local Storage'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Middle & Right: Metadata & Actions */}
                        <div className="flex items-center justify-between sm:justify-end space-x-4 sm:space-x-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 text-xs text-slate-600">
                          {/* Tables & Rows */}
                          <div className="flex items-center space-x-1.5 font-mono">
                            <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>
                              <strong className="text-slate-800">{project.tableCount}</strong>{' '}
                              {project.tableCount === 1 ? 'Table' : 'Tables'}
                            </span>
                            {project.rowCount > 0 && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-600">
                                  {project.rowCount.toLocaleString()} rows
                                </span>
                              </>
                            )}
                          </div>

                          {/* Last Opened */}
                          <div className="hidden lg:flex items-center space-x-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{formatRelativeTime(project.lastOpenedAt || project.updatedAt)}</span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={!canDelete}
                              title={
                                canDelete
                                  ? 'Delete project'
                                  : 'Cannot delete actively open project. Close it first.'
                              }
                              onClick={() => viewModel.executeRequestDeleteProject(project.id, project.name)}
                              className={`rounded-lg p-1.5 transition-colors ${
                                canDelete
                                  ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer'
                                  : 'text-slate-300 cursor-not-allowed opacity-40'
                              }`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
