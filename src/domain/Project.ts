/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Table } from './Table.ts';
import { ProjectStatus, SourceType } from './types.ts';

export class Project {
  public readonly id: string;
  public readonly name: string;
  public readonly createdAt: Date;
  public updatedAt: Date;
  public readonly sourceType: SourceType;
  public readonly sourceFilePath: string;
  public status: ProjectStatus;
  private readonly _tables: Map<string, Table> = new Map();

  constructor(params: {
    id: string;
    name: string;
    sourceType: SourceType;
    sourceFilePath: string;
    status?: ProjectStatus;
    createdAt?: Date;
    updatedAt?: Date;
    tables?: Table[];
  }) {
    this.id = params.id;
    this.name = params.name;
    this.sourceType = params.sourceType;
    this.sourceFilePath = params.sourceFilePath;
    this.status = params.status ?? 'open';
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();

    if (params.tables) {
      for (const table of params.tables) {
        this.addTable(table);
      }
    }
  }

  public get tables(): Table[] {
    return Array.from(this._tables.values());
  }

  public addTable(table: Table): void {
    this._tables.set(table.id, table);
    this.updatedAt = new Date();
  }

  public getTable(id: string): Table | undefined {
    return this._tables.get(id);
  }

  public close(): void {
    this.status = 'closed';
    this.updatedAt = new Date();
  }
}
