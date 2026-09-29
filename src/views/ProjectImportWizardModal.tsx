/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  Folder,
  FolderOpen,
  Layers,
  Loader2,
  Save,
  Table as TableIcon,
  UploadCloud,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  ProjectImportWizardViewModel,
  WizardStep,
} from '../viewmodels/ProjectImportWizardViewModel.ts';

interface ProjectImportWizardModalProps {
  wizard: ProjectImportWizardViewModel;
}

export const ProjectImportWizardModal: React.FC<ProjectImportWizardModalProps> = ({ wizard }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    return wizard.subscribe(() => setTick((p) => p + 1));
  }, [wizard]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      wizard.handleDroppedFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Modal Header & Step Indicator */}
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Import & Create Project</h3>
                <p className="text-xs text-slate-500">
                  Step-by-step ingestion, schema inspection, and project configuration
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => wizard.cancel()}
              disabled={wizard.isProcessing}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stepper Navigation */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {/* Step 1 */}
            <div className="flex items-center space-x-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  wizard.currentStep > WizardStep.SelectFile
                    ? 'bg-emerald-600 text-white'
                    : wizard.currentStep === WizardStep.SelectFile
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 ring-2 ring-emerald-600/20'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {wizard.currentStep > WizardStep.SelectFile ? (
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                ) : (
                  '1'
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  wizard.currentStep === WizardStep.SelectFile
                    ? 'text-slate-900 font-bold'
                    : wizard.currentStep > WizardStep.SelectFile
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                1. Select File
              </span>
            </div>

            <div className="h-0.5 flex-1 mx-3 bg-slate-200" />

            {/* Step 2 */}
            <div className="flex items-center space-x-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  wizard.currentStep > WizardStep.InspectTables
                    ? 'bg-emerald-600 text-white'
                    : wizard.currentStep === WizardStep.InspectTables
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 ring-2 ring-emerald-600/20'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {wizard.currentStep > WizardStep.InspectTables ? (
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                ) : (
                  '2'
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  wizard.currentStep === WizardStep.InspectTables
                    ? 'text-slate-900 font-bold'
                    : wizard.currentStep > WizardStep.InspectTables
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                2. Inspect Tables
              </span>
            </div>

            <div className="h-0.5 flex-1 mx-3 bg-slate-200" />

            {/* Step 3 */}
            <div className="flex items-center space-x-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  wizard.currentStep === WizardStep.ConfigureProject
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 ring-2 ring-emerald-600/20'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                3
              </div>
              <span
                className={`text-xs font-medium ${
                  wizard.currentStep === WizardStep.ConfigureProject
                    ? 'text-slate-900 font-bold'
                    : 'text-slate-400'
                }`}
              >
                3. Configure & Save
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#f9fbfd]">
          {/* Global Processing Spinner */}
          {wizard.isProcessing && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-sm font-semibold text-slate-800">
                {wizard.currentStep === WizardStep.SelectFile
                  ? 'Analyzing file structure & headers...'
                  : wizard.currentStep === WizardStep.InspectTables
                  ? 'Preparing workspace...'
                  : 'Compiling project container & saving to disk store...'}
              </p>
            </div>
          )}

          {/* STEP 1: Select File */}
          {!wizard.isProcessing && wizard.currentStep === WizardStep.SelectFile && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-50/60'
                    : 'border-slate-300 bg-white hover:border-emerald-400 hover:bg-slate-50'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-3 border border-emerald-200 shadow-2xs">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Drag and drop your spreadsheet here
                </h4>
                <p className="mt-1 text-xs text-slate-500 max-w-sm">
                  Supports Excel Workbooks (<span className="font-mono text-emerald-700 font-semibold">.xlsx, .xls</span>) and CSV files (<span className="font-mono text-emerald-700 font-semibold">.csv</span>).
                </p>

                <div className="mt-4 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => wizard.browseViaPicker()}
                    className="flex items-center space-x-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span>Browse Local File</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Inspect Tables Preview */}
          {!wizard.isProcessing && wizard.currentStep === WizardStep.InspectTables && (
            <div className="space-y-4">
              {/* Inspection Summary Banner */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        File Parsed Successfully
                      </h4>
                      <p className="text-xs text-slate-600">
                        {wizard.selectedFile?.name}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-md bg-white border border-emerald-300 px-2.5 py-1 text-xs font-mono font-bold uppercase text-emerald-800">
                    {wizard.fileType}
                  </span>
                </div>
              </div>

              {/* Staged Tables Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                  <span>Detected Data Tables ({wizard.totalTables})</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Total Rows: {wizard.totalRows.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {wizard.tablesList.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <TableIcon className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs font-bold text-slate-900">{t.name}</span>
                        </div>
                        <span className="text-xs font-mono text-slate-600">
                          <strong>{t.rowCount.toLocaleString()}</strong> rows • <strong>{t.columnCount}</strong> columns
                        </span>
                      </div>

                      {/* Column Types Pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {t.columns.map((c) => (
                          <span
                            key={c.name}
                            className="rounded bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-700"
                            title={`${c.name} (${c.type})`}
                          >
                            <span className="text-slate-900 font-semibold">{c.name}</span>
                            <span className="text-emerald-700 font-medium ml-1">({c.type})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Configure Project Name & Save Location */}
          {!wizard.isProcessing && wizard.currentStep === WizardStep.ConfigureProject && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                {/* Project Name Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={wizard.projectName}
                    onChange={(e) => wizard.setProjectName(e.target.value)}
                    placeholder="e.g. Q1 Financial Performance"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 font-medium"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Give this workspace a recognizable name for quick retrieval from your project catalog.
                  </p>
                </div>

                {/* Destination File Path */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Storage Directory / Path
                  </label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Folder className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={wizard.saveLocation}
                        onChange={(e) => wizard.setSaveLocation(e.target.value)}
                        placeholder="e.g. C:\Data\Projects"
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => wizard.browseSaveLocation()}
                      className="rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                    >
                      Browse...
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    The destination path where project data and schemas are stored.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {wizard.errorMessage && (
            <div className="mt-4 flex items-start space-x-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 shadow-2xs">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div className="flex-1">
                <span className="font-bold text-rose-900">Ingestion Notice</span>
                <p className="mt-0.5 text-rose-800/90 leading-relaxed">{wizard.errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4 shadow-2xs">
          <div>
            {wizard.currentStep > WizardStep.SelectFile && (
              <button
                type="button"
                disabled={wizard.isProcessing}
                onClick={() => wizard.goBack()}
                className="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={wizard.isProcessing}
              onClick={() => wizard.cancel()}
              className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              Cancel
            </button>

            {wizard.currentStep === WizardStep.InspectTables ? (
              <button
                type="button"
                disabled={wizard.isProcessing}
                onClick={() => wizard.goNext()}
                className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-semibold text-white transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : wizard.currentStep === WizardStep.ConfigureProject ? (
              <button
                type="button"
                disabled={!wizard.isStep3Valid || wizard.isProcessing}
                onClick={() => wizard.confirmCreateProject()}
                className={`flex items-center space-x-1.5 rounded-lg px-5 py-2 text-xs font-semibold text-white transition-all shadow-xs ${
                  wizard.isStep3Valid && !wizard.isProcessing
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                }`}
              >
                {wizard.isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>{wizard.isProcessing ? 'Saving Project...' : 'Create & Open Project'}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
