/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataFrame } from 'danfojs';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ColumnDef } from '../domain/ColumnDef.ts';
import { EmptyDataError, ParseError, UnsupportedFileTypeError } from '../domain/errors.ts';
import { Project } from '../domain/Project.ts';
import { Table } from '../domain/Table.ts';
import { InferredType, SourceType } from '../domain/types.ts';
import { FileDescriptor } from './IFilePickerService.ts';

export class FileImportService {
  public async parse(file: FileDescriptor): Promise<Project> {
    const extMatch = file.name.match(/\.([0-9a-z]+)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';

    if (ext !== 'xlsx' && ext !== 'csv') {
      throw new UnsupportedFileTypeError(
        `Unsupported file type ".${ext || 'unknown'}". Only .xlsx and .csv files are supported.`
      );
    }

    if (!file.buffer || file.buffer.byteLength === 0) {
      throw new EmptyDataError(`File "${file.name}" contains no data rows (empty file).`);
    }

    const projectId = crypto.randomUUID();
    const projectName = file.name;
    const sourceType: SourceType = ext as SourceType;

    if (sourceType === 'xlsx') {
      return this.parseXlsx(file, projectId, projectName);
    } else {
      return this.parseCsv(file, projectId, projectName);
    }
  }

  private parseXlsx(file: FileDescriptor, projectId: string, projectName: string): Project {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(new Uint8Array(file.buffer!), {
        type: 'array',
        cellDates: true,
      });
    } catch (err) {
      throw new ParseError(
        `Failed to parse Excel workbook: ${err instanceof Error ? err.message : 'Corrupt file structure'}`,
        err
      );
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new EmptyDataError(`Excel file "${file.name}" contains no sheets.`);
    }

    const tables: Table[] = [];

    for (let index = 0; index < workbook.SheetNames.length; index++) {
      const sheetName = workbook.SheetNames[index];
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        throw new EmptyDataError(`Sheet "${sheetName}" has no data rows.`);
      }

      let rows: Record<string, unknown>[];
      try {
        rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: null,
          raw: false,
        });
      } catch (err) {
        throw new ParseError(`Failed to parse sheet "${sheetName}": ${err instanceof Error ? err.message : String(err)}`);
      }

      if (!rows || rows.length === 0) {
        throw new EmptyDataError(`Sheet "${sheetName}" has no data rows.`);
      }

      // Check columns
      const firstRow = rows[0];
      const colNames = Object.keys(firstRow);
      if (colNames.length === 0) {
        throw new EmptyDataError(`Sheet "${sheetName}" has no data columns.`);
      }

      const sampleRows = rows.slice(0, 500);
      const columns: ColumnDef[] = colNames.map((colName, colIdx) => {
        const inferred = this.inferColumnType(sampleRows.map((r) => r[colName]));
        return new ColumnDef(colName, colIdx, inferred);
      });

      const df = new DataFrame(rows);

      const table = new Table({
        id: crypto.randomUUID(),
        projectId,
        name: sheetName,
        sheetIndex: index,
        columns,
        dataFrame: df,
      });

      tables.push(table);
    }

    return new Project({
      id: projectId,
      name: projectName,
      sourceType: 'xlsx',
      sourceFilePath: file.path,
      tables,
    });
  }

  private parseCsv(file: FileDescriptor, projectId: string, projectName: string): Project {
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const csvText = textDecoder.decode(file.buffer!);

    if (!csvText.trim()) {
      throw new EmptyDataError(`CSV file "${file.name}" contains no data.`);
    }

    const parsed = Papa.parse<Record<string, unknown>>(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
    });

    if (parsed.errors && parsed.errors.length > 0) {
      // Filter critical errors vs minor warnings
      const fatalErrors = parsed.errors.filter((e) => e.type === 'FieldMismatch' || e.type === 'Quotes');
      if (fatalErrors.length > 0 && parsed.data.length === 0) {
        throw new ParseError(`Malformed CSV data in "${file.name}": ${fatalErrors[0].message}`);
      }
    }

    const rows = parsed.data;
    if (!rows || rows.length === 0) {
      throw new EmptyDataError(`File "${file.name}" contains no data rows.`);
    }

    const firstRow = rows[0];
    const colNames = Object.keys(firstRow);
    if (colNames.length === 0) {
      throw new EmptyDataError(`File "${file.name}" contains no columns.`);
    }

    const sampleRows = rows.slice(0, 500);
    const columns: ColumnDef[] = colNames.map((colName, colIdx) => {
      const inferred = this.inferColumnType(sampleRows.map((r) => r[colName]));
      return new ColumnDef(colName, colIdx, inferred);
    });

    const df = new DataFrame(rows);

    const baseName = projectName.replace(/\.[^/.]+$/, '');
    const table = new Table({
      id: crypto.randomUUID(),
      projectId,
      name: baseName || 'Sheet1',
      sheetIndex: null, // CSV has no sheet index
      columns,
      dataFrame: df,
    });

    return new Project({
      id: projectId,
      name: projectName,
      sourceType: 'csv',
      sourceFilePath: file.path,
      tables: [table],
    });
  }

  private inferColumnType(values: unknown[]): InferredType {
    let numCount = 0;
    let boolCount = 0;
    let dateCount = 0;
    let totalNonEmpty = 0;

    for (const v of values) {
      if (v === null || v === undefined || v === '') continue;
      totalNonEmpty++;

      if (typeof v === 'number') {
        numCount++;
      } else if (typeof v === 'boolean') {
        boolCount++;
      } else if (typeof v === 'string') {
        const trimmed = v.trim();
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
          numCount++;
        } else if (/^(true|false)$/i.test(trimmed)) {
          boolCount++;
        } else if (!isNaN(Date.parse(trimmed)) && trimmed.length >= 8 && /\d/.test(trimmed)) {
          dateCount++;
        }
      }
    }

    if (totalNonEmpty === 0) return 'string';
    if (numCount / totalNonEmpty > 0.8) return 'number';
    if (boolCount / totalNonEmpty > 0.8) return 'boolean';
    if (dateCount / totalNonEmpty > 0.8) return 'date';
    return 'string';
  }
}
