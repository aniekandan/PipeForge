/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DuplicateProjectNameError,
  ProjectNotFoundError,
  StoreReadError,
  StoreWriteError,
  TableNotFoundError,
} from '../domain/errors.ts';
import { TablePage } from '../domain/TablePage.ts';
import { ProjectRecordDTO, ProjectSummaryDTO } from '../dto/ProjectRecordDTO.ts';
import { IProjectStore } from './IProjectStore.ts';
import { ZipPackageCodec } from './ZipPackageCodec.ts';

const DB_NAME = 'pipeforge_indexed_db_v1';
const DB_VERSION = 1;
const SUMMARIES_STORE = 'summaries';
const PACKAGES_STORE = 'packages';

export class IndexedDBProjectStore implements IProjectStore {
  private _simulateWriteFailure = false;
  private _dbPromise: Promise<IDBDatabase> | null = null;

  public setSimulateWriteFailure(fail: boolean): void {
    this._simulateWriteFailure = fail;
  }

  public get isSimulatingWriteFailure(): boolean {
    return this._simulateWriteFailure;
  }

  private getDB(): Promise<IDBDatabase> {
    if (this._dbPromise) {
      return this._dbPromise;
    }

    this._dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new StoreReadError('IndexedDB is not supported in this runtime environment.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(SUMMARIES_STORE)) {
          db.createObjectStore(SUMMARIES_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PACKAGES_STORE)) {
          db.createObjectStore(PACKAGES_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new StoreReadError(`Failed to open IndexedDB: ${request.error?.message}`));
      };
    });

    return this._dbPromise;
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
      const db = await this.getDB();
      return await new Promise<ProjectSummaryDTO[]>((resolve, reject) => {
        const tx = db.transaction(SUMMARIES_STORE, 'readonly');
        const store = tx.objectStore(SUMMARIES_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          const list = (request.result || []) as ProjectSummaryDTO[];
          list.sort((a, b) => {
            const timeA = new Date(a.lastOpenedAt || a.updatedAt).getTime();
            const timeB = new Date(b.lastOpenedAt || b.updatedAt).getTime();
            return timeB - timeA;
          });
          resolve(list);
        };

        request.onerror = () => {
          reject(new StoreReadError(`Failed to read project index from IndexedDB: ${request.error?.message}`));
        };
      });
    } catch (err) {
      if (err instanceof StoreReadError) throw err;
      throw new StoreReadError('Failed to read projects from IndexedDB.', err);
    }
  }

  public async save(record: ProjectRecordDTO): Promise<void> {
    if (this._simulateWriteFailure) {
      throw new StoreWriteError(
        'Simulated disk error: Unable to write to IndexedDB (Disk full or write permission denied).'
      );
    }

    try {
      // Duplicate name check
      const duplicate = await this.existsByName(record.name, record.id);
      if (duplicate) {
        throw new DuplicateProjectNameError(`A project named "${record.name}" already exists.`);
      }

      // Encode to compressed zip binary
      const zipBinary = await ZipPackageCodec.encodeToZip(record);

      const db = await this.getDB();
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

      // If running inside Electron desktop app, write directly to physical disk file
      if (typeof window !== 'undefined' && (window as any).electronAPI?.writeFile) {
        try {
          const safeName = record.name.replace(/[^a-zA-Z0-9_-]/g, '_');
          let targetPath = record.sourceFilePath;
          if (!targetPath || !targetPath.toLowerCase().endsWith('.pipeforge')) {
            const defaultDir = (await (window as any).electronAPI.getDocumentsPath?.()) || 'PipeForge Projects';
            targetPath = `${defaultDir}/${safeName}.pipeforge`;
          }
          await (window as any).electronAPI.writeFile(targetPath, zipBinary);
        } catch (e) {
          console.warn('Could not write physical file via Electron API:', e);
        }
      }

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([SUMMARIES_STORE, PACKAGES_STORE], 'readwrite');

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new StoreWriteError(`IndexedDB transaction failed: ${tx.error?.message}`));
        tx.onabort = () => reject(new StoreWriteError('IndexedDB transaction aborted during save.'));

        const summariesStore = tx.objectStore(SUMMARIES_STORE);
        summariesStore.put(summaryItem);

        const packagesStore = tx.objectStore(PACKAGES_STORE);
        packagesStore.put({
          id: record.id,
          binary: zipBinary,
          updatedAt: record.updatedAt,
        });
      });
    } catch (err) {
      if (err instanceof DuplicateProjectNameError || err instanceof StoreWriteError) {
        throw err;
      }
      throw new StoreWriteError(
        `Failed to persist project "${record.name}" to IndexedDB: ${err instanceof Error ? err.message : String(err)}`,
        err
      );
    }
  }

  public async loadRecord(id: string): Promise<ProjectRecordDTO> {
    try {
      const db = await this.getDB();
      const recordEntry = await new Promise<{ id: string; binary: Uint8Array } | null>((resolve, reject) => {
        const tx = db.transaction(PACKAGES_STORE, 'readonly');
        const store = tx.objectStore(PACKAGES_STORE);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(new StoreReadError(`Failed to load project package: ${request.error?.message}`));
      });

      if (!recordEntry || !recordEntry.binary) {
        throw new ProjectNotFoundError(`Project with ID "${id}" was not found in storage.`);
      }

      const decoded = await ZipPackageCodec.decodeFromZip(recordEntry.binary);

      // Update lastOpenedAt in summary
      try {
        const tx = db.transaction(SUMMARIES_STORE, 'readwrite');
        const store = tx.objectStore(SUMMARIES_STORE);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          if (getReq.result) {
            const summary = getReq.result as ProjectSummaryDTO;
            summary.lastOpenedAt = new Date().toISOString();
            store.put(summary);
          }
        };
      } catch {
        // Non-blocking metadata refresh
      }

      return decoded;
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
    try {
      const db = await this.getDB();
      const recordEntry = await new Promise<{ id: string; binary: Uint8Array } | null>((resolve, reject) => {
        const tx = db.transaction(PACKAGES_STORE, 'readonly');
        const store = tx.objectStore(PACKAGES_STORE);
        const request = store.get(projectId);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(new StoreReadError(`Failed to load project package: ${request.error?.message}`));
      });

      if (!recordEntry || !recordEntry.binary) {
        throw new ProjectNotFoundError(`Project with ID "${projectId}" was not found in storage.`);
      }

      return await ZipPackageCodec.readTablePageFromZip(recordEntry.binary, tableId, pageIndex, pageSize);
    } catch (err) {
      if (
        err instanceof StoreReadError ||
        err instanceof ProjectNotFoundError ||
        err instanceof TableNotFoundError
      ) {
        throw err;
      }
      throw new StoreReadError(`Failed to read table page from project ${projectId}`, err);
    }
  }

  public async deleteProject(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([SUMMARIES_STORE, PACKAGES_STORE], 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new StoreWriteError(`Failed to delete project: ${tx.error?.message}`));
        tx.objectStore(SUMMARIES_STORE).delete(id);
        tx.objectStore(PACKAGES_STORE).delete(id);
      });
    } catch (err) {
      throw new StoreWriteError('Failed to delete project from storage.', err);
    }
  }

  public async clearAll(): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([SUMMARIES_STORE, PACKAGES_STORE], 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(SUMMARIES_STORE).clear();
        tx.objectStore(PACKAGES_STORE).clear();
      });
    } catch (err) {
      console.error('Failed to clear IndexedDB:', err);
    }
  }
}
