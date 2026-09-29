/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColumnDef } from '../domain/ColumnDef.ts';
import { InferredDataType, toInferredDataType } from '../domain/types.ts';

export class ColumnHeaderVM {
  public readonly name: string;
  public readonly index: number;
  public readonly inferredType: InferredDataType;

  constructor(domainDef: ColumnDef) {
    this.name = domainDef.name;
    this.index = domainDef.index;
    this.inferredType = toInferredDataType(domainDef.inferredType);
  }

  /**
   * Domain-standard display header, strictly omitting spreadsheet A,B,C lettering
   * e.g., "Customer_Name (String)" or "Total_Amount (Float64)"
   */
  public get displayHeader(): string {
    return `${this.name} (${this.inferredType})`;
  }
}
