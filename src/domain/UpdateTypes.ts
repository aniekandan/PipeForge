/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UpdateMode {
  Automatic = 'Automatic',
  AutoCheckManualInstall = 'AutoCheckManualInstall',
  ManualOnly = 'ManualOnly',
}

export enum UpdateState {
  Idle = 'Idle',
  Checking = 'Checking',
  CheckFailed = 'CheckFailed',
  Available = 'Available',
  Downloading = 'Downloading',
  DownloadFailed = 'DownloadFailed',
  Ready = 'Ready',
  Installing = 'Installing',
}

export interface AppSettings {
  updateMode: UpdateMode;
  lastCheckedAt: string | null;
  checkIntervalMinutes?: number;
}

export interface UpdateInfo {
  version: string;
  releaseNotesUrl: string;
  publishedAt: string;
  releaseTitle?: string;
  downloadSizeMb?: number;
}

export class RetryPolicy {
  constructor(
    public readonly enableRetry: boolean,
    public readonly maxAttempts: number,
    public readonly delaysMs: number[]
  ) {}

  public static None(): RetryPolicy {
    return new RetryPolicy(false, 1, []);
  }

  public static SilentDefault(): RetryPolicy {
    // Delays: Attempt 1 -> 1000ms (in UI) or 10s (in real), Attempt 2 -> 2000ms / 60s
    return new RetryPolicy(true, 3, [1000, 2000]);
  }
}
