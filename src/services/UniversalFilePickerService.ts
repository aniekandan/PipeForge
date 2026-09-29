/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileDescriptor, IFilePickerService } from './IFilePickerService.ts';

declare global {
  interface Window {
    electronAPI?: {
      showOpenDialog?: (options: {
        filters: Array<{ name: string; extensions: string[] }>;
      }) => Promise<{ canceled: boolean; filePaths: string[] }>;
      selectDirectory?: () => Promise<string | null>;
      getDocumentsPath?: () => Promise<string>;
      readFile?: (filePath: string) => Promise<ArrayBuffer>;
      writeFile?: (filePath: string, data: Uint8Array | ArrayBuffer) => Promise<boolean>;
      deleteFile?: (filePath: string) => Promise<boolean>;
      getInitialFile?: () => Promise<string | null>;
      minimizeWindow?: () => Promise<void>;
      maximizeWindow?: () => Promise<boolean>;
      isMaximized?: () => Promise<boolean>;
      closeWindow?: () => Promise<void>;
      quitAndInstall?: () => Promise<void>;
      onOpenFile?: (callback: (filePath: string) => void) => () => void;
    };
    showDirectoryPicker?: () => Promise<any>;
  }
}

export class UniversalFilePickerService implements IFilePickerService {
  public async pickFile(filters?: string[]): Promise<FileDescriptor | null> {
    // 1. Electron Native Path
    if (typeof window !== 'undefined' && window.electronAPI?.showOpenDialog && window.electronAPI?.readFile) {
      try {
        const result = await window.electronAPI.showOpenDialog({
          filters: [
            {
              name: 'Spreadsheet & Data Files',
              extensions: ['xlsx', 'csv'],
            },
          ],
        });

        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
          return null;
        }

        const filePath = result.filePaths[0];
        const buffer = await window.electronAPI.readFile(filePath);
        const fileName = filePath.split(/[/\\]/).pop() || 'imported_file';

        return {
          path: filePath,
          name: fileName,
          buffer,
          source: 'electron-native',
        };
      } catch (err) {
        console.error('Electron file dialog error:', err);
      }
    }

    // 2. Web Browser Path: dynamic HTML file input
    return new Promise<FileDescriptor | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = filters?.join(',') || '.xlsx,.csv';
      input.style.display = 'none';

      let resolved = false;

      const cleanUp = () => {
        if (input.parentNode) {
          input.parentNode.removeChild(input);
        }
      };

      input.onchange = async () => {
        if (resolved) return;
        resolved = true;
        const file = input.files?.[0];
        cleanUp();

        if (!file) {
          resolve(null);
          return;
        }

        try {
          const buffer = await file.arrayBuffer();
          const simulatedPath = `C:\\Users\\Desktop\\Documents\\${file.name}`;
          resolve({
            path: (file as unknown as { path?: string }).path || simulatedPath,
            name: file.name,
            buffer,
            source: 'browser-picker',
          });
        } catch (err) {
          console.error('Failed to read file buffer:', err);
          resolve(null);
        }
      };

      input.oncancel = () => {
        if (resolved) return;
        resolved = true;
        cleanUp();
        resolve(null);
      };

      document.body.appendChild(input);
      input.click();
    });
  }

  public async pickDirectory(): Promise<string | null> {
    // 1. Electron Native Directory Picker
    if (typeof window !== 'undefined' && window.electronAPI?.selectDirectory) {
      try {
        return await window.electronAPI.selectDirectory();
      } catch (err) {
        console.error('Failed to select directory via Electron:', err);
      }
    }

    return null;
  }

  public async getDefaultSaveDirectory(): Promise<string> {
    if (typeof window !== 'undefined' && window.electronAPI?.getDocumentsPath) {
      try {
        return await window.electronAPI.getDocumentsPath();
      } catch {
        // fallback
      }
    }
    return 'C:\\Users\\Desktop\\Documents\\PipeForge Projects';
  }
}
