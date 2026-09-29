/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InferredType } from './types.ts';

export class ColumnDef {
  constructor(
    public readonly name: string,
    public readonly index: number,
    public readonly inferredType: InferredType
  ) {}
}
