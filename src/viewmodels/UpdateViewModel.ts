/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppError, UpdateCheckError, UpdateDownloadError } from '../domain/errors.ts';
import { AppSettings, RetryPolicy, UpdateInfo, UpdateMode, UpdateState } from '../domain/UpdateTypes.ts';
import { ISettingsStore } from '../persistence/ISettingsStore.ts';
import { IUpdateService } from '../services/IUpdateService.ts';
import { compareSemVer } from '../services/UpdateService.ts';
import { ShellViewModel } from './ShellViewModel.ts';

export interface UpdateViewModelParams {
  updateService: IUpdateService;
  settingsStore: ISettingsStore;
}

export class UpdateViewModel {
  private _updateMode: UpdateMode = UpdateMode.Automatic;
  private _lastCheckedAt: string | null = null;
  private _updateState: UpdateState = UpdateState.Idle;
  private _pendingUpdate: UpdateInfo | null = null;
  private _failedVersion: string | null = null;
  private _downloadProgressPercent = 0;
  private _errorMessage: string | null = null;
  private _statusMessage: string | null = null;
  private _isToastVisible = false;
  private _isReadyModalVisible = false;
  private _isSettingsOpen = false;

  private readonly _updateService: IUpdateService;
  private readonly _settingsStore: ISettingsStore;
  private readonly _listeners = new Set<() => void>();
  private _timerId: any = null;

  constructor(params: UpdateViewModelParams) {
    this._updateService = params.updateService;
    this._settingsStore = params.settingsStore;

    // Load persisted settings and start timer
    this.init();
  }

  private async init(): Promise<void> {
    try {
      const settings = await this._settingsStore.loadAsync();
      this._updateMode = settings.updateMode;
      this._lastCheckedAt = settings.lastCheckedAt;
      this.reconfigureTimer();
      this.notify();
    } catch (err) {
      console.warn('Failed to initialize update settings:', err);
    }
  }

  // --- Observability Binding ---
  public subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private notify(): void {
    this._listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in UpdateViewModel listener:', err);
      }
    });
  }

  // --- Properties ---
  public get currentVersion(): string {
    return this._updateService.currentVersion;
  }

  public get updateMode(): UpdateMode {
    return this._updateMode;
  }

  public get lastCheckedAt(): string | null {
    return this._lastCheckedAt;
  }

  public get updateState(): UpdateState {
    return this._updateState;
  }

  public get pendingUpdate(): UpdateInfo | null {
    return this._pendingUpdate;
  }

  public get failedVersion(): string | null {
    return this._failedVersion;
  }

  public get downloadProgressPercent(): number {
    return this._downloadProgressPercent;
  }

  /**
   * Computed: selection locked when downloading or installing (UC8-S4)
   */
  public get isModeLocked(): boolean {
    return (
      this._updateState === UpdateState.Downloading ||
      this._updateState === UpdateState.Installing
    );
  }

  public get errorMessage(): string | null {
    return this._errorMessage;
  }

  public get statusMessage(): string | null {
    return this._statusMessage;
  }

  public get isToastVisible(): boolean {
    return this._isToastVisible;
  }

  public get isReadyModalVisible(): boolean {
    return this._isReadyModalVisible;
  }

  public get isSettingsOpen(): boolean {
    return this._isSettingsOpen;
  }

  // --- Commands & Actions ---

  public openSettings(): void {
    this._isSettingsOpen = true;
    this.notify();
  }

  public closeSettings(): void {
    this._isSettingsOpen = false;
    this.notify();
  }

  public clearErrorMessage(): void {
    this._errorMessage = null;
    this.notify();
  }

  public clearStatusMessage(): void {
    this._statusMessage = null;
    this.notify();
  }

  /**
   * UC8: Configure Update Mode
   */
  public async setUpdateMode(mode: UpdateMode): Promise<void> {
    if (this.isModeLocked) return;
    if (this._updateMode === mode) return; // UC8-S2: no-op

    this._updateMode = mode;
    this._errorMessage = null;
    this.notify();

    // Persist via ISettingsStore
    await this.persistSettings();

    // Reconfigure background check timer
    this.reconfigureTimer();
  }

  private async persistSettings(): Promise<void> {
    const settings: AppSettings = {
      updateMode: this._updateMode,
      lastCheckedAt: this._lastCheckedAt,
    };
    await this._settingsStore.saveAsync(settings);
  }

  /**
   * Background Timer Reconfiguration
   */
  private reconfigureTimer(): void {
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }

    // Only run background timer for Automatic and AutoCheckManualInstall
    if (
      this._updateMode === UpdateMode.Automatic ||
      this._updateMode === UpdateMode.AutoCheckManualInstall
    ) {
      // In applet simulation, run periodic check every 45 seconds
      this._timerId = setInterval(() => {
        this.executeBackgroundCheck();
      }, 45000);
    }
  }

  public destroy(): void {
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  }

  /**
   * UC9: Check for Updates (Manual or Background)
   */
  public async checkForUpdate(isManual = true): Promise<void> {
    if (
      this._updateState === UpdateState.Checking ||
      this._updateState === UpdateState.Downloading ||
      this._updateState === UpdateState.Installing
    ) {
      return;
    }

    this._updateState = UpdateState.Checking;
    this._errorMessage = null;
    this._statusMessage = null;
    this.notify();

    try {
      const info = await this._updateService.checkForUpdate(isManual);

      if (info) {
        // UC9-S2 / S4: Update found (latest > current)
        this._pendingUpdate = info;
        this._lastCheckedAt = new Date().toISOString();
        await this.persistSettings();

        if (this._updateMode === UpdateMode.Automatic) {
          // UC9-S2 / UC10-S1: Auto-advance into download immediately without toast
          this._updateState = UpdateState.Available;
          this.notify();
          await this.executeDownloadUpdate(true);
        } else {
          // Mode B or C: Render update found toast + title-bar badge
          this._updateState = UpdateState.Available;
          this._isToastVisible = true;
          this.notify();
        }
      } else {
        // UC9-S1 / S3: Up to date (latest <= current)
        this._pendingUpdate = null;
        this._failedVersion = null;
        this._updateState = UpdateState.Idle;
        this._lastCheckedAt = new Date().toISOString();
        await this.persistSettings();

        if (isManual) {
          this._statusMessage = "You're up to date. You have the latest version of PipeForge.";
        }
        this.notify();
      }
    } catch (err) {
      if (isManual) {
        // UC9-S5: Manual check failure
        this._updateState = UpdateState.CheckFailed;
        this._errorMessage =
          err instanceof AppError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Failed to reach update server.';
      } else {
        // UC9-S6: Background check failure logged silently; LastCheckedAt remains untouched
        console.warn('Background update check failed silently:', err);
        this._updateState = UpdateState.Idle;
      }
      this.notify();
    }
  }

  /**
   * UC9 / UC10-S5: Background Check Trigger
   */
  public async executeBackgroundCheck(): Promise<void> {
    if (this._updateMode === UpdateMode.ManualOnly) return;
    if (this.isModeLocked || this._updateState === UpdateState.Checking) return;

    try {
      const info = await this._updateService.checkForUpdate(false);

      if (!info) {
        // Release pulled or latest <= current
        this._pendingUpdate = null;
        this._failedVersion = null;
        this._updateState = UpdateState.Idle;
        this._lastCheckedAt = new Date().toISOString();
        await this.persistSettings();
        this.notify();
        return;
      }

      // Check against FailedVersion memory rules (UC10-S5)
      if (this._failedVersion && info.version === this._failedVersion) {
        // Run silent background retry if in Automatic mode
        if (this._updateMode === UpdateMode.Automatic) {
          try {
            this._pendingUpdate = info;
            this._updateState = UpdateState.Downloading;
            this.notify();
            await this._updateService.downloadUpdate(
              info,
              (pct) => {
                this._downloadProgressPercent = pct;
                this.notify();
              },
              RetryPolicy.SilentDefault()
            );
            // Succeeded!
            this._failedVersion = null;
            this._updateState = UpdateState.Ready;
            this._isReadyModalVisible = true;
            this._isToastVisible = false;
            this.notify();
          } catch {
            // Stay fully silent on repeat failure
            this._updateState = UpdateState.Available;
            this.notify();
          }
        }
        return;
      }

      // Newer version released (latest > FailedVersion)
      if (this._failedVersion && compareSemVer(info.version, this._failedVersion) > 0) {
        this._failedVersion = null;
      }

      this._pendingUpdate = info;
      this._lastCheckedAt = new Date().toISOString();
      await this.persistSettings();

      if (this._updateMode === UpdateMode.Automatic) {
        this._updateState = UpdateState.Available;
        this.notify();
        await this.executeDownloadUpdate(true);
      } else {
        this._updateState = UpdateState.Available;
        this._isToastVisible = true;
        this.notify();
      }
    } catch {
      // Silent error logging for background check
    }
  }

  /**
   * UC10: Download & Install Update
   */
  public async downloadUpdate(): Promise<void> {
    await this.executeDownloadUpdate(false);
  }

  private async executeDownloadUpdate(isAuto: boolean): Promise<void> {
    if (!this._pendingUpdate) return;
    if (this._updateState !== UpdateState.Available && this._updateState !== UpdateState.DownloadFailed) {
      return;
    }

    const info = this._pendingUpdate;
    this._updateState = UpdateState.Downloading;
    this._downloadProgressPercent = 0;
    this._errorMessage = null;
    this._isToastVisible = true;
    this.notify();

    const policy = isAuto ? RetryPolicy.SilentDefault() : RetryPolicy.None();

    try {
      await this._updateService.downloadUpdate(
        info,
        (percent) => {
          this._downloadProgressPercent = percent;
          this.notify();
        },
        policy
      );

      // UC10-S1: Download Success
      this._updateState = UpdateState.Ready;
      this._downloadProgressPercent = 100;
      this._failedVersion = null;
      this._isReadyModalVisible = true;
      this._isToastVisible = false;
      this.notify();
    } catch (err) {
      // UC10-S3a/b & S4: Download Failure
      this._updateState = UpdateState.DownloadFailed;
      this._errorMessage =
        err instanceof AppError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Check your internet connection and try again.';
      this._isToastVisible = true;
      this.notify();
    }
  }

  /**
   * UC10-S2 & S4: Dismiss Update Toast / "Not now"
   */
  public dismissUpdateToast(): void {
    if (this._updateState === UpdateState.DownloadFailed && this._pendingUpdate) {
      // UC10-S4: "Not now" on failure -> sets FailedVersion and retains Available with badge
      this._failedVersion = this._pendingUpdate.version;
      this._updateState = UpdateState.Available;
    }
    this._isToastVisible = false;
    this.notify();
  }

  /**
   * UC10-S4: Release notes URL accessor
   */
  public get releaseNotesUrl(): string | null {
    return this._pendingUpdate?.releaseNotesUrl || null;
  }

  /**
   * UC11: Restart & Apply Update (with Safe Project Protection)
   */
  public async restartNow(shellViewModel: ShellViewModel): Promise<void> {
    if (this._updateState !== UpdateState.Ready) return;

    this._updateState = UpdateState.Installing;
    this._isReadyModalVisible = false;
    this._isToastVisible = false;
    this.notify();

    // UC11-S2: If active project is open, safely close and persist first
    if (shellViewModel.isProjectOpen) {
      const closed = await shellViewModel.executeCloseProjectForUpdate();
      if (!closed) {
        // UC11-S3: Close failed/canceled -> revert to Ready, payload stays cached
        this._updateState = UpdateState.Ready;
        this.notify();
        return;
      }
    }

    // UC11-S1 / S2: Session is Idle -> execute quit and install
    try {
      await this._updateService.quitAndInstall();
    } catch (err) {
      this._updateState = UpdateState.Ready;
      this._errorMessage = err instanceof Error ? err.message : 'Failed to launch update installer.';
      this.notify();
    }
  }

  /**
   * UC11-S4: Postpone Restart ("Later")
   */
  public later(): void {
    this._isReadyModalVisible = false;
    this.notify();
  }
}
