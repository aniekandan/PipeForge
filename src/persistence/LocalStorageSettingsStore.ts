/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppSettings, UpdateMode } from '../domain/UpdateTypes.ts';
import { ISettingsStore } from './ISettingsStore.ts';

const SETTINGS_STORAGE_KEY = 'pipeforge_app_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  updateMode: UpdateMode.Automatic,
  lastCheckedAt: null,
  checkIntervalMinutes: 60,
};

export class LocalStorageSettingsStore implements ISettingsStore {
  public async loadAsync(): Promise<AppSettings> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return { ...DEFAULT_SETTINGS };
      }

      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return { ...DEFAULT_SETTINGS };
      }

      const parsed = JSON.parse(raw);
      return {
        updateMode: Object.values(UpdateMode).includes(parsed.updateMode)
          ? parsed.updateMode
          : UpdateMode.Automatic,
        lastCheckedAt: parsed.lastCheckedAt || null,
        checkIntervalMinutes: typeof parsed.checkIntervalMinutes === 'number'
          ? parsed.checkIntervalMinutes
          : 60,
      };
    } catch (err) {
      console.warn('Failed to read settings from storage, using defaults:', err);
      return { ...DEFAULT_SETTINGS };
    }
  }

  public async saveAsync(settings: AppSettings): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      }
    } catch (err) {
      console.error('Failed to persist app settings:', err);
    }
  }
}
