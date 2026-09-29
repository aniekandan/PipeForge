/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SourceType } from '../domain/types.ts';

export enum SessionState {
  Idle = 'Idle',                     // Workspace blank; no project loaded; ready for action
  Importing = 'Importing',           // File import and parsing in progress
  ImportWizard = 'ImportWizard',     // 3-step project import & setup wizard active
  OpeningPicker = 'OpeningPicker',   // Open Project dialog active
  ProjectOpen = 'ProjectOpen',       // Project loaded and actively open in workspace
  Closing = 'Closing',               // Save/close operation in progress (transient)
  CloseBlocked = 'CloseBlocked',     // Save failed on close; failure modal displayed over open project
}

export interface TableSummaryVM {
  readonly id: string;
  readonly name: string;
  readonly sheetIndex?: number | null;
  readonly rowCount: number;
  readonly columnCount: number;
  readonly columnNames: string[];
}

export interface ProjectSummaryVM {
  readonly id: string;
  readonly name: string;
  readonly sourceType: SourceType;
  readonly sourceFilePath: string;
  readonly tableCount: number;
  readonly rowCount: number;
  readonly updatedAt: string;
  readonly lastOpenedAt?: string;
  readonly createdAt?: string;
}
