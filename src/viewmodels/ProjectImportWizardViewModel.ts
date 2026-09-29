/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppError } from '../domain/errors.ts';
import { Project } from '../domain/Project.ts';
import { FileDescriptor, IFilePickerService } from '../services/IFilePickerService.ts';
import { IProjectService } from '../services/IProjectService.ts';

export enum WizardStep {
  SelectFile = 1,
  InspectTables = 2,
  ConfigureProject = 3,
}

export interface TableInspectionSummary {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  columns: Array<{ name: string; type: string }>;
}

export class ProjectImportWizardViewModel {
  private _currentStep: WizardStep = WizardStep.SelectFile;
  private _selectedFile: FileDescriptor | null = null;
  private _parsedProject: Project | null = null;
  private _isProcessing = false;
  private _errorMessage: string | null = null;

  // Form Fields for Step 3
  private _projectName = '';
  private _saveLocation = 'C:\\Users\\Desktop\\Documents\\PipeForge Projects';

  private readonly _projectService: IProjectService;
  private readonly _filePickerService: IFilePickerService;
  private readonly _onProjectCreated: (project: Project) => void;
  private readonly _onCancel: () => void;
  private readonly _listeners = new Set<() => void>();

  constructor(params: {
    projectService: IProjectService;
    filePickerService: IFilePickerService;
    onProjectCreated: (project: Project) => void;
    onCancel: () => void;
    defaultLocation?: string;
  }) {
    this._projectService = params.projectService;
    this._filePickerService = params.filePickerService;
    this._onProjectCreated = params.onProjectCreated;
    this._onCancel = params.onCancel;
    if (params.defaultLocation) {
      this._saveLocation = params.defaultLocation;
    }
  }

  // --- Subscriptions ---
  public subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private notify(): void {
    this._listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in ProjectImportWizardViewModel listener:', err);
      }
    });
  }

  // --- Getters ---
  public get currentStep(): WizardStep {
    return this._currentStep;
  }

  public get isProcessing(): boolean {
    return this._isProcessing;
  }

  public get errorMessage(): string | null {
    return this._errorMessage;
  }

  public get selectedFile(): FileDescriptor | null {
    return this._selectedFile;
  }

  public get projectName(): string {
    return this._projectName;
  }

  public get saveLocation(): string {
    return this._saveLocation;
  }

  public get fileType(): string {
    if (!this._selectedFile) return '';
    return this._selectedFile.name.split('.').pop()?.toUpperCase() || 'DATA';
  }

  public get totalTables(): number {
    return this._parsedProject?.tables.length ?? 0;
  }

  public get totalRows(): number {
    return this._parsedProject?.tables.reduce((sum, t) => sum + t.rowCount, 0) ?? 0;
  }

  public get tablesList(): TableInspectionSummary[] {
    if (!this._parsedProject) return [];
    return this._parsedProject.tables.map((t) => ({
      id: t.id,
      name: t.name,
      rowCount: t.rowCount,
      columnCount: t.columns.length,
      columns: t.columns.map((c) => ({ name: c.name, type: c.inferredType })),
    }));
  }

  public get isStep3Valid(): boolean {
    return (
      this._projectName.trim().length > 0 &&
      this._saveLocation.trim().length > 0 &&
      !this._isProcessing
    );
  }

  // --- Actions & Commands ---
  public setProjectName(name: string): void {
    this._projectName = name;
    this._errorMessage = null;
    this.notify();
  }

  public setSaveLocation(location: string): void {
    this._saveLocation = location;
    this._errorMessage = null;
    this.notify();
  }

  public async browseSaveLocation(): Promise<void> {
    if (this._filePickerService.pickDirectory) {
      try {
        const dir = await this._filePickerService.pickDirectory();
        if (dir) {
          this._saveLocation = dir;
          this.notify();
        }
      } catch (err) {
        console.error('Failed to pick directory:', err);
      }
    }
  }

  public async browseViaPicker(): Promise<void> {
    this._errorMessage = null;
    this.notify();

    try {
      const descriptor = await this._filePickerService.pickFile(['.xlsx', '.csv']);
      if (!descriptor) return; // User cancelled OS picker, remain on step 1

      await this.processSelectedFile(descriptor);
    } catch (err) {
      this._errorMessage = err instanceof Error ? err.message : 'Failed to select file.';
      this.notify();
    }
  }

  public async handleDroppedFile(file: File): Promise<void> {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'csv') {
      this._errorMessage = `Invalid file format ".${ext || 'unknown'}". Please choose an Excel (.xlsx) or CSV (.csv) file.`;
      this.notify();
      return;
    }

    this._errorMessage = null;
    this._isProcessing = true;
    this.notify();

    try {
      const buffer = await file.arrayBuffer();
      const simulatedPath = `C:\\Users\\Desktop\\Documents\\${file.name}`;
      const descriptor: FileDescriptor = {
        path: (file as unknown as { path?: string }).path || simulatedPath,
        name: file.name,
        buffer,
        source: 'browser-picker',
      };
      await this.processSelectedFile(descriptor);
    } catch (err) {
      this._isProcessing = false;
      this._errorMessage = err instanceof Error ? err.message : 'Failed to read dropped file.';
      this.notify();
    }
  }

  public async processSelectedFile(file: FileDescriptor): Promise<void> {
    this._selectedFile = file;
    this._isProcessing = true;
    this._errorMessage = null;
    this.notify();

    try {
      // Parse file into domain entities
      const project = await this._projectService.parseFile(file);
      this._parsedProject = project;

      // Auto-set initial project name from file name
      this._projectName = project.name;

      // Transition to Step 2 (Table Inspection)
      this._isProcessing = false;
      this._currentStep = WizardStep.InspectTables;
      this.notify();
    } catch (err) {
      this._isProcessing = false;
      if (err instanceof AppError) {
        this._errorMessage = err.message;
      } else if (err instanceof Error) {
        this._errorMessage = err.message;
      } else {
        this._errorMessage = 'An unexpected error occurred while parsing the file.';
      }
      this.notify();
    }
  }

  public goToStep(step: WizardStep): void {
    if (this._isProcessing) return;

    if (step === WizardStep.InspectTables && !this._parsedProject) {
      return;
    }
    if (step === WizardStep.ConfigureProject && !this._parsedProject) {
      return;
    }

    this._errorMessage = null;
    this._currentStep = step;
    this.notify();
  }

  public goNext(): void {
    if (this._currentStep === WizardStep.InspectTables) {
      this.goToStep(WizardStep.ConfigureProject);
    }
  }

  public goBack(): void {
    if (this._currentStep === WizardStep.InspectTables) {
      this.goToStep(WizardStep.SelectFile);
    } else if (this._currentStep === WizardStep.ConfigureProject) {
      this.goToStep(WizardStep.InspectTables);
    }
  }

  public async confirmCreateProject(): Promise<void> {
    if (!this._parsedProject || !this.isStep3Valid) return;

    const trimmedName = this._projectName.trim();
    const trimmedLocation = this._saveLocation.trim();

    this._isProcessing = true;
    this._errorMessage = null;
    this.notify();

    try {
      // Validate uniqueness
      const exists = await this._projectService.checkNameExists(trimmedName);
      if (exists) {
        this._errorMessage = `A project named "${trimmedName}" already exists. Please choose a different name.`;
        this._isProcessing = false;
        this.notify();
        return;
      }

      // Instantiate finalized Project entity
      const finalProject = new Project({
        id: this._parsedProject.id,
        name: trimmedName,
        sourceType: this._parsedProject.sourceType,
        sourceFilePath: trimmedLocation,
        tables: this._parsedProject.tables,
      });

      // Persist to store
      await this._projectService.saveProject(finalProject);

      this._isProcessing = false;
      this._onProjectCreated(finalProject);
    } catch (err) {
      this._isProcessing = false;
      if (err instanceof AppError) {
        this._errorMessage = err.message;
      } else if (err instanceof Error) {
        this._errorMessage = err.message;
      } else {
        this._errorMessage = 'Failed to persist project to storage.';
      }
      this.notify();
    }
  }

  public cancel(): void {
    if (this._isProcessing) return;
    this._onCancel();
  }
}
