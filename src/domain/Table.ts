/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataFrame } from 'danfojs';
import { ColumnDef } from './ColumnDef.ts';

export class Table {
  public readonly id: string;
  public readonly projectId: string;
  public readonly name: string;
  public readonly sheetIndex?: number | null;
  public readonly rowCount: number;
  public readonly columns: ColumnDef[];
  public readonly createdAt: Date;
  public readonly dataFrame: DataFrame;

  constructor(params: {
    id: string;
    projectId: string;
    name: string;
    sheetIndex?: number | null;
    columns: ColumnDef[];
    dataFrame: DataFrame;
    createdAt?: Date;
  }) {
    this.id = params.id;
    this.projectId = params.projectId;
    this.name = params.name;
    this.sheetIndex = params.sheetIndex;
    this.columns = params.columns;
    this.dataFrame = params.dataFrame;
    this.rowCount = params.dataFrame.shape[0];
    this.createdAt = params.createdAt ?? new Date();
  }

  /**
   * Serializes the underlying dataframe rows to JSON-compatible objects
   */
  public toRecords(): Record<string, unknown>[] {
    try {
      const json = this.dataFrame.toJSON();
      if (Array.isArray(json)) {
        return json as Record<string, unknown>[];
      }
      return [];
    } catch {
      // Fallback manual row extraction if toJSON behaves differently
      const cols = this.columns.map((c) => c.name);
      const rows: Record<string, unknown>[] = [];
      const values = this.dataFrame.values as unknown[][];
      for (const row of values) {
        const item: Record<string, unknown> = {};
        cols.forEach((col, i) => {
          item[col] = row[i];
        });
        rows.push(item);
      }
      return rows;
    }
  }
}
