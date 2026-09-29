/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IProjectService } from '../services/IProjectService.ts';

export type CloseFailureResult = 'closed' | 'cancelled';

export class CloseFailureDialogViewModel {
  public message: string;
  public isBusy = false;
  public retryErrorMessage: string | null = null;

  private readonly _projectId: string;
  private readonly _projectService: IProjectService;
  private readonly _onClose: (result: CloseFailureResult) => void;
  private readonly _notifyChange: () => void;

  constructor(
    projectId: string,
    initialMessage: string,
    projectService: IProjectService,
    onClose: (result: CloseFailureResult) => void,
    notifyChange: () => void
  ) {
    this._projectId = projectId;
    this.message = initialMessage;
    this._projectService = projectService;
    this._onClose = onClose;
    this._notifyChange = notifyChange;
  }

  public async executeSaveAndClose(): Promise<void> {
    if (this.isBusy) return;
    this.isBusy = true;
    this.retryErrorMessage = null;
    this._notifyChange();

    try {
      await this._projectService.close(this._projectId);
      this.isBusy = false;
      this._notifyChange();
      this._onClose('closed');
    } catch (err) {
      this.isBusy = false;
      this.retryErrorMessage =
        err instanceof Error ? err.message : 'Save failed again. Check disk space or write permissions.';
      this.message = this.retryErrorMessage;
      this._notifyChange();
    }
  }

  public executeCloseWithoutSaving(): void {
    if (this.isBusy) return;
    this._projectService.forceClose(this._projectId);
    this._onClose('closed');
  }

  public executeCancel(): void {
    if (this.isBusy) return;
    this._onClose('cancelled');
  }
}
