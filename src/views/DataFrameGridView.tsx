/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertCircle, FileSpreadsheet, Loader2, RotateCw } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { TableViewModel } from '../viewmodels/TableViewModel.ts';

interface DataFrameGridViewProps {
  tableViewModel: TableViewModel;
}

export const DataFrameGridView: React.FC<DataFrameGridViewProps> = ({ tableViewModel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);

  // Subscribe to TableViewModel observable updates
  useEffect(() => {
    const unsubscribe = tableViewModel.subscribe(() => {
      setTick((t) => t + 1);
    });
    return () => unsubscribe();
  }, [tableViewModel]);

  // Keyboard navigation & non-mutating edit interception (UC7-S2, UC7-S3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if grid has focus or is active
      if (!containerRef.current?.contains(document.activeElement)) {
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        tableViewModel.moveSelection('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        tableViewModel.moveSelection('down');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        tableViewModel.moveSelection('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        tableViewModel.moveSelection('right');
      } else if (
        e.key === 'Enter' ||
        e.key === 'Delete' ||
        e.key === 'Backspace' ||
        e.key === 'F2' ||
        (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)
      ) {
        // UC7-S3: Edit interception safeguard - swallow mutation keys silently
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tableViewModel]);

  const {
    columns,
    rows,
    isLoading,
    errorMessage,
    totalRowCount,
    selectedRowIndex,
    selectedColumnName,
    selectedCellValue,
    selectedCellType,
  } = tableViewModel;

  // Format value for cell rendering
  const formatCellValue = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  const selectedColObj = selectedColumnName
    ? columns.find((c) => c.name === selectedColumnName)
    : undefined;
  const displayType = selectedCellType || selectedColObj?.inferredType || '-';
  const rowDisplayNumber =
    selectedRowIndex !== null
      ? (rows[selectedRowIndex]?.absoluteRowIndex ?? selectedRowIndex)
      : '-';

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="flex flex-1 flex-col overflow-hidden bg-white text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500/30"
      onKeyDown={(e) => {
        // Prevent editing events at container boundary
        if (e.key === 'Enter' || e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
        }
      }}
    >
      {/* Formula / Cell Inspection Bar (Above the DataFrame, below the table name) */}
      <div className="flex items-center space-x-3 border-b border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-700 select-none shadow-2xs shrink-0">
        {/* Column 1: One column with two rows of pills for Row and Col */}
        <div className="flex flex-col space-y-0.5 shrink-0 min-w-28">
          {/* Row pill */}
          <div className="inline-flex items-center space-x-1 rounded bg-slate-100 border border-slate-200/90 px-1.5 py-0.2 text-[10px] font-mono leading-none">
            <span className="text-slate-400 font-semibold text-[9px] uppercase">Row</span>
            <span className="font-bold text-slate-800">{rowDisplayNumber}</span>
          </div>

          {/* Col pill */}
          <div className="inline-flex items-center space-x-1 rounded bg-slate-100 border border-slate-200/90 px-1.5 py-0.2 text-[10px] font-mono leading-none truncate max-w-48">
            <span className="text-slate-400 font-semibold text-[9px] uppercase">Col</span>
            <span
              className="font-bold text-slate-800 truncate"
              title={selectedColumnName || undefined}
            >
              {selectedColumnName || '-'}
            </span>
          </div>
        </div>

        {/* Column 2: Data Type in Pill */}
        <div className="shrink-0">
          <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-emerald-800">
            {displayType}
          </span>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 shrink-0" />

        {/* Column 3: Cell Value display */}
        <div className="flex flex-1 items-center space-x-2 min-w-0">
          <span className="text-[11px] font-mono text-slate-400 select-none font-bold italic">
            fx
          </span>
          <div className="flex-1 rounded border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-xs font-mono text-slate-900 truncate shadow-2xs select-text">
            {selectedRowIndex !== null && selectedColumnName !== null ? (
              selectedCellValue === null || selectedCellValue === undefined ? (
                <span className="text-slate-400 italic">null</span>
              ) : (
                formatCellValue(selectedCellValue)
              )
            ) : (
              <span className="text-slate-400 italic">No cell selected</span>
            )}
          </div>
        </div>
      </div>

      {/* Grid Main Viewport Area */}
      <div className="relative flex-1 overflow-auto border-b border-slate-200 bg-white">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/75 backdrop-blur-2xs">
            <div className="flex items-center space-x-3 rounded-lg border border-slate-200 bg-white px-5 py-3 text-xs shadow-md">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              <span className="font-medium text-slate-800">Loading page records...</span>
            </div>
          </div>
        )}

        {/* Error Banner State (UC5-S3, UC6-S4) */}
        {errorMessage ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-[#f9fbfd]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 border border-rose-200 text-rose-600 mb-3 shadow-2xs">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-rose-900">Failed to read table data chunk</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md">{errorMessage}</p>
            <button
              type="button"
              onClick={() => tableViewModel.reloadPage()}
              className="mt-4 flex items-center space-x-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-medium text-white transition-colors cursor-pointer shadow-xs active:scale-95"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>Retry Fetch</span>
            </button>
          </div>
        ) : totalRowCount === 0 && rows.length === 0 ? (
          /* Empty Table State */
          <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-[#f9fbfd]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-400 mb-3">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Table contains no data rows</p>
            <p className="mt-1 text-xs text-slate-400">The selected sheet or table has 0 records.</p>
          </div>
        ) : (
          /* Data Grid Table View */
          <table className="w-full border-collapse text-left font-mono text-xs bg-white">
            {/* Header Row: Google Sheets style column headers with inferred type */}
            <thead className="sticky top-0 z-20 border-b border-slate-300 bg-[#f8f9fa] shadow-2xs select-none">
              <tr>
                {/* Fixed leftmost 0-based row index header */}
                <th
                  scope="col"
                  className="sticky left-0 z-20 w-16 border-r border-b border-slate-300 bg-[#f1f3f4] px-3 py-2 text-center text-[11px] font-bold text-slate-600"
                >
                  #
                </th>

                {/* Domain Column Headers */}
                {columns.map((col) => (
                  <th
                    key={col.name}
                    scope="col"
                    className="border-r border-b border-slate-300 bg-[#f8f9fa] px-4 py-2 text-[11px] font-semibold text-slate-800 whitespace-nowrap min-w-36 max-w-xs"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="truncate text-slate-900 font-bold">{col.name}</span>
                      <span className="rounded bg-emerald-50 border border-emerald-200 px-1 py-0.2 text-[9px] font-semibold text-emerald-800">
                        {col.inferredType}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map((row, rowIdx) => {
                const isRowSelected = selectedRowIndex === rowIdx;
                return (
                  <tr
                    key={row.absoluteRowIndex}
                    className={`transition-colors ${
                      isRowSelected ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Fixed 0-based absolute row index */}
                    <td
                      className={`sticky left-0 z-10 border-r border-slate-200 px-3 py-1.5 text-center text-[10px] select-none font-semibold ${
                        isRowSelected
                          ? 'bg-emerald-100/70 text-emerald-900 font-bold'
                          : 'bg-[#f8f9fa] text-slate-500'
                      }`}
                    >
                      {row.absoluteRowIndex}
                    </td>

                    {/* Data Cells */}
                    {columns.map((col) => {
                      const isCellSelected =
                        selectedRowIndex === rowIdx && selectedColumnName === col.name;
                      const rawValue = row.getValue(col.name);
                      const formatted = formatCellValue(rawValue);

                      return (
                        <td
                          key={col.name}
                          onClick={() => tableViewModel.setSelectedCell(rowIdx, col.name)}
                          onDoubleClick={(e) => {
                            // UC7-S3: Intercept & discard double clicks (no editor spawned)
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className={`border-r border-slate-200 px-4 py-1.5 text-xs truncate max-w-xs cursor-pointer select-text transition-all ${
                            isCellSelected
                              ? 'bg-emerald-50 text-slate-900 ring-2 ring-emerald-600 ring-inset rounded-xs font-semibold shadow-2xs'
                              : 'text-slate-800'
                          }`}
                          title={formatted}
                        >
                          {formatted === '' ? (
                            <span className="text-slate-300 italic">null</span>
                          ) : (
                            formatted
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
