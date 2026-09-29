/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project } from '../domain/Project.ts';
import { FileDescriptor } from './IFilePickerService.ts';

export interface IFileImportService {
  /**
   * Ingests and parses raw file bytes from descriptor.
   * Throws UnsupportedFileTypeError, ParseError, or EmptyDataError.
   */
  parse(file: FileDescriptor): Promise<Project>;
}
