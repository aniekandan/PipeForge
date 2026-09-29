# Sprint 1 Specification: Extended Project Lifecycle & Data Ingestion Engine

## 1. Overview & Context

This specification establishes the complete contract and system architecture for **PipeForge Sprint 1**. It incorporates the **3-Step Import Wizard (UC1b)**, **Read-Only Data Grid Workspace View**, **Project Deletion Flow (UC4)**, **Recent Projects Home Dashboard**, and the **4-Tier MVVM Architecture** adhering strictly to SOLID principles and the domain data model.

---

## 2. Key Architectural Decisions (Locked-in)

### Decision 1 — Inline Retry for Finalize Failure (UC1b-S11)
* **Context:** Store write fails at Step 3 (`CreateProjectCommand`) during project initialization.
* **Resolution:** The user remains directly on the **Project Config / Save As (Step 3)** screen. An inline error banner is rendered, and the user receives an inline **Retry** action alongside **Cancel** and **Back**. No popup modal is spawned. `CreateProjectCommand` resets `isBusy = false` after failure so retry immediately re-runs the persist operation.

### Decision 2 — Active Project Deletion Guard (UC4 & UC4-S4)
* **Context:** User attempts to delete a project from the Recent Projects table on the Home Screen.
* **Resolution:** `DeleteProjectCommand.CanExecute` evaluates:
  $$\text{CanExecute} = !\text{IsBusy} \land (\text{projectId} \neq \text{Shell.CurrentProject.Id})$$
* **Policy:** Deleting the actively loaded workspace project is explicitly blocked (disabled with a tooltip). To delete an active project, the user must close it first (returning to `SessionState.Idle`), then execute the deletion via `DeleteConfirmDialogViewModel`. Delete and Close workflows remain completely decoupled.

---

## 3. Extended ViewModel Specifications

### 1. `ProjectImportWizardViewModel`
Replaces the single direct file-picker-to-project flow in UC1. Governs the 3-step ingestion and validation machine without polluting root `Shell.SessionState`.

| Type | Name | Details / Invariant Rules |
| :--- | :--- | :--- |
| **Field** | `CurrentStep` | Enum: `SelectFile` (1) \| `InspectTables` (2) \| `ConfigureProject` (3). |
| **Field** | `SelectedFile` | `FileDescriptor?` — Loaded via drag-drop or file picker. |
| **Field** | `ParsedProject` | `Project?` — In-memory domain entity holding parsed worksheets and inferenced schemas. |
| **Field** | `ProjectName` | `string` — Defaulted from file base name on entering Step 3; user-editable. |
| **Field** | `SaveLocation` | `string` — Defaulted from local documents container; user-editable. |
| **Field** | `IsStep3Valid` | `bool` — `projectName.trim().length > 0 && saveLocation.trim().length > 0 && !isProcessing`. |
| **Field** | `ErrorMessage` | `string?` — Scoped to current step; cleared on user retry or edits. |
| **Field** | `IsProcessing` | `bool` — `true` during asynchronous file parsing or package serialization. |
| **Command** | `HandleDroppedFile(file)` | Validates `.xlsx` / `.csv` extension and begins parsing. |
| **Command** | `BrowseViaPicker()` | Invokes `IFilePickerService.pickFile(['.xlsx', '.csv'])`. |
| **Command** | `GoNext()` | Transitions from `InspectTables` (2) $\rightarrow$ `ConfigureProject` (3). |
| **Command** | `GoBack()` | Step 2 $\rightarrow$ Step 1 (retains file); Step 3 $\rightarrow$ Step 2 (retains preview). |
| **Command** | `ConfirmCreateProject()` | Validates name uniqueness, builds finalized `Project` aggregate, persists `.pipeforge` zip container to store, updates `SessionState = ProjectOpen`, and triggers `Shell.refreshRecentProjects()`. On failure (`UC1b-S11`), stays on Step 3 with inline error and retry. |
| **Command** | `Cancel()` | Aborts wizard, unloads transient data, and resets `Shell.SessionState = Idle`. |

### 2. `TableViewModel` (Workspace Read-Only Grid)
Provides a paginated, high-performance read-only projection of table records. No in-session mutation operations exist in Sprint 1.

| Type | Name | Details / Rules |
| :--- | :--- | :--- |
| **Field** | `TableId`, `Name` | Matches `Table.id` and `Table.name`. |
| **Field** | `Columns` | `ColumnDef[]` (`{ name, index, inferredType }`). |
| **Field** | `Rows` | `Record<string, unknown>[]` — Dataframe row records. |
| **Field** | `TotalRowCount` | Total rows count in the worksheet table. |
| **Field** | `PageIndex`, `PageSize` | Pagination state for table viewing. |

### 3. `ShellViewModel` Additions (Home Dashboard)

| Type | Name | Details / Rules |
| :--- | :--- | :--- |
| **Field** | `RecentProjects` | `ProjectSummaryVM[]` — Populated from `IProjectStore` metadata catalog. |
| **Field** | `HasRecentProjects` | `bool` — Dictates dual-state rendering on `BlankShellView`. |
| **Field** | `ActiveDeleteDialog` | `DeleteConfirmDialogViewModel?` — Active deletion modal instance. |
| **Command** | `RefreshRecentProjects()` | Queries store catalog; called on init, create, close, and delete. |
| **Command** | `OpenRecentProject(id)` | Loads domain project directly from zip storage and transitions to `ProjectOpen`. |
| **Command** | `ExecuteRequestDeleteProject(id, name)` | Opens `DeleteConfirmDialogViewModel`. *CanExecute:* `!IsBusy && id !== CurrentProject?.Id`. |

### 4. `DeleteConfirmDialogViewModel` (UC4)

| Type | Name | Details / Rules |
| :--- | :--- | :--- |
| **Field** | `ProjectId`, `ProjectName` | Target project identity and display label. |
| **Field** | `IsBusy`, `ErrorMessage` | Async mutation status pair. |
| **Command** | `ExecuteConfirmDelete()` | Calls `ProjectService.deleteProject(id)`. On success, closes with `'deleted'`. |
| **Command** | `ExecuteCancel()` | Closes with `'cancelled'`; no changes made. |

---

## 4. Use Case Scenario Specifications

### UC1b — 3-Step Project Import Wizard Flow

* **Precondition:** `Shell.SessionState == Idle`.
* **Trigger:** User clicks **Import File** (`Shell.executeImportFile()`).
* **State Transition:** `Shell.SessionState = ImportWizard`.

#### Detailed Scenarios
* **S1 (Main — Drag & Drop XLSX):**
  1. User drops `.xlsx` file onto dropzone $\rightarrow$ `HandleDroppedFile(file)`.
  2. `FileImportService` parses workbook, extracts worksheets, infers column types, and instantiates `Project` entity.
  3. Wizard transitions to **Step 2 (Inspect Tables)**, rendering table list, row counts, and column pill badges.
  4. User reviews tables and clicks **Next: Setup Project** $\rightarrow$ advances to **Step 3 (Save As)**.
  5. `ProjectName` auto-fills from file base name; `SaveLocation` defaults to local documents.
  6. User clicks **Create Project** $\rightarrow$ `ConfirmCreateProject()` checks name uniqueness via `ProjectStore.existsByName()`.
  7. `ProjectStore.save()` compresses entity into `.pipeforge` archive and stores in IndexedDB/LocalStorage.
  8. `Shell.CurrentProject` is set; `Shell.SessionState = ProjectOpen`; wizard closes; recent projects list refreshed.
* **S2 (Alt — Browse via OS Picker):** User clicks "Browse Files on Computer" $\rightarrow$ opens native file dialog.
* **S3 (Alt — Single-Table CSV):** CSV parsed into single table entity (`sheetIndex: null`).
* **S4 (Alt — Step 2 Back Navigation):** `GoBack()` returns to Step 1 (retains selected file).
* **S5 (Alt — Step 3 Back Navigation):** `GoBack()` returns to Step 2 (retains preview and extracted schema).
* **S6 (Exception — Unsupported File Type):** Throws `UnsupportedFileTypeError`. Shows error banner, remains on Step 1.
* **S7 (Exception — Corrupt File):** Throws `ParseError`. Shows error banner, remains on Step 1.
* **S8 (Exception — Empty File / Zero Rows):** Throws `EmptyDataError`. No disk write occurs.
* **S9 (Exception — Name Collision at Step 3):** `checkNameExists()` returns `true`. Displays inline error; button disabled.
* **S10 (Alt — Cancel Wizard):** `Cancel()` discards wizard and returns `Shell.SessionState = Idle`.
* **S11 (Exception — Store Write Fails at Finalize):**
  - `ProjectStore.save()` fails with `StoreWriteError`.
  - Wizard stays on Step 3 (`ConfigureProject`), sets `isProcessing = false`, renders inline error banner, and provides **"Retry"** (re-running `ConfirmCreateProject()`) and **"Cancel"**.

---

### UC4 — Delete Project Flow

* **Precondition:** Target project exists in `RecentProjects`.
* **Trigger:** User clicks **Delete (Trash)** icon on project row in Home Dashboard.

#### Detailed Scenarios
* **S1 (Main — Delete Stored Project):**
  1. User clicks **Delete** $\rightarrow$ `Shell.executeRequestDeleteProject(projectId, projectName)`.
  2. Opens `DeleteConfirmModal` displaying project name and warning.
  3. User clicks **Confirm Delete** $\rightarrow$ calls `ProjectService.deleteProject(id)`.
  4. `ProjectStore.deleteProject(id)` removes binary package and summary index entry.
  5. Dialog closes with `'deleted'`; `Shell.refreshRecentProjects()` updates Home table.
* **S2 (Alt — Cancel Deletion):** User clicks **Cancel**; dialog dismisses with `'cancelled'`; no changes occur.
* **S3 (Exception — Store Deletion Failure):** `ProjectStore.deleteProject()` throws `StoreWriteError`. Dialog displays error message and permits retry or cancel.
* **S4 (Guard Policy — Active Project Protected):**
  - Delete button is disabled/blocked for any row where `projectId === Shell.CurrentProject.Id`. Active workspace projects cannot be deleted while open.

---

## 5. Storage & Persistence Contracts

### `.pipeforge` Zip Container Manifest
```text
project_name.pipeforge (or .zip)
│
├── project.json                   <-- Root metadata, timestamps, table manifest
└── tables/
    ├── <table-uuid-1>/
    │   ├── metadata.json          <-- Column definitions & inferred types
    │   └── data.json              <-- Serialized DataFrame records
    └── <table-uuid-2>/
        ├── metadata.json
        └── data.json
```

### `SessionState` Enum States
```typescript
export enum SessionState {
  Idle = 'Idle',                 // Workspace blank / Home Recents Dashboard
  Importing = 'Importing',       // Direct file import
  ImportWizard = 'ImportWizard', // 3-step import & setup wizard
  OpeningPicker = 'OpeningPicker', // Open project catalog modal
  ProjectOpen = 'ProjectOpen',   // Project active in workspace grid
  Closing = 'Closing',           // Transient state during project close
  CloseBlocked = 'CloseBlocked', // Save failure recovery modal
}
```

---

## 6. Verification Status

| Validation Suite | Status |
| :--- | :--- |
| **TypeScript Compilation (`compile_applet`)** | ✅ **Passed (0 errors)** |
| **Static Code Analysis (`lint_applet`)** | ✅ **Passed (0 warnings)** |
| **Layer Decoupling & Invariants** | ✅ **Fully Enforced** |
