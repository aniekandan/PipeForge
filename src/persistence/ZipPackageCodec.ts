/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { ColumnDef } from '../domain/ColumnDef.ts';
import { StoreReadError, TableNotFoundError } from '../domain/errors.ts';
import { TablePage } from '../domain/TablePage.ts';
import { ProjectRecordDTO, TableRecordDTO } from '../dto/ProjectRecordDTO.ts';

export class ZipPackageCodec {
  /**
   * Encodes a ProjectRecordDTO into a compressed zip binary (Uint8Array).
   */
  public static async encodeToZip(record: ProjectRecordDTO): Promise<Uint8Array> {
    const zip = new JSZip();

    // 1. project.json manifest
    const projectManifest = {
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
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

    return await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  }

  /**
   * Decodes a zip binary (Uint8Array, ArrayBuffer, or base64 string) into a ProjectRecordDTO.
   */
  public static async decodeFromZip(data: Uint8Array | ArrayBuffer | string): Promise<ProjectRecordDTO> {
    let zip: JSZip;
    try {
      if (typeof data === 'string') {
        zip = await JSZip.loadAsync(data, { base64: true });
      } else {
        zip = await JSZip.loadAsync(data);
      }
    } catch (err) {
      throw new StoreReadError('Failed to load project zip archive', err);
    }

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

      let tableData: Record<string, unknown>[] = [];
      if (dataFile) {
        const dataStr = await dataFile.async('string');
        tableData = JSON.parse(dataStr);
      }

      tables.push({
        id: meta.id,
        projectId: meta.projectId,
        name: meta.name,
        sheetIndex: meta.sheetIndex,
        rowCount: meta.rowCount,
        columns: meta.columns || [],
        data: tableData,
        createdAt: meta.createdAt || new Date().toISOString(),
      });
    }

    return {
      id: manifest.id,
      name: manifest.name,
      createdAt: manifest.createdAt,
      updatedAt: manifest.updatedAt,
      sourceType: manifest.sourceType,
      sourceFilePath: manifest.sourceFilePath,
      status: manifest.status,
      tables,
    };
  }

  /**
   * Reads a single paged chunk of table rows directly from the zip package.
   */
  public static async readTablePageFromZip(
    data: Uint8Array | ArrayBuffer | string,
    tableId: string,
    pageIndex: number,
    pageSize: number
  ): Promise<TablePage> {
    let zip: JSZip;
    try {
      if (typeof data === 'string') {
        zip = await JSZip.loadAsync(data, { base64: true });
      } else {
        zip = await JSZip.loadAsync(data);
      }
    } catch (err) {
      throw new StoreReadError('Failed to read project archive', err);
    }

    const metaFile = zip.file(`tables/${tableId}/metadata.json`);
    if (!metaFile) {
      throw new TableNotFoundError(`Table with ID "${tableId}" not found in project package.`);
    }

    const metaStr = await metaFile.async('string');
    const meta = JSON.parse(metaStr);

    const columns: ColumnDef[] = (meta.columns || []).map(
      (c: { name: string; index: number; inferredType: any }) =>
        new ColumnDef(c.name, c.index, c.inferredType)
    );

    const dataFile = zip.file(`tables/${tableId}/data.json`);
    let allRows: Record<string, unknown>[] = [];
    if (dataFile) {
      const dataStr = await dataFile.async('string');
      allRows = JSON.parse(dataStr);
    }

    const totalRowCount = allRows.length || meta.rowCount || 0;
    const startRowIndex = pageIndex * pageSize;
    const pagedRows = allRows.slice(startRowIndex, startRowIndex + pageSize);

    return {
      tableId,
      pageIndex,
      pageSize,
      totalRowCount,
      startRowIndex,
      columns,
      rows: pagedRows,
    };
  }
}
