# Sprint Specification: Use Case Scenarios (Sprint 2)

## 1. Scope & Inventory Overview

This specification details the formal use case scenarios for **Sprint 2: Read-Only Virtualized DataFrame Workspace**. Building upon the foundation of Sprint 1 (Project/Table load and container persistence), Sprint 2 establishes the interaction flows for inspecting table data through a paginated, virtualized grid.

### Use Case Inventory

| Use Case ID | Title | Scenarios & Exceptions Covered |
| :--- | :--- | :--- |
| **UC5** | **Select Table Tab** | **S1 (Main):** Load page $0$ of selected table<br>**S2 (Alt):** Rapid tab switching / request cancellation<br>**S3 (Exception):** Table data read failure (`StoreReadError`) |
| **UC6** | **Navigate Grid Pagination** | **S1 (Main):** Next page navigation & index offset recalibration<br>**S2 (Main):** Previous page navigation<br>**S3 (Alt):** Boundary bounds & control disabling<br>**S4 (Exception):** Page fetch failure mid-navigation |
| **UC7** | **Non-Mutating Cell Inspection** | **S1 (Main):** Cell & row click selection<br>**S2 (Alt):** Keyboard arrow navigation<br>**S3 (Alt):** Edit prevention on double-click / keypress |

---

## 2. Detailed Use Case Flows

### UC5 — Select Table Tab

* **Actor:** User
* **Precondition:** `Shell.SessionState == ProjectOpen` and active project contains at least one table.
* **Trigger:** User clicks a table tab in the workspace tab bar (`SelectTableCommand(tableId)`).

```
[Tab Clicked] ---> SelectTableCommand(tableId)
                        |
            Instantiate / Swap TableViewModel
                        |
            getTablePageAsync(projectId, tableId, pageIndex: 0, pageSize: 50)
                        |
      +-----------------+-----------------+
      |                                   |
  [Success]                           [Failure]
      |                                   |
Populate Columns & Row Slice $0..49$     Display Error Banner on Grid
```

#### Scenarios & Executions

* **S1 (Main — Load Page $0$):**
  1. User clicks a table tab (e.g., `Customers` sheet).
  2. `ProjectViewModel` triggers `SelectTableCommand(tableId)`.
  3. Active `TableViewModel` is instantiated or swapped into view.
  4. VM issues request: `ProjectService.getTablePageAsync(projectId, tableId, pageIndex: 0, pageSize: 50)`.
  5. `ProjectStore.readTablePageAsync()` reads row slice $0 \dots 49$ and table column metadata from the `.pipeforge` container.
  6. Grid headers populate column names and inferred data types (e.g., `Age (Int64)`), explicitly omitting spreadsheet letter headers ($A, B, C$).
  7. Leftmost fixed row index renders $0$-based indices ($0, 1, 2, \dots, 49$).
  8. Virtualized viewport renders row data.

* **S2 (Alt — Rapid Tab Switch / Cancellation):**
  1. User clicks Tab A, then rapidly clicks Tab B before Tab A's data slice fetch completes.
  2. Async fetch for Tab A is canceled/disregarded by the VM.
  3. VM sets active state to Tab B and issues `getTablePageAsync()` for Tab B at page $0$.
  4. Workspace updates cleanly to Tab B without race condition flickering.

* **S3 (Exception — Table Data Read Failure):**
  1. `ProjectService.getTablePageAsync()` throws `StoreReadError` or `TableNotFoundError` (e.g., corrupted container or missing partition file).
  2. `TableViewModel` catches exception, sets `ErrorMessage` field, and clears `Rows`.
  3. Grid viewport displays an inline error banner with a "Retry" button.
  4. `Shell.SessionState` remains `ProjectOpen`; user can switch to other valid table tabs without crashing the workspace.

---

### UC6 — Navigate Grid Pagination

* **Actor:** User
* **Precondition:** `Shell.SessionState == ProjectOpen`, active table selected with row count $TotalRowCount > 0$.
* **Trigger:** User interacts with pagination controls (Next Page / Previous Page buttons).

```
[Next / Prev Clicked] ---> Check CanExecute Bounds
                                  |
                      Update PageIndex (0-based)
                                  |
              getTablePageAsync(projectId, tableId, pageIndex, pageSize)
                                  |
            Recalibrate Row Index Offset: $PageIndex \times PageSize$
```

#### Scenarios & Executions

* **S1 (Main — Next Page Navigation):**
  1. User clicks **Next Page** button (`NextPageCommand()`).
  2. `NextPageCommand.CanExecute` verifies `(PageIndex + 1) * PageSize < TotalRowCount`.
  3. `PageIndex` increments ($PageIndex \leftarrow PageIndex + 1$).
  4. VM invokes `ProjectService.getTablePageAsync(projectId, tableId, PageIndex, PageSize)`.
  5. Store returns requested page slice.
  6. Grid updates rendered rows. The fixed row index offset recalibrates to $PageIndex \times PageSize$ (e.g., for $PageIndex = 1$ and $PageSize = 50$, index column displays $50, 51, 52, \dots, 99$).

* **S2 (Main — Previous Page Navigation):**
  1. User clicks **Previous Page** button (`PrevPageCommand()`).
  2. `PrevPageCommand.CanExecute` verifies `PageIndex > 0`.
  3. `PageIndex` decrements ($PageIndex \leftarrow PageIndex - 1$).
  4. VM fetches previous row slice and recalibrates fixed row index offset.

* **S3 (Alt — Boundary Bounds & Control Disabling):**
  1. At $PageIndex = 0$, `PrevPageCommand.CanExecute` evaluates to `false` $\rightarrow$ **Previous Page** button is disabled.
  2. On the last page ($PageIndex + 1 \ge \lceil TotalRowCount / PageSize \rceil$), `NextPageCommand.CanExecute` evaluates to `false` $\rightarrow$ **Next Page** button is disabled.
  3. Pagination metadata label updates dynamically: `Page X of Y (Rows A - B of Total)`.

* **S4 (Exception — Slice Read Failure Mid-Navigation):**
  1. Store read fails during page navigation, throwing `StoreReadError`.
  2. `PageIndex` reverts to previous valid index.
  3. Inline error notification displays on pagination control bar without clearing already loaded viewport data.

---

### UC7 — Non-Mutating Cell Inspection

* **Actor:** User
* **Precondition:** Workspace grid actively rendering row data.
* **Trigger:** User clicks a cell/row or navigates via keyboard.

#### Scenarios & Executions

* **S1 (Main — Cell & Row Selection):**
  1. User clicks cell at grid coordinate $(Row, Column)$.
  2. Grid sets active visual highlight border around the targeted cell and highlights the corresponding fixed row index label.
  3. Active cell value and coordinate details are exposed in the ViewModel's selection tracking properties for read-only status display.

* **S2 (Alt — Keyboard Navigation):**
  1. User uses Arrow keys ($\uparrow, \downarrow, \leftarrow, \rightarrow$) to move selection focus.
  2. Visual selection indicator shifts smoothly across cells. Viewport auto-scrolls if focus moves beyond visible edge rows/columns.

* **S3 (Alt — Edit Interception & Non-Mutating Safeguard):**
  1. User double-clicks a cell or presses alphanumeric keys, `Enter`, `Delete`, or `Backspace`.
  2. Grid handles input events silently: no inline text input editor is spawned, no value mutation triggers exist, and no domain state is altered.
  3. Active visual selection box remains intact on the unchanged cell value.

---

## 3. Explicit Out-of-Scope Behavioral Invariants

To maintain strict scope control for Sprint 2, the following rules are enforced across all use cases:
1. **No Data Mutations:** Cell values, row definitions, and schema metadata are strictly read-only.
2. **No Spreadsheet Lettering:** Headers must exclusively display domain column names and inferred data types (e.g., `Header (Type)`).
3. **No In-Memory Full Loads:** Large datasets must never be loaded entirely into ViewModel memory; data access is restricted to paged slices via `getTablePageAsync`.