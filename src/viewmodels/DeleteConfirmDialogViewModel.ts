/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IProjectService } from '../services/IProjectService.ts';

export class DeleteConfirmDialogViewModel {
  public readonly projectId: string;
  public readonly projectName: string;
  public isBusy = false;
  public errorMessage: string | null = null;

  private readonly _projectService: IProjectService;
  private readonly _onClose: (result: 'deleted' | 'cancelled') => void;
  private readonly _notifyChange: () => void;

  constructor(
    projectId: string,
    projectName: string,
    projectService: IProjectService,
    onClose: (result: 'deleted' | 'cancelled') => void,
    notifyChange: () => void
  ) {
    this.projectId = projectId;
    this.projectName = projectName;
    this._projectService = projectService;
    this._onClose = onClose;
    this._notifyChange = notifyChange;
  }

  public get canConfirm(): boolean {
    return !this.isBusy;
  }

  public get canCancel(): boolean {
    return !this.isBusy;
  }

  public async executeConfirmDelete(): Promise<void> {
    if (!this.canConfirm) return;

    this.isBusy = true;
    this.errorMessage = null;
    this._notifyChange();

    try {
      await this._projectService.deleteProject(this.projectId);
      this.isBusy = false;
      this._notifyChange();
      this._onClose('deleted');
    } catch (err) {
      this.isBusy = false;
      this.errorMessage = err instanceof Error ? err.message : 'Failed to delete project from storage.';
      this._notifyChange();
    }
  }

  public executeCancel(): void {
    if (!this.canCancel) return;
    this._onClose('cancelled');
  }
}
