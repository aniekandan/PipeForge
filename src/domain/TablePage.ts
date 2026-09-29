/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColumnDef } from './ColumnDef.ts';

export interface TablePage {
  readonly tableId: string;
  readonly pageIndex: number; // 0-based page index
  readonly pageSize: number; // Number of rows per page (e.g. 50)
  readonly totalRowCount: number; // Total rows in parent table
  readonly startRowIndex: number; // Absolute row offset: pageIndex * pageSize
  readonly columns: ColumnDef[];
  readonly rows: Record<string, unknown>[];
}
