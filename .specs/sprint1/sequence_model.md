# Sprint Specification: Level-1 DFD & Architecture Contracts

## 1. Context & Architecture Rules

This specification defines **Level-1 DFD (DFD1)**, exploding process `0.0` into distinct subsystems, establishing explicit interface contracts between boundaries, and mapping end-to-end data flows.

### Structural Discipline & Boundary Constraints

1. **DFD Leveling:** Process `0.0` is decomposed into constituent layer processes (`1.0 View`, `2.0 ViewModel`, `3.0 Service`, `4.0 Persistence`).
2. **Strict Boundary Enclosure:** A subsystem is defined entirely by what flows across its boundaries. No internal implementation details are leaked or accessed across layers.
3. **No-Skip Boundary Rule:** Data flows may only cross adjacent boundary walls (e.g., `View` $\rightarrow$ `ViewModel` $\rightarrow$ `Service` $\rightarrow$ `Persistence`). Direct cross-layer skipping (e.g., `View` $\rightarrow$ `Service` or `ViewModel` $\rightarrow$ `Persistence`) is strictly forbidden.
   * *Documented Exception:* `2.0 ViewModel` $\leftrightarrow$ `Platform File Picker` via dependency injection (`IFilePickerService`), keeping platform dialog invocation decoupled from UI views and testable in isolation.
4. **Data Store vs External Entity Partitioning:** 
   * **`Local File System` (External Entity):** Unmanaged arbitrary source files (`.xlsx`, `.csv`) residing outside system ownership.
   * **`D1: Project Store` (Data Store):** App-owned persisted project and table records managed exclusively by `4.0 Persistence`.

---

## 2. Level-1 Data Flow Diagram (DFD1)

```mermaid
flowchart TD
    User([User])

    subgraph AppProcess ["Process 0.0 DataFrame Project System"]
        View["1.0 View / UI Layer<br/>(Renders Screens 1-4)"]
        VM["2.0 ViewModel Layer<br/>(Shell / Project / Dialog VMs)"]
        Service["3.0 Service Layer<br/>(ProjectServiceFacade & FileImportService)"]
        Store["4.0 Persistence Layer<br/>(ProjectStore)"]
        D1[("D1: Project Store<br/>(Persisted Records)")]
    end

    ExtPicker["Platform File Picker<br/>(OS External Service)"]
    ExtFS[/"Local File System<br/>(Source .xlsx/.csv Files)"/]

    %% Interactions
    User -- "UI Events (clicks, edits)" --> View
    View -- "Bound State / Error Display" --> User

    View -- "Command Invocations" --> VM
    VM -- "Bound Properties & State" --> View

    VM -- "pickFile(filters)" --> ExtPicker
    ExtPicker -- "file path | null" --> VM

    VM -- "Typed Async Calls" --> Service
    Service -- "Project / ProjectSummary DTOs / Errors" --> VM

    Service -- "Read Source Bytes" --> ExtFS
    ExtFS -- "Raw Bytes" --> Service

    Service -- "save / load / list" --> Store
    Store -- "Domain Entities / Summaries" --> Service

    Store -- "Write / Read Records" --> D1
    D1 -- "Stored Metadata & Tables" --> Store
```

---

## 3. Boundary Subsystem Contracts

Contracts define the **exact surface area** exposed between adjacent subsystems. Nothing outside these explicitly defined signatures may be imported, invoked, or referenced.

### 1.0 View ↔ 2.0 ViewModel Contract

* **View Reads (One-Way / Bound):**
  * `SessionState`, `CurrentProject`, `ErrorMessage`
  * Dialog-specific fields: `AvailableProjects`, `SelectedProject`, `IsLoading`, `Message`
* **View Writes (Invocations):**
  * Invokes ViewModel commands: `ImportFileCommand`, `OpenProjectCommand`, `CloseProjectCommand`
  * Dialog commands: `ConfirmCommand`, `CancelCommand`, `SaveAndCloseCommand`, `CloseWithoutSavingCommand`
  * Two-way bound fields strictly limited to UI input bindings (e.g., `SelectedProject`).
* **Invariants & Restrictions:**
  * View **must never** reference or import the Service or Persistence layers.
  * View **must never** instantiate or hold domain entities (`Project`, `Table`).

---

### 2.0 ViewModel ↔ 3.0 Service Contract (`ProjectService` Facade)

```typescript
interface IProjectService {
  importFromFile(path: string): Promise<Project>;
  // Throws: UnsupportedFileTypeError | ParseError | EmptyDataError

  load(id: string): Promise<Project>;
  // Throws: ProjectNotFoundError | StoreReadError

  close(id: string): Promise<void>;
  // Throws: StoreWriteError

  forceClose(id: string): void;
  // Memory-only cleanup; never throws

  listProjectSummaries(): Promise<ProjectSummaryVM[]>;
}
```

* **Invariants & Restrictions:**
  * ViewModel **must never** import or instantiate `FileImportService` or `ProjectStore` directly. `ProjectService` acts as the single entry point.
  * Mapping domain models (`Project`) to ViewModel representations (`ProjectViewModel`, `TableSummaryVM`) occurs exclusively on the ViewModel side of the boundary.

---

### 3.0 Service ↔ 4.0 Persistence Contract (`ProjectStore`)

```typescript
interface IProjectStore {
  save(project: Project): Promise<void>;
  // Throws: StoreWriteError

  loadFull(id: string): Promise<Project>;
  // Throws: StoreReadError

  listProjects(): Promise<ProjectSummaryVM[]>;
  // Throws: StoreReadError
}
```

* **Invariants & Restrictions:**
  * `ProjectStore` **must never** reference ViewModel types or UI concepts.
  * `ProjectStore` speaks purely in domain models and persistence DTOs.

---

### 3.0 Service ↔ External Local File System (`FileImportService`)

```typescript
// Internal helper within 3.0 Service boundary — not exposed to 2.0 ViewModel
interface IFileImportService {
  parse(path: string): Promise<Project>;
  // Throws: UnsupportedFileTypeError | ParseError | EmptyDataError
}
```

* **Invariants & Restrictions:**
  * OS/IO exceptions must be caught and converted into strongly-typed domain errors before crossing into `ProjectService`.

---

### 2.0 ViewModel ↔ Platform File Picker *(Documented Layer-Skip Exception)*

```typescript
interface IFilePickerService {
  pickFile(filters: string[]): Promise<string | null>;
}
```

* **Invariants & Restrictions:**
  * Injected into `ShellViewModel` via dependency injection to keep ViewModel logic fully testable without launching actual OS native dialogs in headless environments.

---

## 4. End-to-End Sequence Diagram: UC1-S1 Import File Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant View as 1.0 View Layer
    participant VM as 2.0 ViewModel Layer
    participant Picker as Platform File Picker
    participant Service as 3.0 Service Layer
    participant ExtFS as External File System
    participant Store as 4.0 Persistence Layer
    participant D1 as D1: Project Store

    User->>View: Click "Import File"
    View->>VM: ImportFileCommand.Execute()
    VM->>VM: SessionState = Importing
    VM-->>View: PropertyChanged(SessionState) [Renders Screen 1b]

    VM->>Picker: pickFile(["*.xlsx", "*.csv"])
    Picker-->>VM: path | null

    alt UC1-S3: Path is null (User Cancelled)
        VM->>VM: SessionState = Idle
        VM-->>View: PropertyChanged(SessionState) [Renders Screen 1]
    else Path is valid
        VM->>Service: importFromFile(path)
        Service->>ExtFS: Read file bytes(path)
        ExtFS-->>Service: Raw bytes
        Service->>Service: Parse workbook, construct Project & Table[], validate rowCount > 0

        alt UC1-S4 / S5 / S6: Parse or Validation Failure
            Service-->>VM: Throws TypedError (UnsupportedFileType | ParseError | EmptyDataError)
            VM->>VM: ErrorMessage = err.message<br/>SessionState = Idle
            VM-->>View: PropertyChanged [Renders Screen 1 with error]
        else UC1-S1 / S2: Import Success
            Service->>Store: existsByName(project.name)
            Store-->>Service: false (no conflict)
            Service->>Service: ProjectMapper.toDTO(project) -> ProjectRecordDTO
            Service->>Store: save(recordDTO)
            Store->>D1: Write zip package (project.json, tables/metadata.json, tables/data.json)
            D1-->>Store: Confirmation OK
            Store-->>Service: Success
            Service-->>VM: Return Project domain object

            VM->>VM: CurrentProject = ProjectViewModel.from(project)<br/>SessionState = ProjectOpen
            VM-->>View: PropertyChanged [Renders Screen 2]
        end
    end
```

---

## 5. End-to-End Sequence Diagram: UC2 Open Project Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant View as 1.0 View Layer
    participant ShellVM as 2.0 ShellViewModel
    participant DlgVM as 2.0 OpenProjectDialogVM
    participant Service as 3.0 Service Layer
    participant Store as 4.0 Persistence Layer
    participant D1 as D1: Project Store

    User->>View: Click "Open Project"
    View->>ShellVM: OpenProjectCommand.Execute()
    ShellVM->>ShellVM: SessionState = OpeningPicker
    ShellVM->>DlgVM: Instantiate & Show Modal
    
    DlgVM->>DlgVM: LoadCommand.Execute() [IsLoading = true]
    DlgVM->>Service: listProjectSummaries()
    Service->>Store: listProjects()
    Store->>D1: Read index / metadata
    D1-->>Store: Metadata records
    Store-->>Service: ProjectSummaryVM[]
    Service-->>DlgVM: ProjectSummaryVM[]
    DlgVM->>DlgVM: AvailableProjects = results<br/>IsLoading = false
    DlgVM-->>View: PropertyChanged [Renders Screen 3]

    User->>View: Select project row
    View->>DlgVM: SelectedProject = row [Two-way bind]

    alt UC2-S3: User Cancels Dialog
        User->>View: Click "Cancel"
        View->>DlgVM: CancelCommand.Execute()
        DlgVM-->>ShellVM: Dialog Result = null
        ShellVM->>ShellVM: SessionState = Idle
        ShellVM-->>View: PropertyChanged [Renders Screen 1]
    else User Confirms Selection
        User->>View: Click "Open"
        View->>DlgVM: ConfirmCommand.Execute()
        DlgVM->>Service: load(SelectedProject.Id)
        Service->>Store: loadRecord(id)
        Store->>D1: Read and unzip full project package

        alt UC2-S4: Read Failure (Missing / Corrupt)
            D1-->>Store: Exception Error
            Store-->>Service: Throws StoreReadError
            Service-->>DlgVM: Throws StoreReadError
            DlgVM->>DlgVM: Dialog.ErrorMessage = err.message
            DlgVM-->>View: PropertyChanged [Modal stays active, Screen 3 error]
        else UC2-S1: Read Success
            D1-->>Store: ProjectRecordDTO
            Store-->>Service: ProjectRecordDTO
            Service->>Service: ProjectMapper.toDomain(dto) [Hydrates DataFrames & Table[]]
            Service-->>DlgVM: Return Project
            DlgVM-->>ShellVM: Dialog Result = Project
            ShellVM->>ShellVM: CurrentProject = ProjectViewModel.from(project)<br/>SessionState = ProjectOpen
            ShellVM-->>View: PropertyChanged [Renders Screen 2]
        end
    end
```

---

## 6. End-to-End Sequence Diagram: UC3-S2 Close Blocked Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant View as 1.0 View Layer
    participant ShellVM as 2.0 ShellViewModel
    participant DlgVM as 2.0 CloseFailureDialogVM
    participant Service as 3.0 Service Layer
    participant Store as 4.0 Persistence Layer
    participant D1 as D1: Project Store

    User->>View: Click "Close Project"
    View->>ShellVM: CloseProjectCommand.Execute()
    ShellVM->>ShellVM: SessionState = Closing
    ShellVM->>Service: close(CurrentProject.Id)
    Service->>Store: save(project) [Metadata touch]
    Store->>D1: Write records
    D1-->>Store: StoreWriteError (Disk full / Permission denied)
    Store-->>Service: Throws StoreWriteError
    Service-->>ShellVM: Throws StoreWriteError [activeProject retained in memory]

    ShellVM->>ShellVM: SessionState = CloseBlocked
    ShellVM->>DlgVM: Instantiate & Show Modal (Message = err.message)
    DlgVM-->>View: Rendered [Screen 4 Modal over Screen 2]

    alt Save & Close Succeeds
        User->>View: Click "Save & Close"
        View->>DlgVM: SaveAndCloseCommand.Execute()
        DlgVM->>DlgVM: IsBusy = true
        DlgVM->>Service: save(project) & close(project.Id)
        Service->>Store: save(project)
        Store->>D1: Write records
        D1-->>Store: Write OK
        Store-->>Service: Success
        Service-->>DlgVM: Success [activeProject cleared]
        DlgVM-->>ShellVM: Dialog Result = "closed"
        ShellVM->>ShellVM: CurrentProject = null<br/>SessionState = Idle
        ShellVM-->>View: PropertyChanged [Renders Screen 1]

    else Save & Close Fails Again
        User->>View: Click "Save & Close"
        View->>DlgVM: SaveAndCloseCommand.Execute()
        DlgVM->>DlgVM: IsBusy = true
        DlgVM->>Service: save(project) & close(project.Id)
        Service->>Store: save(project)
        Store->>D1: Write records
        D1-->>Store: StoreWriteError
        Store-->>Service: Throws StoreWriteError
        Service-->>DlgVM: Throws StoreWriteError
        DlgVM->>DlgVM: Message = new err.message<br/>IsBusy = false
        DlgVM-->>View: PropertyChanged [Modal stays active, error updated]

    else Close Without Saving
        User->>View: Click "Close Without Saving"
        View->>DlgVM: CloseWithoutSavingCommand.Execute()
        DlgVM->>Service: forceClose(project.Id) [Memory-only cleanup]
        Service-->>DlgVM: Success [activeProject cleared]
        DlgVM-->>ShellVM: Dialog Result = "closed"
        ShellVM->>ShellVM: CurrentProject = null<br/>SessionState = Idle
        ShellVM-->>View: PropertyChanged [Renders Screen 1]

    else User Cancels
        User->>View: Click "Cancel"
        View->>DlgVM: CancelCommand.Execute()
        DlgVM-->>ShellVM: Dialog Result = "cancelled"
        ShellVM->>ShellVM: SessionState = ProjectOpen
        ShellVM-->>View: PropertyChanged [Renders Screen 2, Close button re-enabled]
    end
```