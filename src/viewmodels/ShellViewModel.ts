/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppError, StoreWriteError } from '../domain/errors.ts';
import { Project } from '../domain/Project.ts';
import { FileDescriptor, IFilePickerService } from '../services/IFilePickerService.ts';
import { IProjectService } from '../services/IProjectService.ts';
import { CloseFailureDialogViewModel, CloseFailureResult } from './CloseFailureDialogViewModel.ts';
import { DeleteConfirmDialogViewModel } from './DeleteConfirmDialogViewModel.ts';
import { OpenProjectDialogViewModel } from './OpenProjectDialogViewModel.ts';
import { ProjectImportWizardViewModel } from './ProjectImportWizardViewModel.ts';
import { ProjectViewModel } from './ProjectViewModel.ts';
import { ProjectSummaryVM, SessionState } from './types.ts';

export class ShellViewModel {
  private _sessionState: SessionState = SessionState.Idle;
  private _currentProject: ProjectViewModel | null = null;
  private _errorMessage: string | null = null;
  private _activeOpenDialog: OpenProjectDialogViewModel | null = null;
  private _activeCloseFailureDialog: CloseFailureDialogViewModel | null = null;
  private _activeImportWizard: ProjectImportWizardViewModel | null = null;
  private _activeDeleteDialog: DeleteConfirmDialogViewModel | null = null;
  private _recentProjects: ProjectSummaryVM[] = [];
  private _isLoadingRecents = false;

  private readonly _projectService: IProjectService;
  private readonly _filePickerService: IFilePickerService;
  private readonly _listeners = new Set<() => void>();

  constructor(projectService: IProjectService, filePickerService: IFilePickerService) {
    this._projectService = projectService;
    this._filePickerService = filePickerService;

    // UC0: Verify active project state upon launch
    if (this._projectService.activeProject) {
      this._currentProject = ProjectViewModel.from(this._projectService.activeProject, this._projectService);
      this._sessionState = SessionState.ProjectOpen;
    } else {
      this._currentProject = null;
      this._sessionState = SessionState.Idle;
    }

    // Initialize recent projects
    this.refreshRecentProjects();
  }

  // --- Observability Binding ---
  public subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private notify(): void {
    this._listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Error in ViewModel listener:', e);
      }
    });
  }

  // --- Properties ---
  public get sessionState(): SessionState {
    return this._sessionState;
  }

  public get currentProject(): ProjectViewModel | null {
    return this._currentProject;
  }

  public get isProjectOpen(): boolean {
    return this._currentProject !== null;
  }

  public get isBusy(): boolean {
    return (
      this._sessionState === SessionState.Importing ||
      this._sessionState === SessionState.Closing
    );
  }

  public get errorMessage(): string | null {
    return this._errorMessage;
  }

  public get activeOpenDialog(): OpenProjectDialogViewModel | null {
    return this._activeOpenDialog;
  }

  public get activeCloseFailureDialog(): CloseFailureDialogViewModel | null {
    return this._activeCloseFailureDialog;
  }

  public get activeImportWizard(): ProjectImportWizardViewModel | null {
    return this._activeImportWizard;
  }

  public get activeDeleteDialog(): DeleteConfirmDialogViewModel | null {
    return this._activeDeleteDialog;
  }

  public get recentProjects(): ProjectSummaryVM[] {
    return this._recentProjects;
  }

  public get hasRecentProjects(): boolean {
    return this._recentProjects.length > 0;
  }

  public get isLoadingRecents(): boolean {
    return this._isLoadingRecents;
  }

  public clearErrorMessage(): void {
    this._errorMessage = null;
    this.notify();
  }

  public async refreshRecentProjects(): Promise<void> {
    this._isLoadingRecents = true;
    try {
      this._recentProjects = await this._projectService.listProjectSummaries();
    } catch {
      this._recentProjects = [];
    } finally {
      this._isLoadingRecents = false;
      this.notify();
    }
  }

  // --- Command Guards ---
  public get canImportFile(): boolean {
    return this._sessionState === SessionState.Idle;
  }

  public get canOpenProject(): boolean {
    return this._sessionState === SessionState.Idle;
  }

  public get canCloseProject(): boolean {
    return this._sessionState === SessionState.ProjectOpen;
  }

  /**
   * Decision 2 / UC4-S4: Guard preventing deleting the currently active project
   */
  public canDeleteProject(projectId: string): boolean {
    return !this.isBusy && projectId !== this._currentProject?.id;
  }

  /**
   * Direct import for test harness scenarios & sample quick-picks
   */
  public async executeImportFileWithDescriptor(
    file: FileDescriptor,
    projectServiceOverride?: IProjectService
  ): Promise<void> {
    if (!this.canImportFile) return;

    const svc = projectServiceOverride ?? this._projectService;
    this._errorMessage = null;
    this._sessionState = SessionState.Importing;
    this.notify();

    try {
      const domainProject = await svc.importFromFile(file);
      this._currentProject = ProjectViewModel.from(domainProject, this._projectService);
      this._sessionState = SessionState.ProjectOpen;
      await this.refreshRecentProjects();
    } catch (err) {
      if (err instanceof AppError) {
        this._errorMessage = err.message;
      } else if (err instanceof Error) {
        this._errorMessage = err.message;
      } else {
        this._errorMessage = 'An unexpected error occurred during import.';
      }
      this._currentProject = null;
      this._sessionState = SessionState.Idle;
      this.notify();
    }
  }

  /**
   * Launches the multi-step Import & Setup Wizard (UC1b)
   */
  public executeImportFile(): void {
    if (!this.canImportFile) return;

    this._errorMessage = null;
    this._sessionState = SessionState.ImportWizard;
    this._activeImportWizard = new ProjectImportWizardViewModel({
      projectService: this._projectService,
      filePickerService: this._filePickerService,
      onProjectCreated: async (project: Project) => {
        this._activeImportWizard = null;
        this._currentProject = ProjectViewModel.from(project, this._projectService);
        this._sessionState = SessionState.ProjectOpen;
        await this.refreshRecentProjects();
      },
      onCancel: () => {
        this._activeImportWizard = null;
        this._sessionState = SessionState.Idle;
        this.notify();
      },
    });
    this.notify();
  }

  /**
   * Opens a recent project directly from the BlankShellView recent list
   */
  public async openRecentProject(id: string): Promise<void> {
    if (!this.canOpenProject) return;

    this._errorMessage = null;
    this._sessionState = SessionState.Importing;
    this.notify();

    try {
      const domainProject = await this._projectService.load(id);
      this._currentProject = ProjectViewModel.from(domainProject, this._projectService);
      this._sessionState = SessionState.ProjectOpen;
      await this.refreshRecentProjects();
    } catch (err) {
      if (err instanceof AppError) {
        this._errorMessage = err.message;
      } else if (err instanceof Error) {
        this._errorMessage = err.message;
      } else {
        this._errorMessage = 'Failed to load the selected project.';
      }
      this._sessionState = SessionState.Idle;
      this.notify();
    }
  }

  /**
   * Opens or imports a project directly when launched via OS file association (.pipeforge, .xlsx, .csv)
   */
  public async openFileFromNativePath(filePath: string): Promise<void> {
    if (!filePath || !window.electronAPI?.readFile) return;

    try {
      const buffer = await window.electronAPI.readFile(filePath);
      const fileName = filePath.split(/[/\\]/).pop() || 'opened_file';
      const descriptor: FileDescriptor = {
        path: filePath,
        name: fileName,
        buffer,
        source: 'electron-native',
      };
      await this.executeImportFileWithDescriptor(descriptor);
    } catch (err) {
      console.error('Failed to open file from native path:', err);
      this._errorMessage = `Failed to open file: ${filePath}`;
      this.notify();
    }
  }

  /**
   * Initiates UC4: Delete project with confirmation dialog
   */
  public executeRequestDeleteProject(projectId: string, projectName: string): void {
    if (!this.canDeleteProject(projectId)) {
      return;
    }

    this._errorMessage = null;
    this._activeDeleteDialog = new DeleteConfirmDialogViewModel(
      projectId,
      projectName,
      this._projectService,
      async (result: 'deleted' | 'cancelled') => {
        this._activeDeleteDialog = null;
        if (result === 'deleted') {
          await this.refreshRecentProjects();
        }
        this.notify();
      },
      () => this.notify()
    );
    this.notify();
  }

  /**
   * UC2: Open Existing Project Modal
   */
  public executeOpenProject(): void {
    if (!this.canOpenProject) return;

    this._errorMessage = null;
    this._sessionState = SessionState.OpeningPicker;

    this._activeOpenDialog = new OpenProjectDialogViewModel(
      this._projectService,
      async (result: Project | null) => {
        this._activeOpenDialog = null;
        if (result) {
          // UC2-S1: Loaded project confirmed
          this._currentProject = ProjectViewModel.from(result, this._projectService);
          this._sessionState = SessionState.ProjectOpen;
          await this.refreshRecentProjects();
        } else {
          // UC2-S3: Cancelled
          this._sessionState = SessionState.Idle;
        }
        this.notify();
      },
      () => this.notify(),
      this._filePickerService
    );

    this.notify();
  }

  /**
   * UC3: Close Active Project
   */
  public async executeCloseProject(): Promise<void> {
    if (!this.canCloseProject || !this._currentProject) return;

    const projectId = this._currentProject.id;

    this._errorMessage = null;
    this._sessionState = SessionState.Closing;
    this.notify();

    try {
      await this._projectService.close(projectId);

      // UC3-S1: Project closed cleanly
      this._currentProject = null;
      this._sessionState = SessionState.Idle;
      await this.refreshRecentProjects();
    } catch (err) {
      // UC3-S2: Save failed during close
      const errorMsg =
        err instanceof StoreWriteError
          ? err.message
          : 'Failed to write project state to disk. Changes may be lost.';

      this._activeCloseFailureDialog = new CloseFailureDialogViewModel(
        projectId,
        errorMsg,
        this._projectService,
        async (result: CloseFailureResult) => {
          this._activeCloseFailureDialog = null;
          if (result === 'closed') {
            this._currentProject = null;
            this._sessionState = SessionState.Idle;
            await this.refreshRecentProjects();
          } else {
            this._sessionState = SessionState.ProjectOpen;
          }
          this.notify();
        },
        () => this.notify()
      );

      this._sessionState = SessionState.ProjectOpen;
      this.notify();
    }
  }

  /**
   * Triggers download of the .pipeforge project package to user's physical filesystem
   */
  public async executeExportProject(projectId: string): Promise<void> {
    try {
      const { filename, blob } = await this._projectService.exportProjectFile(projectId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      this._errorMessage = err instanceof Error ? err.message : 'Failed to export project file.';
      this.notify();
    }
  }
}
