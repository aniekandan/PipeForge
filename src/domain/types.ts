/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SourceType = 'xlsx' | 'csv';

export type ProjectStatus = 'open' | 'closed';

export type InferredType = 'string' | 'number' | 'boolean' | 'date' | 'object' | 'unknown';

export type InferredDataType = 'String' | 'Int64' | 'Float64' | 'Boolean' | 'DateTime' | 'Unknown';

/**
 * Maps raw inferred types to standard DataFrame domain types
 */
export function toInferredDataType(type: string | undefined): InferredDataType {
  if (!type) return 'Unknown';
  const lower = type.toLowerCase();
  if (lower === 'string' || lower === 'text') return 'String';
  if (lower === 'int' || lower === 'int64' || lower === 'integer') return 'Int64';
  if (lower === 'number' || lower === 'float' || lower === 'float64' || lower === 'double') return 'Float64';
  if (lower === 'boolean' || lower === 'bool') return 'Boolean';
  if (lower === 'date' || lower === 'datetime' || lower === 'timestamp') return 'DateTime';
  return 'String';
}
