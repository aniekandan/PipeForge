/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TablePage } from '../domain/TablePage.ts';
import { ProjectRecordDTO, ProjectSummaryDTO } from '../dto/ProjectRecordDTO.ts';

export interface IProjectStore {
  /**
   * Saves a project record packaged as a zip container to persistent storage.
   * Throws StoreWriteError or DuplicateProjectNameError.
   */
  save(record: ProjectRecordDTO): Promise<void>;

  /**
   * Loads a full project record by reading and unpacking the zip archive.
   * Throws StoreReadError or ProjectNotFoundError.
   */
  loadRecord(id: string): Promise<ProjectRecordDTO>;

  /**
   * Reads a single paged chunk of table rows directly from storage.
   * Throws StoreReadError or TableNotFoundError or ProjectNotFoundError.
   */
  readTablePage(
    projectId: string,
    tableId: string,
    pageIndex: number,
    pageSize: number
  ): Promise<TablePage>;

  /**
   * Lists lightweight summaries of all saved projects from the metadata store.
   * Throws StoreReadError.
   */
  listProjects(): Promise<ProjectSummaryDTO[]>;

  /**
   * Checks whether a project with the given name already exists.
   */
  existsByName(name: string, excludeId?: string): Promise<boolean>;

  /**
   * Deletes a project by id from both packages and summary registry.
   */
  deleteProject(id: string): Promise<void>;
}
