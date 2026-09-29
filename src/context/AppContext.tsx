/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { IProjectStore } from '../persistence/IProjectStore.ts';
import { LocalStorageSettingsStore } from '../persistence/LocalStorageSettingsStore.ts';
import { ProjectStoreFactory } from '../persistence/ProjectStoreFactory.ts';
import { FileImportService } from '../services/FileImportService.ts';
import { FileDescriptor } from '../services/IFilePickerService.ts';
import { IUpdateService } from '../services/IUpdateService.ts';
import { ProjectService } from '../services/ProjectService.ts';
import { UniversalFilePickerService } from '../services/UniversalFilePickerService.ts';
import { UpdateService } from '../services/UpdateService.ts';
import { ShellViewModel } from '../viewmodels/ShellViewModel.ts';
import { UpdateViewModel } from '../viewmodels/UpdateViewModel.ts';

interface AppContextValue {
  viewModel: ShellViewModel;
  updateViewModel: UpdateViewModel;
  updateService: IUpdateService;
  store: IProjectStore & {
    setSimulateWriteFailure: (fail: boolean) => void;
    isSimulatingWriteFailure: boolean;
    clearAll?: () => Promise<void>;
  };
  importWithSampleFile: (descriptor: FileDescriptor) => Promise<void>;
  simulateStoreWriteFailure: boolean;
  setSimulateStoreWriteFailure: (fail: boolean) => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useMemo(() => ProjectStoreFactory.createDefaultStore(), []);
  const filePicker = useMemo(() => new UniversalFilePickerService(), []);
  const importService = useMemo(() => new FileImportService(), []);
  const projectService = useMemo(() => new ProjectService(store, importService), [store, importService]);
  const viewModel = useMemo(() => new ShellViewModel(projectService, filePicker), [projectService, filePicker]);

  const settingsStore = useMemo(() => new LocalStorageSettingsStore(), []);
  const updateService = useMemo(() => new UpdateService(), []);
  const updateViewModel = useMemo(
    () => new UpdateViewModel({ updateService, settingsStore }),
    [updateService, settingsStore]
  );

  const [, setTick] = useState(0);
  const [simulateStoreWriteFailure, setSimulateFailureState] = useState(false);

  useEffect(() => {
    // Subscribe to ShellViewModel & UpdateViewModel state transitions
    const unsubscribeShell = viewModel.subscribe(() => {
      setTick((prev) => prev + 1);
    });

    const unsubscribeUpdate = updateViewModel.subscribe(() => {
      setTick((prev) => prev + 1);
    });

    // Check if launched directly with a .pipeforge or data file via OS file association
    if (typeof window !== 'undefined' && typeof window.electronAPI?.getInitialFile === 'function') {
      window.electronAPI
        .getInitialFile()
        .then((filePath) => {
          if (filePath) {
            viewModel.openFileFromNativePath(filePath);
          }
        })
        .catch(() => {});
    }

    // Listen for live file-open events when user double-clicks files while app is open
    let cleanupFileListener: (() => void) | undefined;
    if (typeof window !== 'undefined' && typeof window.electronAPI?.onOpenFile === 'function') {
      cleanupFileListener = window.electronAPI.onOpenFile((filePath) => {
        if (filePath) {
          viewModel.openFileFromNativePath(filePath);
        }
      });
    }

    return () => {
      unsubscribeShell();
      unsubscribeUpdate();
      updateViewModel.destroy();
      if (cleanupFileListener) {
        cleanupFileListener();
      }
    };
  }, [viewModel, updateViewModel]);

  const setSimulateStoreWriteFailure = (fail: boolean) => {
    store.setSimulateWriteFailure(fail);
    setSimulateFailureState(fail);
  };

  const importWithSampleFile = async (descriptor: FileDescriptor) => {
    if (!viewModel.canImportFile) return;
    await viewModel.executeImportFileWithDescriptor(descriptor, projectService);
  };

  const resetAllData = async () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    if (store.clearAll) {
      await store.clearAll().catch(console.error);
    }
    projectService.forceClose('');
    await viewModel.refreshRecentProjects();
  };

  return (
    <AppContext.Provider
      value={{
        viewModel,
        updateViewModel,
        updateService,
        store,
        importWithSampleFile,
        simulateStoreWriteFailure,
        setSimulateStoreWriteFailure,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
};
