/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project } from '../domain/Project.ts';
import { IFilePickerService } from '../services/IFilePickerService.ts';
import { IProjectService } from '../services/IProjectService.ts';
import { ProjectSummaryVM } from './types.ts';

export class OpenProjectDialogViewModel {
  public availableProjects: ProjectSummaryVM[] = [];
  public selectedProject: ProjectSummaryVM | null = null;
  public isLoading = false;
  public errorMessage: string | null = null;
  public searchQuery = '';

  private readonly _projectService: IProjectService;
  private readonly _filePickerService?: IFilePickerService;
  private readonly _onClose: (result: Project | null) => void;
  private readonly _notifyChange: () => void;

  constructor(
    projectService: IProjectService,
    onClose: (result: Project | null) => void,
    notifyChange: () => void,
    filePickerService?: IFilePickerService
  ) {
    this._projectService = projectService;
    this._onClose = onClose;
    this._notifyChange = notifyChange;
    this._filePickerService = filePickerService;

    // Immediately trigger catalog load on instantiation
    this.executeLoad();
  }

  public get filteredProjects(): ProjectSummaryVM[] {
    if (!this.searchQuery.trim()) {
      return this.availableProjects;
    }
    const query = this.searchQuery.toLowerCase();
    return this.availableProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.sourceFilePath && p.sourceFilePath.toLowerCase().includes(query)) ||
        p.sourceType.toLowerCase().includes(query)
    );
  }

  public get canConfirm(): boolean {
    return this.selectedProject !== null && !this.isLoading;
  }

  public get canCancel(): boolean {
    return !this.isLoading;
  }

  public setSearchQuery(query: string): void {
    this.searchQuery = query;
    this._notifyChange();
  }

  public async executeLoad(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;
    this._notifyChange();

    try {
      this.availableProjects = await this._projectService.listProjectSummaries();
      // Auto-select first project if available and none selected yet
      if (this.availableProjects.length > 0 && !this.selectedProject) {
        this.selectedProject = this.availableProjects[0];
      }
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'Failed to load projects list';
    } finally {
      this.isLoading = false;
      this._notifyChange();
    }
  }

  public selectProject(project: ProjectSummaryVM): void {
    this.selectedProject = project;
    this.errorMessage = null;
    this._notifyChange();
  }

  public async executeConfirm(): Promise<void> {
    if (!this.selectedProject || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this._notifyChange();

    try {
      const project = await this._projectService.load(this.selectedProject.id);
      this.isLoading = false;
      this._notifyChange();
      this._onClose(project);
    } catch (err) {
      this.isLoading = false;
      this.errorMessage = err instanceof Error ? err.message : 'Failed to load selected project.';
      this._notifyChange();
    }
  }

  public async browseAndOpenExternalFile(): Promise<void> {
    if (!this._filePickerService || this.isLoading) return;

    try {
      const file = await this._filePickerService.pickFile(['.xlsx', '.csv']);
      if (!file) return;

      this.isLoading = true;
      this.errorMessage = null;
      this._notifyChange();

      const project = await this._projectService.importFromFile(file);
      this.isLoading = false;
      this._notifyChange();
      this._onClose(project);
    } catch (err) {
      this.isLoading = false;
      this.errorMessage = err instanceof Error ? err.message : 'Failed to open external file.';
      this._notifyChange();
    }
  }

  public executeCancel(): void {
    if (this.isLoading) return;
    this._onClose(null);
  }
}
