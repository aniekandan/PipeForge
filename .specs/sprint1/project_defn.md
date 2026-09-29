# Sprint Specification: File Loading & Project Domain Model

## 1. Sprint Scope (Agile Stories)

### **Epic:** Load a file into a Project (No Dataframe UI)

* **US1 — Local File Import**

  * **As a** user,

  * **I want to** import an `.xlsx` or `.csv` file from my local drive,

  * **So that** its data becomes a Project.

  * **Acceptance Criteria (AC):** Given a valid `.xlsx`/`.csv` path, when the import process runs, then a `Project` is created containing the correct `Table`(s).

* **US2 — Multi-sheet XLSX Support**

  * **As a** user,

  * **When I** import a multi-sheet `.xlsx` file,

  * **Then** each sheet becomes its own `Table` inside a single `Project`.

* **US3 — CSV Import**

  * **As a** user,

  * **When I** import a `.csv` file,

  * **Then** the resulting `Project` has exactly one `Table`.

* **US4 — Open Saved Project**

  * **As a** user,

  * **I can** open a previously saved `Project` instead of re-importing source files from scratch.

* **US5 — Close Open Project**

  * **As a** user,

  * **I can** close the open `Project`,

  * **So that** I return to a blank workspace.

* **US6 — Blank Workspace State**

  * **As a** user,

  * **When** no `Project` is currently open,

  * **I see** a blank screen with only two allowed actions: **Open Project** and **Import File**.

### **Out of Scope for This Sprint**

* Grid rendering and data tables

* In-memory cell editing

* Data transforms and filter operations

* *Focus is strictly on structural load, storage, and session lifecycle.*

## 2. Context Diagram (DFD0)

```
graph TD
    User([User])
    System[0.0 DataFrame Project System <br/> single process]
    FS[(Local File System <br/> source .xlsx/.csv + saved project store)]

    User -- "Import File Path" --> System
    User -- "Open Project (select ID)" --> System
    User -- "Close Project" --> System
    System -- "UI State (blank / project + table summaries / errors)" --> User

    System -- "Read Source File Bytes" --> FS
    System -- "Write/Read Project Records" --> FS
    System -- "List Saved Projects" --> FS

```

> **Note:** At the context level, `Local File System` covers both arbitrary imported source files and persistent storage for projects. These can be partitioned into distinct external entities in future iterations if storage transitions to an embedded DB or cloud service.

## 3. Data Model

```
classDiagram
    class Project {
        +string id
        +string name
        +DateTime createdAt
        +DateTime updatedAt
        +SourceType sourceType
        +string sourceFilePath
        +ProjectStatus status
        +static importFromFile(path) Project
        +addTable(table)
        +getTable(id) Table
        +close()
        +save()
        +static load(id) Project
    }

    class Table {
        +string id
        +string projectId
        +string name
        +int? sheetIndex
        +int rowCount
        +DateTime createdAt
    }

    class ColumnDef {
        +string name
        +int index
        +InferredType inferredType
    }

    Project "1" *-- "*" Table : contains
    Table "1" *-- "*" ColumnDef : contains

```

### Domain Notes

1. **Composition Lifecycle:** Both `Project 1---* Table` and `Table 1---* ColumnDef` are strictly compositions. Neither `Table` nor `ColumnDef` exists independently outside its parent owner.

2. **Row Data & In-Memory Dataframe:** Row data is backed by an in-memory **Danfo.js `DataFrame`** inside each `Table`. Dataframe rows and cell values are serialized into the project storage package on save and hydrated on load. `rowCount` is computed directly from the backing dataframe (`df.shape[0]`).

3. **Session State vs Persistence:** `Project.status` represents active session state (`open` / `closed`).

4. **Persistence Package Format (D1):** Each saved project is packaged as a structured container (zip archive):
   - `project.json` (Project metadata: id, name, sourceType, sourceFilePath, status, createdAt, updatedAt, table manifest)
   - `tables/{tableId}/metadata.json` (Table metadata: id, name, sheetIndex, rowCount, columns with index & inferredType)
   - `tables/{tableId}/data.json` (Serialized row/cell records from the Danfo.js dataframe)

5. **Naming & Identity Constraints:**
   - IDs are generated via standard `crypto.randomUUID()`.
   - **No duplicate project names allowed:** Attempting to import or save a project whose name matches an existing project in the store triggers `DuplicateProjectNameError`.

## 4. ViewModel Specifications

### 1. `ShellViewModel` *(Root)*

Serves as the main window controller managing top-level workspace state.

| Type | Name | Details / Rules | 
 | ----- | ----- | ----- | 
| **Field** | `CurrentProject` | `ProjectViewModel?` — Syncs with `ProjectService.activeProject`; `null` indicates blank state. | 
| **Field** | `IsProjectOpen` | `bool` (Computed) — True when `CurrentProject != null`. | 
| **Field** | `IsBusy` | `bool` — Set to true/false around async command execution. | 
| **Field** | `ErrorMessage` | `string?` — Captures last failure message from import or load operations. | 
| **Command** | `ImportFileCommand` | Opens native OS file dialog (`.xlsx`, `.csv`).*CanExecute:* `!IsBusy`*Flow:* On path selection $\rightarrow$ `ProjectService.importFromFile(path)` $\rightarrow$ sets `CurrentProject`. | 
| **Command** | `OpenProjectCommand` | Launches `OpenProjectDialogViewModel` modal dialog.*CanExecute:* `!IsBusy`*Flow:* On dialog result (`Project?`) $\rightarrow$ sets `CurrentProject` if non-null. | 
| **Command** | `CloseProjectCommand` | Closes active project.*CanExecute:* `IsProjectOpen`*Flow:* `ProjectService.close(CurrentProject.Id)` $\rightarrow$ resets `CurrentProject = null`. | 

### 2. `OpenProjectDialogViewModel` *(Modal Dialog)*

Manages saved project selection from store metadata without loading heavy dataframes.

| Type | Name | Details / Rules | 
 | ----- | ----- | ----- | 
| **Field** | `AvailableProjects` | `ProjectSummaryVM[]` — Sync source: `ProjectStore.listProjects()`. | 
| **Field** | `SelectedProject` | `ProjectSummaryVM?` — Holds current user selection in UI. | 
| **Field** | `IsLoading` | `bool` — True during project list fetch. | 
| **Command** | `LoadCommand` | Triggered on dialog init to fetch `AvailableProjects`. | 
| **Command** | `ConfirmCommand` | *CanExecute:* `SelectedProject != null`*Flow:* Calls `ProjectService.load(SelectedProject.Id)` $\rightarrow$ closes dialog with `Project` payload. | 
| **Command** | `CancelCommand` | Closes dialog with `null` payload. | 

#### Projection Type: `ProjectSummaryVM`

Lightweight metadata for picker lists: `Id`, `Name`, `SourceType`, `TableCount`, `UpdatedAt`.

### 3. `ProjectViewModel` *(Loaded Project Container)*

Active state visualization once a project is opened (No grid capabilities yet).

| Type | Name | Details / Rules | 
 | ----- | ----- | ----- | 
| **Field** | `Id`, `Name` | Read-only mirrors of `Model.Project.id` / `name`. | 
| **Field** | `Tables` | `TableSummaryVM[]` — Derived list from `Model.Project.tables`. | 
| **Field** | `SourceFilePath` | Display-only mirror of original file path. | 
| **Field** | `SourceType` | Display-only mirror of source type (`xlsx` / `csv`). | 

#### Projection Type: `TableSummaryVM`

Lightweight summary info: `Name`, `SheetIndex?`, `RowCount`, `ColumnCount`.

## 5. Synchronization & Architecture Flow

```
sequenceDiagram
    autonumber
    actor View
    participant VM as ShellViewModel
    participant Service as FileImportService
    participant Store as ProjectStore
    participant FS as Local File System

    View->>VM: Trigger ImportFileCommand
    VM->>View: Open Native File Picker
    View-->>VM: Selected File Path
    VM->>Service: importFromFile(path)
    Service->>FS: Read Raw File Bytes (.xlsx/.csv)
    Service->>Service: Parse Structure & Build Project Domain Object
    Service->>Store: save(project)
    Store->>FS: Write Persisted Project Record
    Service-->>VM: Return Project Entity
    VM->>VM: CurrentProject = ProjectVM.from(project)
    VM-->>View: PropertyChanged(CurrentProject) [UI Renders]

```

### **Binding & Architectural Rules**

1. **View** $\leftrightarrow$ **ViewModel:**

   * **Two-way binding:** Applied to editable inputs (e.g., `SelectedProject` in dialogs).

   * **One-way binding:** Applied to computed or display-only attributes (`IsProjectOpen`, `Tables`).

   * **Command binding:** Drives user interactions and actions (`CanExecute` controls button state).

2. **ViewModel** $\leftrightarrow$ **Service Layer:**

   * ViewModels must **never** directly access the file system, disk stores, or dataframes.

   * ViewModels consume `ProjectService` (which encapsulates `FileImportService` and `ProjectStore`), invoke high-level workflow methods, and transform returned domain models into UI projections (`ProjectSummaryVM`, `TableSummaryVM`).

3. **Service Layer** $\leftrightarrow$ **Data Source:**

   * `FileImportService` handles raw byte ingestion and parsing from user-selected paths.

   * `ProjectStore` explicitly isolates persistence logic (reading/writing project indexes and metadata), remaining decoupled from raw source file parsing.