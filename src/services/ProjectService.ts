/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DuplicateProjectNameError,
  ProjectNotFoundError,
  TableNotFoundError,
} from '../domain/errors.ts';
import { Project } from '../domain/Project.ts';
import { TablePage } from '../domain/TablePage.ts';
import { ProjectMapper } from '../dto/ProjectMapper.ts';
import { IProjectStore } from '../persistence/IProjectStore.ts';
import { ProjectSummaryVM } from '../viewmodels/types.ts';
import { FileImportService } from './FileImportService.ts';
import { FileDescriptor } from './IFilePickerService.ts';
import { ImportOptions, IProjectService } from './IProjectService.ts';

export class ProjectService implements IProjectService {
  private _activeProject: Project | null = null;
  private readonly _fileImportService: FileImportService;
  private readonly _store: IProjectStore;

  constructor(store: IProjectStore, fileImportService?: FileImportService) {
    this._store = store;
    this._fileImportService = fileImportService ?? new FileImportService();
  }

  public get activeProject(): Project | null {
    return this._activeProject;
  }

  public async parseFile(file: FileDescriptor): Promise<Project> {
    return await this._fileImportService.parse(file);
  }

  public async checkNameExists(name: string): Promise<boolean> {
    return await this._store.existsByName(name);
  }

  public async saveProject(project: Project): Promise<void> {
    const duplicate = await this._store.existsByName(project.name, project.id);
    if (duplicate) {
      throw new DuplicateProjectNameError(`A project named "${project.name}" already exists.`);
    }

    const recordDTO = ProjectMapper.toDTO(project);
    recordDTO.lastOpenedAt = new Date().toISOString();
    await this._store.save(recordDTO);
    this._activeProject = project;
  }

  public async importFromFile(file: FileDescriptor, options?: ImportOptions): Promise<Project> {
    const targetName = options?.customName?.trim() || file.name;
    const nameExists = await this._store.existsByName(targetName);
    if (nameExists) {
      throw new DuplicateProjectNameError(
        `A project named "${targetName}" already exists in the store. Please rename or delete the existing project.`
      );
    }

    // Parse file into domain entity
    const project = await this._fileImportService.parse(file);

    const finalProject =
      options?.customName || options?.customSaveLocation
        ? new Project({
            id: project.id,
            name: targetName,
            sourceType: project.sourceType,
            sourceFilePath: options?.customSaveLocation?.trim() || file.path,
            tables: project.tables,
          })
        : project;

    // Convert to DTO and persist
    const recordDTO = ProjectMapper.toDTO(finalProject);
    recordDTO.lastOpenedAt = new Date().toISOString();
    await this._store.save(recordDTO);

    this._activeProject = finalProject;
    return finalProject;
  }

  public async load(id: string): Promise<Project> {
    const recordDTO = await this._store.loadRecord(id);
    if (!recordDTO) {
      throw new ProjectNotFoundError(`Project with ID "${id}" was not found.`);
    }

    const project = ProjectMapper.toDomain(recordDTO);
    project.status = 'open';
    this._activeProject = project;
    return project;
  }

  public async close(id: string): Promise<void> {
    if (this._activeProject && this._activeProject.id === id) {
      this._activeProject.close();
      const recordDTO = ProjectMapper.toDTO(this._activeProject);
      await this._store.save(recordDTO);
      this._activeProject = null;
    } else {
      this._activeProject = null;
    }
  }

  public forceClose(_id: string): void {
    this._activeProject = null;
  }

  public async getTablePage(
    projectId: string,
    tableId: string,
    pageIndex: number,
    pageSize: number
  ): Promise<TablePage> {
    // If table is actively in-memory in _activeProject, slice directly from domain table
    if (this._activeProject && this._activeProject.id === projectId) {
      const table = this._activeProject.tables.find((t) => t.id === tableId);
      if (!table) {
        throw new TableNotFoundError(`Table with ID "${tableId}" was not found in active project.`);
      }

      const allRecords = table.toRecords();
      const totalRowCount = table.rowCount;
      const startRowIndex = pageIndex * pageSize;
      const rows = allRecords.slice(startRowIndex, startRowIndex + pageSize);

      return {
        tableId,
        pageIndex,
        pageSize,
        totalRowCount,
        startRowIndex,
        columns: table.columns,
        rows,
      };
    }

    // Otherwise, stream paged slice directly from store container
    return await this._store.readTablePage(projectId, tableId, pageIndex, pageSize);
  }

  public async listProjectSummaries(): Promise<ProjectSummaryVM[]> {
    const summaries = await this._store.listProjects();
    return summaries.map((s) => ({
      id: s.id,
      name: s.name,
      sourceType: s.sourceType,
      sourceFilePath: s.sourceFilePath,
      tableCount: s.tableCount,
      rowCount: s.rowCount || 0,
      updatedAt: s.updatedAt,
      lastOpenedAt: s.lastOpenedAt,
      createdAt: s.createdAt,
    }));
  }

  public async deleteProject(id: string): Promise<void> {
    await this._store.deleteProject(id);
    if (this._activeProject && this._activeProject.id === id) {
      this._activeProject = null;
    }
  }

  public async exportProjectFile(id: string): Promise<{ filename: string; blob: Blob }> {
    let recordDTO = await this._store.loadRecord(id);
    if (!recordDTO && this._activeProject && this._activeProject.id === id) {
      recordDTO = ProjectMapper.toDTO(this._activeProject);
    }
    if (!recordDTO) {
      throw new ProjectNotFoundError(`Project with ID "${id}" was not found.`);
    }

    const { ZipPackageCodec } = await import('../persistence/ZipPackageCodec.ts');
    const zipBinary = await ZipPackageCodec.encodeToZip(recordDTO);
    const blob = new Blob([zipBinary.buffer as ArrayBuffer], { type: 'application/zip' });
    const safeName = recordDTO.name.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName || 'project'}.pipeforge`;
    return { filename, blob };
  }
}
