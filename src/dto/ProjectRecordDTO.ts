/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ColumnRecordDTO {
  name: string;
  index: number;
  inferredType: string;
}

export interface TableRecordDTO {
  id: string;
  projectId: string;
  name: string;
  sheetIndex?: number | null;
  rowCount: number;
  columns: ColumnRecordDTO[];
  data: Record<string, unknown>[];
  createdAt: string;
}

export interface ProjectRecordDTO {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  sourceType: 'xlsx' | 'csv';
  sourceFilePath: string;
  status: 'open' | 'closed';
  tables: TableRecordDTO[];
}

export interface ProjectSummaryDTO {
  id: string;
  name: string;
  sourceType: 'xlsx' | 'csv';
  sourceFilePath: string;
  tableCount: number;
  rowCount: number;
  createdAt?: string;
  updatedAt: string;
  lastOpenedAt?: string;
}
