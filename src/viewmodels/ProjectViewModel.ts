/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project } from '../domain/Project.ts';
import { SourceType } from '../domain/types.ts';
import { IProjectService } from '../services/IProjectService.ts';
import { TableViewModel } from './TableViewModel.ts';
import { TableSummaryVM } from './types.ts';

export class ProjectViewModel {
  public readonly id: string;
  public readonly name: string;
  public readonly sourceType: SourceType;
  public readonly sourceFilePath: string;
  public readonly tables: TableSummaryVM[];

  public selectedTableId: string | null = null;
  public activeTable: TableViewModel | null = null;

  private readonly _tableVMCache = new Map<string, TableViewModel>();
  private readonly _listeners = new Set<() => void>();
  private _projectService?: IProjectService;

  constructor(params: {
    id: string;
    name: string;
    sourceType: SourceType;
    sourceFilePath: string;
    tables: TableSummaryVM[];
    projectService?: IProjectService;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.sourceType = params.sourceType;
    this.sourceFilePath = params.sourceFilePath;
    this.tables = params.tables;
    this._projectService = params.projectService;

    // Auto-select first table if available
    if (this.tables.length > 0) {
      this.selectedTableId = this.tables[0].id;
    }
  }

  public subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private notify(): void {
    this._listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Error in ProjectViewModel listener:', e);
      }
    });
  }

  public setProjectService(service: IProjectService): void {
    this._projectService = service;
  }

  /**
   * UC5: Select Table Tab command
   */
  public async selectTable(tableId: string, projectServiceOverride?: IProjectService): Promise<void> {
    const service = projectServiceOverride ?? this._projectService;
    this.selectedTableId = tableId;

    const summary = this.tables.find((t) => t.id === tableId);
    if (!summary || !service) {
      this.notify();
      return;
    }

    let tableVM = this._tableVMCache.get(tableId);
    if (!tableVM) {
      tableVM = new TableViewModel({
        tableId,
        name: summary.name,
        projectId: this.id,
        projectService: service,
        pageSize: 50,
        initialRowCount: summary.rowCount,
      });
      this._tableVMCache.set(tableId, tableVM);
    }

    this.activeTable = tableVM;
    this.notify();

    // Trigger initial page load for the selected tab
    await tableVM.loadPage(tableVM.pageIndex);
    this.notify();
  }

  public static from(project: Project, projectService?: IProjectService): ProjectViewModel {
    const tableSummaries: TableSummaryVM[] = project.tables.map((t) => ({
      id: t.id,
      name: t.name,
      sheetIndex: t.sheetIndex,
      rowCount: t.rowCount,
      columnCount: t.columns.length,
      columnNames: t.columns.map((c) => c.name),
    }));

    const vm = new ProjectViewModel({
      id: project.id,
      name: project.name,
      sourceType: project.sourceType,
      sourceFilePath: project.sourceFilePath,
      tables: tableSummaries,
      projectService,
    });

    if (tableSummaries.length > 0 && projectService) {
      vm.selectTable(tableSummaries[0].id, projectService);
    }

    return vm;
  }
}
