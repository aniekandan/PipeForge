/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ArrowLeft,
  Columns,
  Download,
  Hash,
  Layers,
  Loader2,
  Pin,
  PinOff,
  Search,
  Table as TableIcon,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { ShellViewModel } from '../viewmodels/ShellViewModel.ts';
import { DataFrameGridView } from './DataFrameGridView.tsx';
import { PaginationBar } from './PaginationBar.tsx';

interface ProjectLoadedViewProps {
  viewModel: ShellViewModel;
}

export const ProjectLoadedView: React.FC<ProjectLoadedViewProps> = ({ viewModel }) => {
  const project = viewModel.currentProject;
  const [, setTick] = useState(0);
  const [tableSearch, setTableSearch] = useState('');
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Subscribe to ProjectViewModel observable changes
  useEffect(() => {
    if (!project) return;
    const unsubscribe = project.subscribe(() => {
      setTick((t) => t + 1);
    });
    return () => unsubscribe();
  }, [project]);

  // Filter tables in sidebar
  const filteredTables = useMemo(() => {
    if (!project) return [];
    if (!tableSearch.trim()) return project.tables;
    const query = tableSearch.toLowerCase().trim();
    return project.tables.filter((t) => t.name.toLowerCase().includes(query));
  }, [project, tableSearch]);

  if (!project) return null;

  const canClose = viewModel.canCloseProject;
  const isClosing = viewModel.isBusy;
  const activeTableVM = project.activeTable;
  const activeTableSummary = project.tables.find((t) => t.id === project.selectedTableId);

  // The sidebar is shown fully expanded if it's pinned OR hovered over the strip
  const isExpanded = isPinned || isHovered;

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#f9fbfd] text-slate-800">
      {/* Top Main Navigation Bar - Google Sheets Light Theme */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 select-none shadow-2xs">
        <div className="flex items-center space-x-2.5 min-w-0">
          {/* Back to Projects List (Saves & Closes Project) */}
          <button
            type="button"
            disabled={!canClose || isClosing}
            onClick={() => viewModel.executeCloseProject()}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
              canClose && !isClosing
                ? 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 active:scale-95 cursor-pointer shadow-2xs'
                : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60'
            }`}
            title="Back to projects list (saves and closes project)"
          >
            {isClosing ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            ) : (
              <ArrowLeft className="h-4 w-4" />
            )}
          </button>

          <h1 className="text-sm font-semibold tracking-tight text-slate-900 truncate">
            {project.name}
          </h1>

          <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-mono uppercase font-semibold text-emerald-800 shrink-0">
            {project.sourceType}
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2">
          {/* Export / Download .pipeforge file to disk */}
          <button
            type="button"
            onClick={() => viewModel.executeExportProject(project.id)}
            className="flex items-center space-x-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors shadow-2xs cursor-pointer"
            title="Download .pipeforge container to your computer"
          >
            <Download className="h-3.5 w-3.5 text-emerald-700" />
            <span>Export .pipeforge</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout: Collapsible Rail / Sidebar + DataFrame Viewport */}
      <div className="relative flex flex-1 overflow-hidden bg-[#f9fbfd]">
        {/* Collapsed Left Strip (Rail) - Always visible when unpinned */}
        {!isPinned && (
          <div
            onMouseEnter={() => setIsHovered(true)}
            className="w-13 border-r border-slate-200 bg-[#f8f9fa] flex flex-col items-center py-3 space-y-2 z-20 shrink-0 select-none cursor-pointer"
            title="Hover to expand tables list"
          >
            <div className="p-1 text-slate-500 hover:text-emerald-700 transition-colors">
              <Layers className="h-4 w-4 text-emerald-600" />
            </div>

            <div className="w-8 h-px bg-slate-200 my-1" />

            {/* Table Quick Icons */}
            <div className="flex-1 w-full flex flex-col items-center space-y-2 overflow-y-auto px-1">
              {project.tables.map((table, idx) => {
                const isSelected = project.selectedTableId === table.id;
                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      project.selectTable(table.id);
                    }}
                    className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title={`${table.name} (${table.rowCount.toLocaleString()} rows)`}
                  >
                    <TableIcon className="h-4 w-4" />
                    <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-100 border border-slate-300 px-1 text-[9px] font-mono text-slate-700 font-medium">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Full Expanded Sidebar (Pinned or Hover-Overlay) */}
        {isExpanded && (
          <aside
            onMouseEnter={() => {
              if (!isPinned) setIsHovered(true);
            }}
            onMouseLeave={() => {
              if (!isPinned) setIsHovered(false);
            }}
            className={`${
              isPinned
                ? 'w-64 sm:w-72 relative'
                : 'w-64 sm:w-72 absolute top-0 left-0 bottom-0 z-40 shadow-xl bg-white/98 backdrop-blur-md border-r-2 border-emerald-500 animate-in slide-in-from-left duration-150'
            } flex flex-col border-r border-slate-200 bg-[#f8f9fa] shrink-0 select-none`}
          >
            {/* Sidebar Header with Pin/Unpin Action */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center space-x-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Sheets & Tables
                </span>
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.2 text-[10px] font-mono font-medium text-slate-600">
                  {project.tables.length}
                </span>
              </div>

              {/* Pin / Unpin Button */}
              <button
                type="button"
                onClick={() => {
                  setIsPinned(!isPinned);
                  if (isPinned) setIsHovered(false);
                }}
                className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors cursor-pointer ${
                  isPinned
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800'
                }`}
                title={isPinned ? 'Unpin Sidebar (Auto-collapse)' : 'Pin Sidebar'}
              >
                {isPinned ? <Pin className="h-3.5 w-3.5 fill-current" /> : <PinOff className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Optional search when multiple tables exist */}
            {project.tables.length > 2 && (
              <div className="p-3 border-b border-slate-200 bg-white">
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Filter tables..."
                    className="w-full rounded-md border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Tables List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredTables.map((table) => {
                const isSelected = project.selectedTableId === table.id;
                const isTabLoading = isSelected && activeTableVM?.isLoading;

                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => {
                      project.selectTable(table.id);
                      if (!isPinned) setIsHovered(false);
                    }}
                    className={`w-full group flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs font-semibold'
                        : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-md border shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-500 group-hover:text-slate-700'
                        }`}
                      >
                        <TableIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`text-xs truncate ${
                            isSelected ? 'text-emerald-900 font-bold' : 'text-slate-800'
                          }`}
                        >
                          {table.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-1.5 mt-0.5">
                          <span>{table.rowCount.toLocaleString()} rows</span>
                          <span>•</span>
                          <span>{table.columnCount} cols</span>
                        </div>
                      </div>
                    </div>

                    {isTabLoading && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}

              {filteredTables.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  No tables matching "{tableSearch}"
                </div>
              )}
            </div>

            {/* Sidebar Summary Footer */}
            <div className="border-t border-slate-200 bg-white p-3 text-[11px] text-slate-600 font-mono">
              <div className="flex items-center justify-between">
                <span>Total Rows:</span>
                <span className="text-slate-900 font-semibold">
                  {project.tables.reduce((acc, t) => acc + (t.rowCount || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content Area: Selected Table Header & DataFrame Grid */}
        <main className="flex flex-1 flex-col overflow-hidden bg-[#f9fbfd] min-w-0">
          {activeTableVM ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Active Table Sub-Header */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-2.5 select-none shadow-2xs">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <TableIcon className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-sm font-bold text-slate-900">
                      {activeTableVM.name}
                    </h2>
                  </div>

                  {activeTableSummary?.sheetIndex !== undefined &&
                    activeTableSummary?.sheetIndex !== null && (
                      <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                        Sheet Index: {activeTableSummary.sheetIndex}
                      </span>
                    )}
                </div>

                <div className="flex items-center space-x-4 text-xs font-mono text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <Hash className="h-3.5 w-3.5 text-slate-400" />
                    <span>{activeTableVM.totalRowCount.toLocaleString()} Total Records</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center space-x-1.5">
                    <Columns className="h-3.5 w-3.5 text-slate-400" />
                    <span>{activeTableVM.columns.length} Columns</span>
                  </div>
                </div>
              </div>

              {/* Data Table Grid & Pagination */}
              <DataFrameGridView tableViewModel={activeTableVM} />
              <PaginationBar tableViewModel={activeTableVM} />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-slate-400 text-xs p-8 text-center">
              <TableIcon className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-700">No table selected</p>
              <p className="mt-1">Select a table from the sidebar to view its records.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
