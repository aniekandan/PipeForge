/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IndexedDBProjectStore } from './IndexedDBProjectStore.ts';
import { IProjectStore } from './IProjectStore.ts';
import { ZipProjectStore } from './ZipProjectStore.ts';

export class ProjectStoreFactory {
  public static createDefaultStore(): IProjectStore & {
    setSimulateWriteFailure: (fail: boolean) => void;
    isSimulatingWriteFailure: boolean;
    clearAll?: () => Promise<void>;
  } {
    if (typeof indexedDB !== 'undefined') {
      return new IndexedDBProjectStore();
    }
    return new ZipProjectStore();
  }
}
