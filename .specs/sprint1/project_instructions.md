# Architecture Constitution & Engineering Instructions

> **Discipline Mandate:**  
> The system must remain strictly **modular, decoupled, and compliant with SOLID principles**. Monolithic creep, layer skipping, or ad-hoc patches directly violate this architecture. Any bug fix or feature enhancement must respect layer boundaries and communicate strictly through defined interfaces and DTO contracts so that already-working code is never destabilized.

---

## 1. Complete SOLID Principles Application

The application strictly implements all five SOLID design principles across all four architectural tiers and intra-layer modules:

### 1.1 Single Responsibility Principle (SRP)
* Each class and module has one, and only one, reason to change:
  - **Views:** Only responsible for declarative JSX rendering and dispatching user intent to ViewModels. Zero business logic.
  - **ViewModels:** Only responsible for UI state machines, observable notification, and command validation guards.
  - **Services:** Dedicated to specific domain workflows (e.g. `FileImportService` parses files; `ProjectService` orchestrates project entity lifecycle; `UniversalFilePickerService` accesses platform file dialogs).
  - **Persistence:** `ZipPackageCodec` only handles zip serialization; `IndexedDBProjectStore` only handles storage I/O.

### 1.2 Open/Closed Principle (OCP)
* Modules are open for extension, but closed for modification:
  - New storage engines (e.g., `IndexedDBProjectStore`, `ElectronFsProjectStore`, `CloudProjectStore`) are added by implementing `IProjectStore` without modifying existing store classes or service consumers.
  - New file formats (e.g., `.parquet`, `.json`) are added by plugging new parser strategies into `FileImportService` without altering `ProjectService` or the UI.

### 1.3 Liskov Substitution Principle (LSP)
* Any implementation of an interface can be substituted seamlessly without breaking calling code:
  - `IndexedDBProjectStore`, `ZipProjectStore`, and mock stores can be interchanged anywhere `IProjectStore` is expected.
  - Any `IFilePickerService` implementation (`UniversalFilePickerService`, `MockFilePickerService`) behaves identically with respect to the `FileDescriptor | null` contract.

### 1.4 Interface Segregation Principle (ISP)
* Clients should not be forced to depend on methods they do not use:
  - Contracts are fine-grained and specialized:
    - `IFilePickerService`: strictly `pickFile(filters)`.
    - `IProjectStore`: strictly `save(record)`, `loadRecord(id)`, `listProjects()`, `existsByName(name)`.
    - `IProjectService`: high-level lifecycle orchestrations without exposing low-level byte manipulation.

### 1.5 Dependency Inversion Principle (DIP)
* High-level modules do not depend on low-level modules; both depend on abstractions:
  - `ShellViewModel` depends on `IProjectService` and `IFilePickerService` abstractions, not concrete implementations.
  - `ProjectService` depends on the `IProjectStore` abstraction, not concrete IndexedDB or LocalStorage classes.
  - Dependency injection is managed cleanly at the composition root (`AppContext.tsx` / `ProjectStoreFactory`).

---

## 2. Architectural Foundation: Layered MVVM & Boundary Enclosure

The application strictly adheres to a 4-tier decomposed architecture:

```
[ User / OS ]
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ 1.0 View Layer (React UI Components)                   │
│   • Renders UI based on Observable ViewModel state.    │
│   • Captures user intent and invokes VM commands.      │
│   • Purely declarative; zero business/parsing logic.   │
└────────────────────────────────────────────────────────┘
      │  (Events / Commands / Observability Subscriptions)
      ▼
┌────────────────────────────────────────────────────────┐
│ 2.0 ViewModel Layer (MVVM State Machines)              │
│   • Holds presentation state and command guards.       │
│   • Subscribable (`subscribe` / `notify`).             │
│   • Coordinates workflows via injected Service APIs.   │
│   • NO direct storage calls, NO DOM access.            │
└────────────────────────────────────────────────────────┘
      │  (Domain Entities, DTOs, Injected Interfaces)
      ▼
┌────────────────────────────────────────────────────────┐
│ 3.0 Service Layer (Domain Logic & Ingestion Facades)   │
│   • Orchestrates entity lifecycle (ProjectService).    │
│   • Parses workbooks & computes schemas (FileImport).  │
│   • Enforces domain validation & duplicate rules.      │
└────────────────────────────────────────────────────────┘
      │  (ProjectRecordDTO, ProjectSummaryDTO)
      ▼
┌────────────────────────────────────────────────────────┐
│ 4.0 Persistence Layer (Pluggable Store Engines)        │
│   • Implements `IProjectStore` interface.              │
│   • Serializes/deserializes project packages.          │
│   • Completely swappable without touching VM or Views. │
└────────────────────────────────────────────────────────┘
```

---

## 2. Information Passing & Layer Isolation Rules

1. **No-Skip Boundary Rule:**  
   Data flows only between adjacent tiers:
   $$\text{View} \longleftrightarrow \text{ViewModel} \longleftrightarrow \text{Service} \longleftrightarrow \text{Persistence}$$
   - Views **never** talk directly to Services or Persistence Stores.
   - ViewModels **never** import storage classes or bypass `IProjectService`.
   - Domain logic **never** imports React components, hooks, or browser UI APIs.

2. **Inversion of Control (IoC) & Interface Contracts:**  
   All cross-boundary interactions must depend on abstractions:
   - `IFilePickerService`: Abstract platform dialogs (`pickFile(filters): Promise<FileDescriptor | null>`).
   - `IProjectService`: Abstract project lifecycle (`importFromFile`, `load`, `close`, `listProjectSummaries`).
   - `IProjectStore`: Abstract storage engine (`save`, `loadRecord`, `listProjects`, `existsByName`).

3. **Data Transfer Objects (DTOs) vs. Domain Entities:**  
   - Persistence operations strictly pass **plain DTOs** (`ProjectRecordDTO`, `TableRecordDTO`) across boundaries to prevent domain methods from leaking into storage serialization.
   - Presentation states use **ViewModels** (`ProjectViewModel`, `TableSummaryVM`).

---

## 3. Modular Solution Blueprint for File Import & Storage Issues

To resolve issues like the 14 MB spreadsheet import without breaking working code, use the following modular patterns:

### Subsystem A: `IFilePickerService` (Eliminate Premature Cancel)
* **Root Cause of Failure:**  
  A monolithic picker implementation that binds `window.focus` with an arbitrary 300ms timeout misinterprets active OS dialog browsing as user cancellation.
* **Modular Solution:**  
  1. Decompose into distinct strategy classes implementing `IFilePickerService`:
     - `ElectronFilePicker`: Directly uses IPC `showOpenDialog` when in the desktop container.
     - `BrowserFilePicker`: Uses modern HTML5 `<input type="file">` with the standardized `'cancel'` event listener (available in all modern browsers) rather than fragile `focus` polling.
  2. **ViewModel State Timing:**  
     `ShellViewModel.executeImportFile()` must **not** set `SessionState.Importing` until the file picker resolves a valid `FileDescriptor`. While the picker dialog is open, the shell stays in `SessionState.Idle` (or enters a distinct transient `SessionState.PickingFile`).

### Subsystem B: `IProjectStore` (Eliminate 5 MB LocalStorage Ceiling)
* **Root Cause of Failure:**  
  `localStorage` has a hard 5 MB quota. A 14 MB spreadsheet converted to Base64 zip exceeds 20 MB, throwing `QuotaExceededError`.
* **Modular Solution (Zero Breaking Changes):**  
  Do **not** modify working business logic in `ProjectService`. Instead, leverage the pluggability of `IProjectStore`:
  1. **`IndexedDBProjectStore` (Browser Target):**  
     Implements `IProjectStore` using the browser's native IndexedDB API. IndexedDB supports **hundreds of megabytes / gigabytes** of binary storage with zero external dependencies.
  2. **`ElectronFsProjectStore` (Desktop Target):**  
     Implements `IProjectStore` by saving `.dfproj` zip packages directly to the user's OS file system (`app.getPath('userData')/projects/`).
  3. **`ProjectStoreFactory`:**  
     Detects the environment (`window.electronAPI` vs. Browser) and injects the corresponding `IProjectStore` implementation into `ProjectService`. Existing tests and fixtures continue using `ZipProjectStore` (or `MockProjectStore`) seamlessly.

### Subsystem C: Streaming / Chunked Spreadsheet Parsing
* **Root Cause of Performance Drag:**  
  Parsing 14 MB (millions of cells) on the main UI thread blocks rendering.
* **Modular Solution:**  
  - Encapsulate workbook reading inside `FileImportService`.
  - For large datasets, parse worksheet rows in streaming batches or offload to a Web Worker, posting progress events back to `FileImportService` without altering `ProjectService` or ViewModel signatures.

---

## 4. Golden Rules for Developers & AI Models

1. **Open for Extension, Closed for Modification (OCP):**  
   When adding storage backends or platform capabilities, create new classes implementing existing interfaces. Do not rewrite working methods.
2. **Never Touch Test Harness Fixtures:**  
   Keep `SampleFilesBar` and test scenarios working. They verify UC1–UC4 compliance.
3. **Keep Views Declarative:**  
   If a button needs logic, write a command method on the ViewModel with a corresponding `canExecute` boolean getter.
4. **Log Errors Gracefully:**  
   Always map unexpected errors into typed `AppError` subclasses (`UnsupportedFileTypeError`, `EmptyDataError`, `StoreWriteError`) so the ViewModel error banner displays actionable user feedback.
