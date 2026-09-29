/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataFrame } from 'danfojs';
import { ColumnDef } from '../domain/ColumnDef.ts';
import { Project } from '../domain/Project.ts';
import { Table } from '../domain/Table.ts';
import { InferredType } from '../domain/types.ts';
import { ProjectRecordDTO, TableRecordDTO } from './ProjectRecordDTO.ts';

export class ProjectMapper {
  /**
   * Converts a domain Project to ProjectRecordDTO for persistence
   */
  public static toDTO(project: Project): ProjectRecordDTO {
    const tableDTOs: TableRecordDTO[] = project.tables.map((table) => ({
      id: table.id,
      projectId: table.projectId,
      name: table.name,
      sheetIndex: table.sheetIndex,
      rowCount: table.rowCount,
      columns: table.columns.map((c) => ({
        name: c.name,
        index: c.index,
        inferredType: c.inferredType,
      })),
      data: table.toRecords(),
      createdAt: table.createdAt.toISOString(),
    }));

    return {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      sourceType: project.sourceType,
      sourceFilePath: project.sourceFilePath,
      status: project.status,
      tables: tableDTOs,
    };
  }

  /**
   * Hydrates a domain Project from a raw ProjectRecordDTO
   */
  public static toDomain(dto: ProjectRecordDTO): Project {
    const tables: Table[] = dto.tables.map((tableDTO) => {
      const columns = tableDTO.columns.map(
        (c) => new ColumnDef(c.name, c.index, c.inferredType as InferredType)
      );

      // Reconstruct Danfo.js DataFrame from serialized records
      const df = new DataFrame(tableDTO.data ?? []);

      return new Table({
        id: tableDTO.id,
        projectId: tableDTO.projectId,
        name: tableDTO.name,
        sheetIndex: tableDTO.sheetIndex,
        columns,
        dataFrame: df,
        createdAt: new Date(tableDTO.createdAt),
      });
    });

    return new Project({
      id: dto.id,
      name: dto.name,
      sourceType: dto.sourceType,
      sourceFilePath: dto.sourceFilePath,
      status: dto.status,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      tables,
    });
  }
}
