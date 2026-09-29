/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AlertCircle,
  AlertOctagon,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Download,
  FileCode,
  FileWarning,
  HelpCircle,
  RefreshCw,
  RotateCw,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { UpdateMode } from '../domain/UpdateTypes.ts';
import {
  createCorruptSampleFile,
  createEmptySampleFile,
  createSampleInventoryCsv,
  createSampleSalesXlsx,
  createUnsupportedSampleFile,
} from '../services/sampleFiles.ts';

export const SampleFilesBar: React.FC = () => {
  const {
    viewModel,
    updateViewModel,
    updateService,
    importWithSampleFile,
    simulateStoreWriteFailure,
    setSimulateStoreWriteFailure,
    resetAllData,
  } = useApp();

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'sprint1_2' | 'sprint3'>('sprint3');

  const remoteVersion = updateService.getSimulatedRemoteVersion();
  const isCheckFailing = updateService.isSimulatingCheckError();
  const isDownloadFailing = updateService.isSimulatingDownloadFailure();

  return (
    <div className="border-t border-slate-200 bg-white text-xs text-slate-700 shadow-2xs select-none">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-bold text-slate-900">Test Harness & Spec Fixtures</span>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('sprint3');
                setIsExpanded(true);
              }}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                activeTab === 'sprint3'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sprint 3: Updates (UC8–UC11)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('sprint1_2');
                setIsExpanded(true);
              }}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                activeTab === 'sprint1_2'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sprint 1 & 2: Files & Grids
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
          >
            <span>{isExpanded ? 'Hide Panel' : 'Show Scenarios'}</span>
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-200 px-4 py-3 bg-[#f8f9fa]">
          {activeTab === 'sprint3' ? (
            /* Sprint 3 Update Scenarios */
            <div className="flex flex-col space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                  1. Trigger Checks:
                </span>

                <button
                  type="button"
                  onClick={() => updateViewModel.checkForUpdate(true)}
                  className="flex items-center space-x-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                  title="UC9-S1/S2: Manual check via user command"
                >
                  <RefreshCw className="h-3 w-3 text-emerald-600" />
                  <span>Manual Check (UC9-S1/S2)</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateViewModel.executeBackgroundCheck()}
                  className="flex items-center space-x-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer shadow-2xs"
                  title="UC9-S3/S4: Background timer interval check"
                >
                  <Zap className="h-3 w-3 text-blue-600" />
                  <span>Simulate Background Timer (UC9-S3/S4)</span>
                </button>

                <div className="h-4 w-px bg-slate-300 mx-1" />

                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                  2. Remote Release Target:
                </span>

                <button
                  type="button"
                  onClick={() => updateService.setSimulatedRemoteVersion('1.5.0')}
                  className={`flex items-center space-x-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer shadow-2xs ${
                    remoteVersion === '1.5.0'
                      ? 'border-emerald-500 bg-emerald-600 text-white font-bold'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Sets GitHub latest release to v1.5.0 (> v1.0.0 installed)"
                >
                  <span>Release v1.5.0 (Newer)</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateService.setSimulatedRemoteVersion('1.0.0')}
                  className={`flex items-center space-x-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer shadow-2xs ${
                    remoteVersion === '1.0.0'
                      ? 'border-emerald-500 bg-emerald-600 text-white font-bold'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Sets GitHub latest release to v1.0.0 (Up to date)"
                >
                  <span>Release v1.0.0 (Up to Date)</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateService.setSimulatedRemoteVersion(null)}
                  className={`flex items-center space-x-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer shadow-2xs ${
                    remoteVersion === null
                      ? 'border-emerald-500 bg-emerald-600 text-white font-bold'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Simulate pulled release (latest <= current)"
                >
                  <span>No Release / Pulled</span>
                </button>
              </div>

              {/* Row 2: Error injection switches & mode helpers */}
              <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-200/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                  3. Error Injections:
                </span>

                <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] select-none text-slate-700">
                  <input
                    type="checkbox"
                    checked={isCheckFailing}
                    onChange={(e) => updateService.setSimulateCheckNetworkError(e.target.checked)}
                    className="rounded border-slate-300 text-rose-600 focus:ring-0 cursor-pointer"
                  />
                  <span className={isCheckFailing ? 'text-rose-600 font-bold' : ''}>
                    Simulate UpdateCheckError (503 / Network failure)
                  </span>
                </label>

                <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] select-none text-slate-700">
                  <input
                    type="checkbox"
                    checked={isDownloadFailing}
                    onChange={(e) => updateService.setSimulateDownloadFailure(e.target.checked)}
                    className="rounded border-slate-300 text-rose-600 focus:ring-0 cursor-pointer"
                  />
                  <span className={isDownloadFailing ? 'text-rose-600 font-bold' : ''}>
                    Simulate UpdateDownloadError (Stream interruption)
                  </span>
                </label>

                <div className="ml-auto flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => updateViewModel.openSettings()}
                    className="flex items-center space-x-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>Open Settings Dialog</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Sprint 1 & 2 File Ingestion Scenarios */
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 mr-2 text-[11px] text-slate-500">
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Load sample file:</span>
              </div>

              <button
                type="button"
                disabled={!viewModel.canImportFile}
                onClick={() => importWithSampleFile(createSampleSalesXlsx())}
                className="flex items-center space-x-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="UC1-S1: Multi-sheet XLSX (Q1, Q2, Summary)"
              >
                <CheckSquare className="h-3 w-3 text-emerald-600" />
                <span>Multi-sheet Sales.xlsx (UC1-S1)</span>
              </button>

              <button
                type="button"
                disabled={!viewModel.canImportFile}
                onClick={() => importWithSampleFile(createSampleInventoryCsv())}
                className="flex items-center space-x-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 hover:bg-blue-100 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="UC1-S2: Single table CSV"
              >
                <FileCode className="h-3 w-3 text-blue-600" />
                <span>Single-table Inventory.csv (UC1-S2)</span>
              </button>

              <div className="h-4 w-px bg-slate-300 mx-1" />

              <button
                type="button"
                disabled={!viewModel.canImportFile}
                onClick={() => importWithSampleFile(createEmptySampleFile())}
                className="flex items-center space-x-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="UC1-S6: Empty file triggering EmptyDataError"
              >
                <FileWarning className="h-3 w-3 text-amber-600" />
                <span>Empty File (UC1-S6)</span>
              </button>

              <button
                type="button"
                disabled={!viewModel.canImportFile}
                onClick={() => importWithSampleFile(createCorruptSampleFile())}
                className="flex items-center space-x-1 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-100 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="UC1-S5: Corrupted file triggering ParseError"
              >
                <AlertOctagon className="h-3 w-3 text-rose-600" />
                <span>Corrupt File (UC1-S5)</span>
              </button>

              <button
                type="button"
                disabled={!viewModel.canImportFile}
                onClick={() => importWithSampleFile(createUnsupportedSampleFile())}
                className="flex items-center space-x-1 rounded-lg border border-purple-300 bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-800 hover:bg-purple-100 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title="UC1-S4: Unsupported file extension triggering UnsupportedFileTypeError"
              >
                <ShieldAlert className="h-3 w-3 text-purple-600" />
                <span>Unsupported PDF (UC1-S4)</span>
              </button>

              <div className="ml-auto flex items-center space-x-2">
                {/* Write error simulation toggle */}
                <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] select-none text-slate-600 hover:text-slate-900 mr-2">
                  <input
                    type="checkbox"
                    checked={simulateStoreWriteFailure}
                    onChange={(e) => setSimulateStoreWriteFailure(e.target.checked)}
                    className="rounded border-slate-300 bg-white text-rose-600 focus:ring-0 cursor-pointer"
                  />
                  <span className={simulateStoreWriteFailure ? 'text-rose-600 font-bold' : ''}>
                    Simulate StoreWriteError (UC3-S2)
                  </span>
                </label>

                <button
                  type="button"
                  onClick={resetAllData}
                  className="flex items-center space-x-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
                  title="Clear all stored projects and reset"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Reset Store</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
