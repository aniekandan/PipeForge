/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RetryPolicy, UpdateInfo } from '../domain/UpdateTypes.ts';

export interface IUpdateService {
  readonly currentVersion: string;
  checkForUpdate(isManual?: boolean): Promise<UpdateInfo | null>;
  downloadUpdate(
    info: UpdateInfo,
    onProgress: (percent: number) => void,
    policy: RetryPolicy
  ): Promise<void>;
  quitAndInstall(): Promise<void>;

  // Test Harness / Simulation controls
  setSimulatedRemoteVersion(version: string | null): void;
  setSimulateCheckNetworkError(fail: boolean): void;
  setSimulateDownloadFailure(fail: boolean): void;
  getSimulatedRemoteVersion(): string | null;
  isSimulatingCheckError(): boolean;
  isSimulatingDownloadFailure(): boolean;
}
