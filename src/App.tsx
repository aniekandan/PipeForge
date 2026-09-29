/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { BlankShellView } from './views/BlankShellView.tsx';
import { CloseFailureModal } from './views/CloseFailureModal.tsx';
import { OpenProjectModal } from './views/OpenProjectModal.tsx';
import { ProjectImportWizardModal } from './views/ProjectImportWizardModal.tsx';
import { ProjectLoadedView } from './views/ProjectLoadedView.tsx';
import { SampleFilesBar } from './views/SampleFilesBar.tsx';
import { TitleBar } from './views/TitleBar.tsx';

const AppShell: React.FC = () => {
  const { viewModel } = useApp();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#f9fbfd] font-sans text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Native Desktop Window TitleBar */}
      <TitleBar
        sessionState={viewModel.sessionState}
        projectName={viewModel.currentProject?.name}
      />

      {/* Main Workspace: Screen 1 (Blank) or Screen 2 (Project Loaded) */}
      <main className="relative flex flex-1 flex-col overflow-hidden bg-[#f9fbfd]">
        {viewModel.isProjectOpen ? (
          <ProjectLoadedView viewModel={viewModel} />
        ) : (
          <BlankShellView viewModel={viewModel} />
        )}

        {/* Modal: Unified Project Import & Save As Wizard */}
        {viewModel.activeImportWizard && (
          <ProjectImportWizardModal wizard={viewModel.activeImportWizard} />
        )}

        {/* Modal: Screen 3 / 3b (Open Project Dialog) */}
        {viewModel.activeOpenDialog && (
          <OpenProjectModal dialog={viewModel.activeOpenDialog} />
        )}

        {/* Modal: Screen 4 (Close Failure Dialog) */}
        {viewModel.activeCloseFailureDialog && (
          <CloseFailureModal dialog={viewModel.activeCloseFailureDialog} />
        )}
      </main>

      {/* Test Harness & Scenario Fixtures Bar */}
      <SampleFilesBar />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
