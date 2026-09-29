/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppSettings } from '../domain/UpdateTypes.ts';

export interface ISettingsStore {
  loadAsync(): Promise<AppSettings>;
  saveAsync(settings: AppSettings): Promise<void>;
}
