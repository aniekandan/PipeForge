# Sprint Specification: Use Cases & Flows

## 1. Use Case Inventory

| Use Case | Title | Scenarios & Exceptions Covered |
| :--- | :--- | :--- |
| **UC0** | **Launch Application** | **S1 (Main):** Fresh launch with no active project |
| **UC1** | **Import File $\rightarrow$ Create Project** | **S1 (Main):** Valid multi-sheet `.xlsx`<br/>**S2 (Alt):** Valid `.csv` (single table)<br/>**S3 (Alt):** User cancels file picker<br/>**S4 (Exception):** Unsupported file type<br/>**S5 (Exception):** File unreadable / corrupt / parse failure<br/>**S6 (Exception):** File parses but contains no data rows<br/>**S7 (Exception):** Duplicate project name exists in store |
| **UC2** | **Open Existing Project** | **S1 (Main):** User selects saved project and it loads<br/>**S2 (Alt):** No saved projects exist yet<br/>**S3 (Alt):** User cancels dialog<br/>**S4 (Exception):** Stored project data missing/corrupt |
| **UC3** | **Close Active Project** | **S1 (Main):** Close returns workspace to blank state<br/>**S2 (Exception):** Metadata write fails on close (blocks close until resolved) |

> **Standing Assumption:** `Import File` and `Open Project` actions are only reachable when the application is in a blank state (`IsProjectOpen == false`). Closing an active project is the only way back to the blank state.

---

## 2. Detailed Use Case Flows

### UC0 — Launch Application

* **Actor:** User (indirectly via OS process launch)
* **Precondition:** Application process starting; `ProjectService.activeProject` is unset (`null`).
* **Trigger:** Application main window opens.

#### Main Flow (S1)
1. View instantiates `ShellViewModel`.
2. ViewModel initialization checks `ProjectService.activeProject` $\rightarrow$ returns `null` $\rightarrow$ sets `CurrentProject = null`.
3. View binds to `Shell.IsProjectOpen` (computed property: `CurrentProject != null`), evaluating to `false`.
4. View renders the blank shell containing **Import File** and **Open Project** buttons, both enabled (`CanExecute: !IsBusy && !IsProjectOpen`).

* **Postcondition:** Blank shell displayed. No project loaded; no store reads/writes executed.

---

### UC1 — Import File $\rightarrow$ Create Project

* **Actor:** User
* **Precondition:** `Shell.IsProjectOpen == false` (Blank state)
* **Trigger:** User clicks **Import File** button.

#### S1 (Main) — Valid Multi-Sheet XLSX
1. View triggers `ShellViewModel.ImportFileCommand.Execute()`.
2. *CanExecute Check:* `!IsBusy && !IsProjectOpen` $\rightarrow$ returns `true`.
3. ViewModel sets `IsBusy = true` $\rightarrow$ View disables both entry buttons via data binding.
4. ViewModel invokes native OS file picker filtered to `*.xlsx;*.csv`.
5. User selects a valid file (e.g., `Sales.xlsx`). Picker returns file path to ViewModel.
6. ViewModel calls `ProjectService.importFromFile(path)`.
7. `ProjectService` delegates parsing to `FileImportService.parse(path)`:
   * Reads raw file bytes from `Local File System`.
   * Identifies `.xlsx` format, parses workbook, and enumerates sheets.
   * For each sheet, constructs a `Table` entity (`name` = sheet name, `sheetIndex` = index, column definitions inferred from header, `rowCount` computed).
   * Constructs `Project` domain entity (`name` = file base name, `sourceType = "xlsx"`, `sourceFilePath = path`, `tables = [...]`).
8. `ProjectService` calls `ProjectStore.save(project)` $\rightarrow$ persists project and table structures to the `Project Store`.
9. `ProjectService` sets `activeProject = project` and returns the project to the ViewModel.
10. ViewModel maps `Project` entity to `ProjectViewModel`:
    * Maps primary properties (`Id`, `Name`).
    * Projects domain tables to `TableSummaryVM[]` (`ColumnCount`, `RowCount`, `SheetIndex`).
11. ViewModel sets `Shell.CurrentProject = projectVM` and `Shell.IsBusy = false`.
12. View updates: `IsProjectOpen` becomes `true` $\rightarrow$ renders active `ProjectView` showing project name, table summaries, and a **Close Project** button bound to `Shell.CloseProjectCommand`.

* **Postcondition:** Project persisted; Shell renders project table summaries.

#### S2 (Alt) — Valid CSV
* **Steps 1–6:** Same as S1.
* **Step 7:** `FileImportService` detects `.csv` file format $\rightarrow$ creates exactly one `Table` (`sheetIndex = null`, `name` = file base name or `"Sheet1"`). `Project.tables.length === 1`.
* **Steps 8–12:** Same as S1.

#### S3 (Alt) — User Cancels File Picker
* **Steps 1–4:** Same as S1.
* **Step 5:** User cancels native picker dialog; picker returns `null`.
* **Step 5':** ViewModel verifies result is `null` and resets `IsBusy = false`. No service calls executed.
* **Postcondition:** Workspace remains unchanged in blank state.

#### S4 (Exception) — Unsupported File Type
* **Steps 1–6:** Same as S1.
* **Step 7:** `FileImportService.parse()` throws `UnsupportedFileTypeError` prior to invoking `ProjectStore`.
* **Step 7':** `ProjectService` rethrows exception. ViewModel catch block sets `Shell.ErrorMessage = "Unsupported file type"` and `IsBusy = false`. `CurrentProject` remains `null`.
* **Step 8:** View renders error message bound to `ErrorMessage`.

#### S5 (Exception) — Corrupt / Unreadable File
* **Flow:** Follows S4 exception path, triggered by a `ParseError` mid-parse due to damaged bytes or malformed workbook structures.

#### S6 (Exception) — File Contains No Data Rows
* **Steps 1–6:** Same as S1.
* **Step 7:** `FileImportService.parse()` builds candidate table structures, then executes a data validation pass. If any parsed `Table.rowCount == 0`, it throws `EmptyDataError` (e.g., `"Sheet 'Q2' has no data rows"`, or `"File contains no data"` for CSV files).
* **Step 7':** Import aborts atomically. `ProjectStore.save()` is never reached; no persistent records are created.
* **Step 8':** ViewModel catches `EmptyDataError`, sets `Shell.ErrorMessage` to the error message, and sets `IsBusy = false`. `CurrentProject` remains `null`.
* **Step 9':** **Retry:** Because no partial state was created, the user can click **Import File** again to start fresh from Step 1.

#### S7 (Exception) — Duplicate Project Name
* **Steps 1–7:** Same as S1.
* **Step 8:** `ProjectService` checks `ProjectStore.existsByName(project.name)`. If a project with the same name already exists in the store, `ProjectService` throws `DuplicateProjectNameError` (`"A project named 'Sales.xlsx' already exists."`).
* **Step 8':** ViewModel catches `DuplicateProjectNameError`, sets `Shell.ErrorMessage`, and resets `IsBusy = false`. `CurrentProject` remains `null`. Workspace stays in blank state with the error banner visible.

---

### UC2 — Open Existing Project

* **Actor:** User
* **Precondition:** `Shell.IsProjectOpen == false` (Blank state)
* **Trigger:** User clicks **Open Project** button.

#### S1 (Main) — User Selects Saved Project
1. User clicks **Open Project**. *CanExecute:* `!IsBusy && !IsProjectOpen` $\rightarrow$ `true`.
2. ViewModel instantiates `OpenProjectDialogViewModel` and presents it as a modal dialog.
3. Dialog `LoadCommand` executes on initialization: sets `IsLoading = true` $\rightarrow$ calls `ProjectStore.listProjects()` (reads metadata index only).
4. Dialog ViewModel transforms results to `ProjectSummaryVM[]` (`Id`, `Name`, `SourceType`, `TableCount`, `UpdatedAt`) and sets `AvailableProjects`; sets `IsLoading = false`.
5. View renders project list. User selects a row $\rightarrow$ updates `SelectedProject` via two-way binding.
6. User clicks **Open** $\rightarrow$ triggers `ConfirmCommand.Execute()`. *CanExecute:* `SelectedProject != null` $\rightarrow$ `true`.
7. Dialog ViewModel calls `ProjectService.load(SelectedProject.Id)`.
8. `ProjectService` invokes `ProjectStore.loadFull(id)` $\rightarrow$ reads full project, table metadata, and underlying structure from disk $\rightarrow$ reconstructs domain objects.
9. `ProjectService` assigns `activeProject = project` and returns project instance.
10. Modal dialog closes returning `result = project`.
11. `ShellViewModel` receives result $\rightarrow$ populates `CurrentProject = ProjectViewModel.from(project)` and resets `IsBusy = false`.
12. View renders active `ProjectView`.

* **Postcondition:** Selected project loaded into session and active in UI.

#### S2 (Alt) — No Saved Projects Exist
* **Steps 1–3:** Same as S1.
* **Step 4:** `ProjectStore.listProjects()` returns empty array (`AvailableProjects = []`).
* **Step 5:** Dialog renders empty state message (*"No saved projects yet"*). `ConfirmCommand` remains disabled.
* **Step 6:** User exits via **Cancel** button (`CancelCommand`).

#### S3 (Alt) — User Cancels Dialog
1. User clicks **Cancel** in modal dialog.
2. `CancelCommand.Execute()` runs $\rightarrow$ dialog closes with `result = null`.
3. `ShellViewModel` evaluates `result == null` $\rightarrow$ `CurrentProject` remains `null`, `IsBusy = false`.

#### S4 (Exception) — Stored Project Data Missing/Corrupt
* **Steps 1–7:** Same as S1.
* **Step 8:** `ProjectStore.loadFull(id)` throws exception (e.g., source metadata missing, corrupt file index).
* **Step 8':** Dialog ViewModel catches exception, sets `Dialog.ErrorMessage`, and keeps modal dialog open. User can select a different project or cancel.

---

### UC3 — Close Active Project

* **Actor:** User
* **Precondition:** `Shell.IsProjectOpen == true` (Project actively loaded)
* **Trigger:** User clicks **Close Project** button.

#### S1 (Main) — Successful Close
1. User clicks **Close Project**. *CanExecute:* `IsProjectOpen` $\rightarrow$ `true`.
2. ViewModel calls `ProjectService.close(Shell.CurrentProject.Id)`.
3. `ProjectService` updates metadata (e.g., `lastClosedAt`) and executes `ProjectStore.save(project)`.
4. Store write succeeds $\rightarrow$ `ProjectService` clears its `activeProject` reference. In-memory data structures are released for garbage collection.
5. ViewModel sets `Shell.CurrentProject = null`.
6. View updates: `IsProjectOpen` evaluates to `false` $\rightarrow$ UI transitions back to blank shell view.

* **Postcondition:** No active project in memory; project remains safely stored in `Project Store`.

#### S2 (Exception) — Metadata Write Fails on Close
1. User clicks **Close Project**. ViewModel sets `Shell.IsBusy = true`.
2. `ProjectService.close()` attempts `ProjectStore.save(project)` $\rightarrow$ throws `StoreWriteError` (e.g., disk full, write permissions denied).
3. `activeProject` reference is preserved in `ProjectService`; `Shell.CurrentProject` remains populated so no context or state is lost.
4. `ProjectService` rethrows exception to ViewModel.
5. ViewModel catch block opens modal dialog `CloseFailureDialogViewModel`:
   * **Fields:** `Message` (error details), `IsBusy` (operation state flag).
   * **`SaveAndCloseCommand`:** Retries `project.save()` followed by `project.close()`. If successful, closes dialog with `result = "closed"`. On failure, dialog remains open and updates `Message`.
   * **`CloseWithoutSavingCommand`:** Invokes `ProjectService.forceClose(project.Id)`, skipping persistent updates and clearing memory directly. Closes dialog with `result = "closed"`.
   * **`CancelCommand`:** Aborts close attempt and closes dialog with `result = "cancelled"`.
6. `ShellViewModel` processes dialog result:
   * **`"closed"`:** Sets `CurrentProject = null`, `IsBusy = false` $\rightarrow$ renders blank workspace.
   * **`"cancelled"`:** Resets `IsBusy = false`; project stays open with active UI fully interactive.

* **Postcondition:** Project is either cleanly closed (with or without saving metadata) or retained open in its exact state.