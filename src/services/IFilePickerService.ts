/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FileDescriptor {
  path: string;
  name: string;
  buffer?: ArrayBuffer;
  source: 'electron-native' | 'browser-picker';
}

export interface IFilePickerService {
  /**
   * Triggers the platform file picker.
   * Resolves with FileDescriptor or null if cancelled.
   */
  pickFile(filters?: string[]): Promise<FileDescriptor | null>;

  /**
   * Triggers directory picker to choose target save location.
   */
  pickDirectory?(): Promise<string | null>;

  /**
   * Gets default system Documents directory for projects.
   */
  getDefaultSaveDirectory?(): Promise<string>;
}
