/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UpdateCheckError, UpdateDownloadError } from '../domain/errors.ts';
import { RetryPolicy, UpdateInfo } from '../domain/UpdateTypes.ts';
import { IUpdateService } from './IUpdateService.ts';

export function compareSemVer(v1: string, v2: string): number {
  const clean1 = v1.replace(/^v/i, '').trim();
  const clean2 = v2.replace(/^v/i, '').trim();
  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

export class UpdateService implements IUpdateService {
  public readonly currentVersion = '1.0.0';

  // Simulation controls for Sprint 3 test harness & interactive verification
  private _simulatedRemoteVersion: string | null = '1.5.0';
  private _simulateCheckError = false;
  private _simulateDownloadFailure = false;

  public setSimulatedRemoteVersion(version: string | null): void {
    this._simulatedRemoteVersion = version;
  }

  public getSimulatedRemoteVersion(): string | null {
    return this._simulatedRemoteVersion;
  }

  public setSimulateCheckNetworkError(fail: boolean): void {
    this._simulateCheckError = fail;
  }

  public isSimulatingCheckError(): boolean {
    return this._simulateCheckError;
  }

  public setSimulateDownloadFailure(fail: boolean): void {
    this._simulateDownloadFailure = fail;
  }

  public isSimulatingDownloadFailure(): boolean {
    return this._simulateDownloadFailure;
  }

  public async checkForUpdate(_isManual = false): Promise<UpdateInfo | null> {
    // Artificial latency for UX feedback
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (this._simulateCheckError) {
      throw new UpdateCheckError(
        'Failed to connect to update server (503 Service Unavailable / Network Error).'
      );
    }

    if (!this._simulatedRemoteVersion) {
      return null;
    }

    // Check if remote version is newer than current version
    const cmp = compareSemVer(this._simulatedRemoteVersion, this.currentVersion);
    if (cmp <= 0) {
      return null;
    }

    return {
      version: this._simulatedRemoteVersion,
      releaseNotesUrl: `https://github.com/pipeforge/pipeforge/releases/tag/v${this._simulatedRemoteVersion}`,
      publishedAt: new Date().toISOString(),
      releaseTitle: `PipeForge v${this._simulatedRemoteVersion} - Maintenance & Performance Release`,
      downloadSizeMb: 42.8,
    };
  }

  public async downloadUpdate(
    info: UpdateInfo,
    onProgress: (percent: number) => void,
    policy: RetryPolicy
  ): Promise<void> {
    const maxAttempts = policy.enableRetry ? policy.maxAttempts : 1;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        await this.streamDownload(info, onProgress);
        return; // Success!
      } catch (err) {
        if (attempt >= maxAttempts) {
          throw new UpdateDownloadError(
            `Failed to download update v${info.version}: ${err instanceof Error ? err.message : 'Network stream interrupted'}`,
            err
          );
        }

        // Wait before next silent retry attempt
        const delay = policy.delaysMs[attempt - 1] || 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private async streamDownload(
    _info: UpdateInfo,
    onProgress: (percent: number) => void
  ): Promise<void> {
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const percent = Math.min(100, Math.round((i / steps) * 100));
      onProgress(percent);

      // Trigger error simulation if configured
      if (this._simulateDownloadFailure && i === 6) {
        throw new Error('Connection reset by remote host during payload download.');
      }
    }
  }

  public async quitAndInstall(): Promise<void> {
    // If native electron available
    if (typeof window !== 'undefined' && (window as any).electronAPI?.quitAndInstall) {
      try {
        await (window as any).electronAPI.quitAndInstall();
        return;
      } catch (err) {
        console.warn('Native electron quitAndInstall failed:', err);
      }
    }

    // In web runtime, simulate quick app relaunch delay
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
}
