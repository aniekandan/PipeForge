# Sprint 2: Sequence Diagrams & Data Grid Interactions

## 1. UC6 — Navigate Grid Pagination (Exception Scenario S4)

### 1.1 UC6-S4 Logic & Error Recovery Mechanics

When a page slice fetch fails during pagination navigation (e.g., corrupted chunk or storage read error), the workspace must recover gracefully without clearing the currently visible data or corrupting the `PageIndex` state.

1. **State Preservation:** Prior to firing the asynchronous fetch, `TableViewModel` caches the active `PageIndex` as `previousPageIndex`.
2. **Rollback & Error Ordering:** If `IProjectService.GetTablePageAsync` throws a `StoreReadError`, `TableViewModel` immediately reverts `PageIndex` to `previousPageIndex` **before** setting `ErrorMessage`.
3. **Retry Invariant:** Because `PageIndex` is rolled back before setting the error state, executing `ReloadPageCommand` (bound to the **Retry** button) automatically re-fetches the page the user was already viewing. No special-casing or retry-target parameters are required.
4. **Viewport Safeguard:** Unhandled exceptions leave existing `Rows` and `Columns` collections untouched, ensuring the user never faces an empty grid mid-session.

---

### 1.2 UC6-S4 Sequence Diagram — Page Fetch Failure Mid-Navigation

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant View as 1.0 View (Grid Viewport)
    participant TabVM as 2.0 TableViewModel
    participant Service as 3.0 ProjectService
    participant Store as 4.0 ProjectStore
    participant Container as D1 (.pipeforge Package)

    User->>View: Clicks "Next Page >"
    View->>TabVM: NextPageCommand()
    TabVM->>TabVM: Verify CanExecute: (PageIndex + 1) * PageSize < TotalRowCount
    TabVM->>TabVM: previousPageIndex = PageIndex
    TabVM->>TabVM: PageIndex = PageIndex + 1
    TabVM->>TabVM: IsLoading = true
    TabVM-->>View: PropertyChanged (IsLoading) [Pagination Controls Disabled]

    TabVM->>Service: GetTablePageAsync(projectId, tableId, PageIndex, PageSize)
    Service->>Store: ReadTablePageAsync(projectId, tableId, PageIndex, PageSize)
    Store->>Container: Read chunk slice bytes at offset

    Container-->>Store: Read Failure (Chunk Missing / Corrupt)
    Store-->>Service: Throws StoreReadError
    Service-->>TabVM: Throws StoreReadError

    TabVM->>TabVM: PageIndex = previousPageIndex [Revert Index]
    TabVM->>TabVM: ErrorMessage = "Failed to load page"
    TabVM->>TabVM: IsLoading = false
    TabVM->>TabVM: [Rows/Columns from last successful page retained]
    TabVM-->>View: PropertyChanged (PageIndex, ErrorMessage, IsLoading)
    View-->>User: Renders inline error banner + [Retry]; grid retains prior page rows
```

---

## 2. UC7 — Non-Mutating Cell Inspection

### 2.1 Scenario Logic & Architectural Invariants

* **S1 (Cell & Row Selection):** Clicking a grid cell sets target row and column coordinates in the ViewModel layer. The read-only cell value is evaluated locally from the active `Rows` collection.
* **S2 (Keyboard Navigation & Boundary Policy):** Arrow key navigation recalculates selected coordinates strictly within the bounds of the currently loaded page slice ($0 \le SelectedRowIndex < Rows.Count$). When reaching the bottom or top boundary of a page, selection stops at the edge—keyboard navigation **does not** automatically trigger `NextPageCommand` or `PrevPageCommand`. This maintains decoupling between selection tracking (UC7) and paged data fetches (UC6).
* **S3 (Edit Interception Safeguard):** Double-clicking cells or pressing mutation keys (`Enter`, `Delete`, `Backspace`, alphanumeric characters) is intercepted and discarded at the View layer. No ViewModel commands are raised, no cell editor is spawned, and zero domain mutations occur.
* **Zero Service Layer Calls:** Across all three UC7 scenarios, the Service layer, Store, and storage container are **never** invoked.

---

### 2.2 UC7 Sequence Diagram — Cell Selection, Keyboard Nav & Edit Safeguard

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant View as 1.0 View (Grid Viewport)
    participant TabVM as 2.0 TableViewModel

    Note over User, TabVM: Scenario S1: Cell & Row Selection
    User->>View: Clicks cell at (rowIndex, columnName)
    View->>TabVM: SetSelectedCell(rowIndex, columnName)
    TabVM->>TabVM: SelectedRowIndex = rowIndex
    TabVM->>TabVM: SelectedColumnName = columnName
    TabVM->>TabVM: SelectedCellValue = Rows[rowIndex].GetValue(columnName)
    TabVM-->>View: PropertyChanged (SelectedRowIndex, SelectedColumnName, SelectedCellValue)
    View-->>User: Renders highlight border + read-only status readout
    Note over Service/Store/Disk: Service, Store, and Disk are NEVER invoked

    Note over User, TabVM: Scenario S2: Keyboard Navigation
    User->>View: Presses Arrow Key (Up / Down / Left / Right)
    View->>TabVM: MoveSelection(direction)
    TabVM->>TabVM: Recompute SelectedRowIndex / SelectedColumnName within loaded Rows[]
    Note over TabVM: Selection stops at page boundary (No auto-page-forward)
    TabVM-->>View: PropertyChanged (SelectedRowIndex, SelectedColumnName)
    View-->>User: Selection highlight shifts; viewport auto-scrolls within loaded page

    Note over User, View: Scenario S3: Edit Interception Safeguard
    User->>View: Double-clicks cell OR presses Enter / Delete / Backspace / Alphanumeric key
    View->>View: Capture & discard input event at View layer
    Note over TabVM: No command raised; TableViewModel is never called
    View-->>User: Selection box remains on unchanged cell; no inline editor spawned
```

---

## 3. Extended `TableViewModel` Specification

To support read-only cell tracking and keyboard navigation, `TableViewModel` is extended with the following properties and commands:

| Member Type | Member Name | Type / Signature | Details & Business Rules |
| :--- | :--- | :--- | :--- |
| **Field** | `SelectedRowIndex` | `int?` | Zero-based index of selected row within active `Rows` slice. `null` when no row selected. |
| **Field** | `SelectedColumnName` | `string?` | Column name of active selection. `null` when no cell selected. |
| **Property** | `SelectedCellValue` | `object?` (computed) | Evaluates `Rows[SelectedRowIndex].GetValue(SelectedColumnName)`. Read-only readout source. |
| **Command** | `SetSelectedCellCommand` | `ICommand` (params: `rowIndex`, `colName`) | Sets `SelectedRowIndex` and `SelectedColumnName`. Recalculates `SelectedCellValue`. |
| **Command** | `MoveSelectionCommand` | `ICommand` (param: `direction`) | Recalculates selection indices based on direction arrow. Clamped to $0 \le SelectedRowIndex < Rows.Count$. |

---

## 4. UI Wireframe Additions & Layout Specifications

### 4.1 Screen 2a — Workspace Data Grid with Active Selection & Read-Only Readout

* **Bound ViewModel:** `TableViewModel` (`ActiveTable`)
* **Trigger / Condition:** `SelectedRowIndex != null` and `SelectedColumnName != null`.

```
+-----------------------------------------------------------------------------------+
|  DataFrame Project Tool                                                    [-][x] |
+-----------------------------------------------------------------------------------+
|  Project: "Sales_Analysis.pipeforge"                        +------------------+  |
|                                                             |  Close Project   |  |
|                                                             +------------------+  |
+-----------------------------------------------------------------------------------+
|  Tab Bar:  [ [x] Customers ]  ( ) Orders   ( ) LineItems                          |
+-----------------------------------------------------------------------------------+
| Index | Customer_ID (Int64) | Full_Name (String)    | Lifetime_Value (Float64) |  |
|=======|=====================|=======================|==========================|  |
| 50    | 1051                | Alice Smith           | 1240.50                  |  |
| 51    | 1052                | Bob Jones             | 890.00                   |  |
| 52    | 1053                |[Carol Danvers        ]| 4320.10                  |  |  <- Active Selection
| ...   | ...                 | ...                   | ...                      |  |     [row 52, Full_Name]
| 99    | 1100                | David Miller          | 150.25                   |  |
+-----------------------------------------------------------------------------------+
|  Selected Cell: Row 52, Column: Full_Name | Value: "Carol Danvers" (String)        |  <- Read-Only Status Bar
+-----------------------------------------------------------------------------------+
|  [< Prev Page]   Page 2 of 25  (Rows 51 - 100 of 1204)   [Next Page >]  [Reload] |
+-----------------------------------------------------------------------------------+
```

---

### 4.2 Screen 2b — Tab Switch Loading State

* **Bound ViewModel:** `TableViewModel` (`ActiveTable`)
* **Trigger / Condition:** `IsLoading == true` during async tab switch or page fetch.

```
+-----------------------------------------------------------------------------------+
|  Tab Bar:  ( ) Customers   [ [x] Orders (Loading...) ]   ( ) LineItems            |
+-----------------------------------------------------------------------------------+
| Index | Column Header 1     | Column Header 2       | Column Header 3          |  |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                                [ Loading Page Data... ]                           |
|                                                                                   |
+-----------------------------------------------------------------------------------+
|  [< Prev Page] (Disabled)    Page 1 of 25    Rows 1 - 50    [Next Page >] (Dis.)    |
+-----------------------------------------------------------------------------------+
```

---

## 5. Architectural Resolutions & Invariant Summary

1. **Error Rollback:** `PageIndex` rolls back prior to error message publication, making `ReloadPageCommand` inherently self-healing.
2. **Page Boundary Lock:** Selection navigation stops at page boundaries rather than auto-paging, isolating read-only selection from pagination side effects.
3. **Pure View Interception:** Editing keys are swallowed at the View layer, guaranteeing domain immutability during Sprint 2.