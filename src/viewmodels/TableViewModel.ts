/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InferredDataType } from '../domain/types.ts';
import { IProjectService } from '../services/IProjectService.ts';
import { ColumnHeaderVM } from './ColumnHeaderVM.ts';
import { RowVM } from './RowVM.ts';

export class TableViewModel {
  public readonly tableId: string;
  public readonly name: string;
  public readonly projectId: string;

  public columns: ColumnHeaderVM[] = [];
  public rows: RowVM[] = [];
  public pageIndex = 0; // 0-based index
  public pageSize = 50;
  public totalRowCount = 0;
  public isLoading = false;
  public errorMessage: string | null = null;

  // Selection state (UC7)
  public selectedRowIndex: number | null = null; // 0-based offset within current rows slice
  public selectedColumnName: string | null = null;

  private readonly _projectService: IProjectService;
  private readonly _listeners = new Set<() => void>();
  private _activeRequestId = 0;
  private _previousPageIndex = 0;

  constructor(params: {
    tableId: string;
    name: string;
    projectId: string;
    projectService: IProjectService;
    pageSize?: number;
    initialColumns?: ColumnHeaderVM[];
    initialRowCount?: number;
  }) {
    this.tableId = params.tableId;
    this.name = params.name;
    this.projectId = params.projectId;
    this._projectService = params.projectService;
    this.pageSize = params.pageSize ?? 50;

    if (params.initialColumns) {
      this.columns = params.initialColumns;
    }
    if (params.initialRowCount !== undefined) {
      this.totalRowCount = params.initialRowCount;
    }
  }

  // --- Observability Binding ---
  public subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private notify(): void {
    this._listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Error in TableViewModel listener:', e);
      }
    });
  }

  // --- Computed Properties ---
  public get displayPageNumber(): number {
    return this.pageIndex + 1;
  }

  public get totalPages(): number {
    if (this.totalRowCount <= 0) return 1;
    return Math.max(1, Math.ceil(this.totalRowCount / this.pageSize));
  }

  public get pageRangeText(): string {
    if (this.totalRowCount <= 0 || this.rows.length === 0) {
      return 'Rows 0 - 0 of 0';
    }
    const start = this.pageIndex * this.pageSize + 1;
    const end = Math.min(start + this.rows.length - 1, this.totalRowCount);
    return `Rows ${start.toLocaleString()} - ${end.toLocaleString()} of ${this.totalRowCount.toLocaleString()}`;
  }

  public get selectedCellValue(): unknown {
    if (
      this.selectedRowIndex === null ||
      this.selectedColumnName === null ||
      this.selectedRowIndex < 0 ||
      this.selectedRowIndex >= this.rows.length
    ) {
      return null;
    }
    return this.rows[this.selectedRowIndex].getValue(this.selectedColumnName);
  }

  public get selectedCellType(): InferredDataType | null {
    if (!this.selectedColumnName) return null;
    const col = this.columns.find((c) => c.name === this.selectedColumnName);
    return col ? col.inferredType : null;
  }

  // --- Command Guards ---
  public get canExecuteNextPage(): boolean {
    return (
      !this.isLoading &&
      (this.pageIndex + 1) * this.pageSize < this.totalRowCount
    );
  }

  public get canExecutePrevPage(): boolean {
    return !this.isLoading && this.pageIndex > 0;
  }

  public get canExecuteReload(): boolean {
    return !this.isLoading;
  }

  // --- Navigation & Data Loading (UC5, UC6) ---
  public async loadPage(targetPageIndex: number): Promise<void> {
    const requestId = ++this._activeRequestId;
    this._previousPageIndex = this.pageIndex;
    this.pageIndex = targetPageIndex;
    this.isLoading = true;
    this.errorMessage = null;
    this.notify();

    try {
      const pageData = await this._projectService.getTablePage(
        this.projectId,
        this.tableId,
        targetPageIndex,
        this.pageSize
      );

      // Check for rapid tab-switch cancellation / token invalidation (UC5-S2)
      if (requestId !== this._activeRequestId) {
        return;
      }

      this.columns = pageData.columns.map((c) => new ColumnHeaderVM(c));
      this.totalRowCount = pageData.totalRowCount;
      this.rows = pageData.rows.map(
        (rowCells, index) =>
          new RowVM(pageData.startRowIndex + index, rowCells)
      );

      // Reset or adjust selection when switching pages
      if (
        this.selectedRowIndex !== null &&
        this.selectedRowIndex >= this.rows.length
      ) {
        this.selectedRowIndex = this.rows.length > 0 ? this.rows.length - 1 : null;
      }

      this.isLoading = false;
      this.notify();
    } catch (err) {
      if (requestId !== this._activeRequestId) {
        return;
      }

      // Rollback invariant UC6-S4: Revert pageIndex to previousPageIndex before setting errorMessage
      this.pageIndex = this._previousPageIndex;
      this.isLoading = false;
      this.errorMessage =
        err instanceof Error ? err.message : 'Failed to read table page chunk from storage.';
      this.notify();
    }
  }

  public async nextPage(): Promise<void> {
    if (!this.canExecuteNextPage) return;
    await this.loadPage(this.pageIndex + 1);
  }

  public async prevPage(): Promise<void> {
    if (!this.canExecutePrevPage) return;
    await this.loadPage(this.pageIndex - 1);
  }

  public async reloadPage(): Promise<void> {
    if (!this.canExecuteReload) return;
    await this.loadPage(this.pageIndex);
  }

  // --- Non-Mutating Selection (UC7) ---
  public setSelectedCell(rowIndex: number | null, columnName: string | null): void {
    if (rowIndex === null || columnName === null) {
      this.selectedRowIndex = null;
      this.selectedColumnName = null;
    } else {
      this.selectedRowIndex = Math.max(0, Math.min(rowIndex, this.rows.length - 1));
      this.selectedColumnName = columnName;
    }
    this.notify();
  }

  /**
   * UC7-S2: Arrow key navigation clamped strictly within current page slice.
   * Does NOT auto-page past boundary.
   */
  public moveSelection(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (this.rows.length === 0 || this.columns.length === 0) return;

    if (this.selectedRowIndex === null || this.selectedColumnName === null) {
      this.setSelectedCell(0, this.columns[0].name);
      return;
    }

    const currentColIndex = this.columns.findIndex(
      (c) => c.name === this.selectedColumnName
    );
    const validColIndex = currentColIndex >= 0 ? currentColIndex : 0;

    let newRowIndex = this.selectedRowIndex;
    let newColIndex = validColIndex;

    switch (direction) {
      case 'up':
        newRowIndex = Math.max(0, this.selectedRowIndex - 1);
        break;
      case 'down':
        newRowIndex = Math.min(this.rows.length - 1, this.selectedRowIndex + 1);
        break;
      case 'left':
        newColIndex = Math.max(0, validColIndex - 1);
        break;
      case 'right':
        newColIndex = Math.min(this.columns.length - 1, validColIndex + 1);
        break;
    }

    this.selectedRowIndex = newRowIndex;
    this.selectedColumnName = this.columns[newColIndex].name;
    this.notify();
  }
}
