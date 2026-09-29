/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project } from '../domain/Project.ts';
import { TablePage } from '../domain/TablePage.ts';
import { ProjectSummaryVM } from '../viewmodels/types.ts';
import { FileDescriptor } from './IFilePickerService.ts';

export interface ImportOptions {
  customName?: string;
  customSaveLocation?: string;
}

export interface IProjectService {
  readonly activeProject: Project | null;

  /**
   * Imports an .xlsx or .csv file, validates, saves to store, and sets activeProject.
   * Throws UnsupportedFileTypeError | ParseError | EmptyDataError | DuplicateProjectNameError | StoreWriteError.
   */
  importFromFile(file: FileDescriptor, options?: ImportOptions): Promise<Project>;

  /**
   * Parses a file into a domain Project entity without saving to persistent store yet.
   */
  parseFile(file: FileDescriptor): Promise<Project>;

  /**
   * Persists an existing or customized Project entity to the store and sets it active.
   */
  saveProject(project: Project): Promise<void>;

  /**
   * Checks whether a project name already exists in the store.
   */
  checkNameExists(name: string): Promise<boolean>;

  /**
   * Loads a saved project from persistence store and sets activeProject.
   * Throws ProjectNotFoundError | StoreReadError.
   */
  load(id: string): Promise<Project>;

  /**
   * Closes the active project and updates persistence metadata.
   * Throws StoreWriteError (keeps project active if write fails).
   */
  close(id: string): Promise<void>;

  /**
   * Force closes the active project without writing to storage (memory-only cleanup).
   */
  forceClose(id: string): void;

  /**
   * Reads a paged chunk of table rows and schema metadata for workspace data grid.
   * Throws StoreReadError | TableNotFoundError | ProjectNotFoundError.
   */
  getTablePage(
    projectId: string,
    tableId: string,
    pageIndex: number,
    pageSize: number
  ): Promise<TablePage>;

  /**
   * Lists lightweight summaries of saved projects for picker dialogs & recent projects view.
   * Throws StoreReadError.
   */
  listProjectSummaries(): Promise<ProjectSummaryVM[]>;

  /**
   * Deletes a project from the storage registry.
   */
  deleteProject(id: string): Promise<void>;

  /**
   * Exports the project package as a downloadable .pipeforge binary archive.
   */
  exportProjectFile(id: string): Promise<{ filename: string; blob: Blob }>;
}
