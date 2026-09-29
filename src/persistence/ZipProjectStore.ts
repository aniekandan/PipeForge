/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import {
  DuplicateProjectNameError,
  ProjectNotFoundError,
  StoreReadError,
  StoreWriteError,
} from '../domain/errors.ts';
import { TablePage } from '../domain/TablePage.ts';
import { ProjectRecordDTO, ProjectSummaryDTO, TableRecordDTO } from '../dto/ProjectRecordDTO.ts';
import { IProjectStore } from './IProjectStore.ts';
import { ZipPackageCodec } from './ZipPackageCodec.ts';

const STORAGE_INDEX_KEY = 'df_project_store_index_v1';
const STORAGE_DATA_PREFIX = 'df_project_store_pkg_v1_';

export class ZipProjectStore implements IProjectStore {
  // Test hook to simulate disk write failure for UC3-S2
  private _simulateWriteFailure = false;

  public setSimulateWriteFailure(fail: boolean): void {
    this._simulateWriteFailure = fail;
  }

  public get isSimulatingWriteFailure(): boolean {
    return this._simulateWriteFailure;
  }

  public async existsByName(name: string, excludeId?: string): Promise<boolean> {
    try {
      const summaries = await this.listProjects();
      const lower = name.trim().toLowerCase();
      return summaries.some((s) => s.name.trim().toLowerCase() === lower && s.id !== excludeId);
    } catch {
      return false;
    }
  }

  public async listProjects(): Promise<ProjectSummaryDTO[]> {
    try {
      const rawIndex = localStorage.getItem(STORAGE_INDEX_KEY);
      if (!rawIndex) {
        return [];
      }
      const parsed = JSON.parse(rawIndex) as ProjectSummaryDTO[];
      const list = Array.isArray(parsed) ? parsed : [];
      list.sort((a, b) => {
        const timeA = new Date(a.lastOpenedAt || a.updatedAt).getTime();
        const timeB = new Date(b.lastOpenedAt || b.updatedAt).getTime();
        return timeB - timeA;
      });
      return list;
    } catch (err) {
      throw new StoreReadError('Failed to read project index from disk store.', err);
    }
  }

  public async save(record: ProjectRecordDTO): Promise<void> {
    if (this._simulateWriteFailure) {
      throw new StoreWriteError(
        'Simulated disk error: Unable to write to project store (Disk full or write permission denied).'
      );
    }

    try {
      // Check duplicate name
      const duplicate = await this.existsByName(record.name, record.id);
      if (duplicate) {
        throw new DuplicateProjectNameError(`A project named "${record.name}" already exists.`);
      }

      // Build Zip archive
      const zip = new JSZip();

      // 1. project.json manifest
      const projectManifest = {
        id: record.id,
        name: record.name,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        lastOpenedAt: record.lastOpenedAt || new Date().toISOString(),
        sourceType: record.sourceType,
        sourceFilePath: record.sourceFilePath,
        status: record.status,
        tablesManifest: record.tables.map((t) => ({
          id: t.id,
          name: t.name,
          sheetIndex: t.sheetIndex,
          rowCount: t.rowCount,
        })),
      };
      zip.file('project.json', JSON.stringify(projectManifest, null, 2));

      // 2. tables folder
      const tablesFolder = zip.folder('tables');
      if (tablesFolder) {
        for (const table of record.tables) {
          const tableFolder = tablesFolder.folder(table.id);
          if (tableFolder) {
            const tableMeta = {
              id: table.id,
              projectId: table.projectId,
              name: table.name,
              sheetIndex: table.sheetIndex,
              rowCount: table.rowCount,
              columns: table.columns,
              createdAt: table.createdAt,
            };
            tableFolder.file('metadata.json', JSON.stringify(tableMeta, null, 2));
            tableFolder.file('data.json', JSON.stringify(table.data ?? []));
          }
        }
      }

      // Generate zip as base64 string
      const base64Pkg = await zip.generateAsync({
        type: 'base64',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      // Write zip data package
      localStorage.setItem(`${STORAGE_DATA_PREFIX}${record.id}`, base64Pkg);

      // Update index
      const summaries = await this.listProjects();
      const existingIdx = summaries.findIndex((s) => s.id === record.id);
      const totalRows = record.tables.reduce((acc, t) => acc + (t.rowCount || 0), 0);

      const summaryItem: ProjectSummaryDTO = {
        id: record.id,
        name: record.name,
        sourceType: record.sourceType,
        sourceFilePath: record.sourceFilePath,
        tableCount: record.tables.length,
        rowCount: totalRows,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        lastOpenedAt: record.lastOpenedAt || new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        summaries[existingIdx] = summaryItem;
      } else {
        summaries.push(summaryItem);
      }

      // Sort by lastOpenedAt descending
      summaries.sort((a, b) => {
        const timeA = new Date(a.lastOpenedAt || a.updatedAt).getTime();
        const timeB = new Date(b.lastOpenedAt || b.updatedAt).getTime();
        return timeB - timeA;
      });
      localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(summaries));
    } catch (err) {
      if (err instanceof DuplicateProjectNameError || err instanceof StoreWriteError) {
        throw err;
      }
      throw new StoreWriteError(
        `Failed to persist project "${record.name}" to store: ${err instanceof Error ? err.message : String(err)}`,
        err
      );
    }
  }

  public async loadRecord(id: string): Promise<ProjectRecordDTO> {
    let base64Pkg: string | null = null;
    try {
      base64Pkg = localStorage.getItem(`${STORAGE_DATA_PREFIX}${id}`);
    } catch (err) {
      throw new StoreReadError(`Failed to access storage for project ID ${id}`, err);
    }

    if (!base64Pkg) {
      throw new ProjectNotFoundError(`Project with ID ${id} was not found in storage.`);
    }

    try {
      const zip = await JSZip.loadAsync(base64Pkg, { base64: true });

      // Read project.json
      const projectFile = zip.file('project.json');
      if (!projectFile) {
        throw new StoreReadError('Invalid project archive: missing project.json manifest.');
      }
      const projectManifestStr = await projectFile.async('string');
      const manifest = JSON.parse(projectManifestStr);

      const tables: TableRecordDTO[] = [];
      const tablesManifest = manifest.tablesManifest || [];

      for (const tManifest of tablesManifest) {
        const tableId = tManifest.id;
        const metaFile = zip.file(`tables/${tableId}/metadata.json`);
        const dataFile = zip.file(`tables/${tableId}/data.json`);

        if (!metaFile) {
          throw new StoreReadError(`Corrupt project package: metadata missing for table ${tableId}`);
        }

        const metaStr = await metaFile.async('string');
        const meta = JSON.parse(metaStr);

        let data: Record<string, unknown>[] = [];
        if (dataFile) {
          const dataStr = await dataFile.async('string');
          data = JSON.parse(dataStr);
        }

        tables.push({
          id: meta.id,
          projectId: meta.projectId,
          name: meta.name,
          sheetIndex: meta.sheetIndex,
          rowCount: meta.rowCount,
          columns: meta.columns || [],
          data,
          createdAt: meta.createdAt || new Date().toISOString(),
        });
      }

      // Update lastOpenedAt in index
      try {
        const rawIndex = localStorage.getItem(STORAGE_INDEX_KEY);
        if (rawIndex) {
          const summaries = JSON.parse(rawIndex) as ProjectSummaryDTO[];
          const item = summaries.find((s) => s.id === id);
          if (item) {
            item.lastOpenedAt = new Date().toISOString();
            localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(summaries));
          }
        }
      } catch {
        // Non-blocking
      }

      return {
        id: manifest.id,
        name: manifest.name,
        createdAt: manifest.createdAt,
        updatedAt: manifest.updatedAt,
        lastOpenedAt: manifest.lastOpenedAt,
        sourceType: manifest.sourceType,
        sourceFilePath: manifest.sourceFilePath,
        status: manifest.status,
        tables,
      };
    } catch (err) {
      if (err instanceof StoreReadError || err instanceof ProjectNotFoundError) {
        throw err;
      }
      throw new StoreReadError(`Corrupt or unreadable project archive for ID ${id}`, err);
    }
  }

  public async readTablePage(
    projectId: string,
    tableId: string,
    pageIndex: number,
    pageSize: number
  ): Promise<TablePage> {
    let base64Pkg: string | null = null;
    try {
      base64Pkg = localStorage.getItem(`${STORAGE_DATA_PREFIX}${projectId}`);
    } catch (err) {
      throw new StoreReadError(`Failed to access storage for project ID ${projectId}`, err);
    }

    if (!base64Pkg) {
      throw new ProjectNotFoundError(`Project with ID ${projectId} was not found in storage.`);
    }

    return await ZipPackageCodec.readTablePageFromZip(base64Pkg, tableId, pageIndex, pageSize);
  }

  public async deleteProject(id: string): Promise<void> {
    try {
      localStorage.removeItem(`${STORAGE_DATA_PREFIX}${id}`);
      const rawIndex = localStorage.getItem(STORAGE_INDEX_KEY);
      if (rawIndex) {
        const summaries = JSON.parse(rawIndex) as ProjectSummaryDTO[];
        const filtered = summaries.filter((s) => s.id !== id);
        localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(filtered));
      }
    } catch (err) {
      throw new StoreWriteError('Failed to delete project from storage.', err);
    }
  }
}
