/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class RowVM {
  public readonly absoluteRowIndex: number; // 0-based absolute row index
  public readonly cells: Record<string, unknown>;

  constructor(absoluteIndex: number, cells: Record<string, unknown>) {
    this.absoluteRowIndex = absoluteIndex;
    this.cells = cells;
  }

  public getValue(columnName: string): unknown {
    return this.cells[columnName];
  }
}
