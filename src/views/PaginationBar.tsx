/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChevronLeft, ChevronRight, Loader2, RotateCw } from 'lucide-react';
import React from 'react';
import { TableViewModel } from '../viewmodels/TableViewModel.ts';

interface PaginationBarProps {
  tableViewModel: TableViewModel;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({ tableViewModel }) => {
  const {
    displayPageNumber,
    totalPages,
    pageRangeText,
    isLoading,
    canExecuteNextPage,
    canExecutePrevPage,
    canExecuteReload,
  } = tableViewModel;

  return (
    <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-white px-6 py-2.5 text-xs text-slate-700 shadow-2xs">
      {/* Left: Previous Page Button */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          disabled={!canExecutePrevPage}
          onClick={() => tableViewModel.prevPage()}
          className={`flex items-center space-x-1.5 rounded-lg border px-3 py-1.5 font-medium transition-all ${
            canExecutePrevPage
              ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 cursor-pointer shadow-2xs'
              : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60'
          }`}
          title="Previous Page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Previous Page</span>
        </button>
      </div>

      {/* Center: Page indicator & Range summary */}
      <div className="flex items-center space-x-3 font-mono text-xs">
        <div className="flex items-center space-x-1.5 text-slate-700 font-semibold">
          <span>Page</span>
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800 border border-emerald-200 font-bold">
            {displayPageNumber}
          </span>
          <span className="text-slate-400">of</span>
          <span className="text-slate-700">{totalPages}</span>
        </div>

        <span className="text-slate-300">•</span>

        <span className="text-slate-500">
          ({pageRangeText})
        </span>
      </div>

      {/* Right: Next Page & Reload Buttons */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          disabled={!canExecuteReload}
          onClick={() => tableViewModel.reloadPage()}
          className={`flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95 shadow-2xs ${
            canExecuteReload ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
          }`}
          title="Reload active page"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
          ) : (
            <RotateCw className="h-3.5 w-3.5 text-slate-500" />
          )}
          <span>Reload</span>
        </button>

        <button
          type="button"
          disabled={!canExecuteNextPage}
          onClick={() => tableViewModel.nextPage()}
          className={`flex items-center space-x-1.5 rounded-lg border px-3 py-1.5 font-medium transition-all ${
            canExecuteNextPage
              ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 cursor-pointer shadow-2xs'
              : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60'
          }`}
          title="Next Page"
        >
          <span>Next Page</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
