# Sprint Specification: UI Wireframes & Layouts

## 1. Overview & Scope

This specification defines the visual layouts, ASCII wireframes, ViewModel bindings, and state variations for all user interface screens supported in this sprint. 

### Key Principles
* **Strict Binding Alignment:** Every visual element maps directly to properties and commands on the corresponding ViewModel.
* **No Out-of-Scope Elements:** Screens strictly reflect project metadata and session management (no data grid, cell editors, or filtering controls).
* **Modal Dialog Context:** Dialogs (UC2, UC3-S2) run as modals over the active background view.

---

## 2. UI Screen Specifications

### Screen 1 — Blank Shell (Idle State)
* **Bound ViewModel:** `ShellViewModel`
* **Trigger/State Condition:** `CurrentProject == null` and `IsBusy == false`

```text
+------------------------------------------------------------------+
|  DataFrame Project Tool                                   [-][x] |
+------------------------------------------------------------------+
|                                                                  |
|                                                                  |
|                        No project open                           |
|                                                                  |
|              +----------------+   +----------------+              |
|              |  Import File   |   |  Open Project  |              |
|              +----------------+   +----------------+              |
|                 bound to:            bound to:                    |
|              ImportFileCommand    OpenProjectCommand             |
|              CanExecute:          CanExecute:                     |
|              !IsBusy              !IsBusy && !IsProjectOpen      |
|                                                                  |
|  [ ErrorMessage text — visible only when Shell.ErrorMessage != null ]
|                                                                  |
+------------------------------------------------------------------+
```

#### Binding Summary
| Element | Binding Path | Expression / Details |
| :--- | :--- | :--- |
| **Import File Button** | `Command` $\rightarrow$ `ImportFileCommand` | Enabled when `!IsBusy && !IsProjectOpen` |
| **Open Project Button** | `Command` $\rightarrow$ `OpenProjectCommand` | Enabled when `!IsBusy && !IsProjectOpen` |
| **Error Banner** | `Text` $\rightarrow$ `ErrorMessage`, `Visibility` | Visible when `ErrorMessage != null` |

---

### Screen 1b — Blank Shell (Busy State)
* **Bound ViewModel:** `ShellViewModel`
* **Trigger/State Condition:** `CurrentProject == null` and `IsBusy == true` (e.g., file import or project load operation in flight)

```text
+------------------------------------------------------------------+
|  DataFrame Project Tool                                   [-][x] |
+------------------------------------------------------------------+
|                                                                  |
|                       Importing file...                          |
|                       (status text bound to IsBusy)              |
|                                                                  |
|              +----------------+   +----------------+              |
|              |  Import File   |   |  Open Project  |              |
|              +----------------+   +----------------+              |
|                  (both dimmed/disabled — CanExecute false)       |
|                                                                  |
+------------------------------------------------------------------+
```

#### Binding Summary
| Element | Binding Path | Expression / Details |
| :--- | :--- | :--- |
| **Status Text / Indicator** | `Visibility` $\rightarrow$ `IsBusy` | Displays loading feedback during async operations |
| **Import File Button** | `CanExecute` $\rightarrow$ `false` | Automatically disabled via `IsBusy == true` |
| **Open Project Button** | `CanExecute` $\rightarrow$ `false` | Automatically disabled via `IsBusy == true` |

---

### Screen 2 — Project Loaded View
* **Bound ViewModel:** `ProjectViewModel` (via `ShellViewModel.CurrentProject`) + `ShellViewModel.CloseProjectCommand`
* **Trigger/State Condition:** `Shell.CurrentProject != null` (`IsProjectOpen == true`)

```text
+------------------------------------------------------------------+
|  DataFrame Project Tool                                   [-][x] |
+------------------------------------------------------------------+
|  Project.Name -> "Sales.xlsx"              +----------------+     |
|                                             | Close Project  |     |
|                                             +----------------+     |
|                                             bound to:              |
|                                             Shell.CloseProjectCmd  |
|                                             CanExecute: IsProjectOpen
+------------------------------------------------------------------+
|  SourceType: xlsx   |   SourceFilePath: C:\Users\Daniel\Sales.xlsx |
+------------------------------------------------------------------+
|  Tables  (bound to ProjectViewModel.Tables: TableSummaryVM[])      |
|  ----------------------------------------------------------       |
|  | Name        | SheetIndex | RowCount | ColumnCount |            |
|  ----------------------------------------------------------       |
|  | Q1          |     0      |   1204   |     12      |            |
|  | Q2          |     1      |    980   |     12      |            |
|  | Summary     |     2      |     45   |      6      |            |
|  ----------------------------------------------------------       |
|      (read-only list this sprint — no row selection/grid yet)     |
+------------------------------------------------------------------+
```

#### Variant Note: CSV Source
When loading a `.csv` file, the UI uses the exact same layout structure, but the `Tables` collection contains exactly one row, and the `SheetIndex` column renders as blank or `—`.

#### Binding Summary
| Element | Binding Path | Expression / Details |
| :--- | :--- | :--- |
| **Project Title** | `Text` $\rightarrow$ `CurrentProject.Name` | Read-only header |
| **Close Project Button** | `Command` $\rightarrow$ `Shell.CloseProjectCommand` | Enabled when `IsProjectOpen == true` |
| **Metadata Headers** | `CurrentProject.SourceType`, `CurrentProject.SourceFilePath` | Display-only source attributes |
| **Table Summaries** | `ItemsSource` $\rightarrow$ `CurrentProject.Tables` | Bound to `TableSummaryVM[]` array |

---

### Screen 3 — Open Project Dialog (Modal)
* **Bound ViewModel:** `OpenProjectDialogViewModel`
* **Trigger/State Condition:** Launched via `OpenProjectCommand`; renders modally over Screen 1.

```text
+--------------------------------------------------------+
|  Open Project                                       X  |
+--------------------------------------------------------+
|  [ Loading... ]   <- visible while IsLoading == true    |
|                                                        |
|  ( ) Sales.xlsx      xlsx   3 tables   2026-09-20     |
|  (o) Inventory.csv   csv    1 table    2026-09-18     |  <- radio-select
|  ( ) Q3 Report.xlsx  xlsx   5 tables   2026-09-15     |     row bound
|        ^ each row = one ProjectSummaryVM              |     to SelectedProject
|          from AvailableProjects[]                     |
|                                                        |
|  [ Dialog.ErrorMessage — visible only on load failure ] |
|                                                        |
|                        +----------+   +--------------+ |
|                        | Cancel   |   |    Open      | |
|                        +----------+   +--------------+ |
|                        CancelCommand   ConfirmCommand  |
|                        CanExecute:     CanExecute:     |
|                        !IsBusy         SelectedProject |
|                                        != null         |
+--------------------------------------------------------+
```

#### Binding Summary
| Element | Binding Path | Expression / Details |
| :--- | :--- | :--- |
| **Loading Indicator** | `Visibility` $\rightarrow$ `IsLoading` | Visible during initial `ProjectStore.listProjects()` |
| **Project List** | `ItemsSource` $\rightarrow$ `AvailableProjects` | List of `ProjectSummaryVM` projections |
| **Row Selection** | `SelectedItem` $\rightarrow$ `SelectedProject` | Two-way binding driving `ConfirmCommand.CanExecute` |
| **Open Button** | `Command` $\rightarrow$ `ConfirmCommand` | Enabled when `SelectedProject != null` |
| **Cancel Button** | `Command` $\rightarrow$ `CancelCommand` | Closes modal with `null` result |
| **Error Banner** | `Text` $\rightarrow$ `ErrorMessage` | Displays load/missing file exceptions |

---

### Screen 3b — Open Project Dialog (Empty State)
* **Bound ViewModel:** `OpenProjectDialogViewModel`
* **Trigger/State Condition:** Modal active; `AvailableProjects.length == 0` and `IsLoading == false`

```text
+--------------------------------------------------------+
|  Open Project                                       X  |
+--------------------------------------------------------+
|                                                        |
|              No saved projects yet.                   |
|                                                        |
|                        +----------+   +--------------+ |
|                        | Cancel   |   |    Open      | |
|                        +----------+   +--------------+ |
|                                        (disabled     |
|                                        — nothing to  |
|                                          select)     |
+--------------------------------------------------------+
```

#### Binding Summary
| Element | Binding Path | Expression / Details |
| :--- | :--- | :--- |
| **Empty State Text** | `Visibility` $\rightarrow$ `AvailableProjects.IsEmpty` | Replaces project table list |
| **Open Button** | `CanExecute` $\rightarrow$ `false` | Permanently disabled (`SelectedProject` remains `null`) |
| **Cancel Button** | `Command` $\rightarrow$ `CancelCommand` | Primary action for user to exit modal |

---

### Screen 4 — Close Failure Dialog (UC3-S2 Modal)
* **Bound ViewModel:** `CloseFailureDialogViewModel`
* **Trigger/State Condition:** Launched from `Shell.CloseProjectCommand` error path on write error (`StoreWriteError`). Renders modally over Screen 2 (Project state retained).

```text
+------------------------------------------------------------+
|  Couldn't Close Project                                 X  |
+------------------------------------------------------------+
|                                                            |
|  Message ->  "Couldn't save project info before closing." |
|                                                            |
|  [ Retrying... ]  <- visible while IsBusy == true          |
|                                                            |
|  +----------+  +----------------------+  +----------------+ |
|  | Cancel   |  | Close Without Saving |  |  Save & Close  | |
|  +----------+  +----------------------+  +----------------+ |
|  CancelCmd      CloseWithoutSavingCmd     SaveAndCloseCmd  |
|  !IsBusy        !IsBusy                   !IsBusy          |
+------------------------------------------------------------+
```

#### Behavioral Outcomes
1. **Cancel:** Dialog closes returning `"cancelled"`. Screen 2 remains active and fully interactive without state loss.
2. **Close Without Saving:** Invokes `ProjectService.forceClose(id)`, clearing memory state without saving metadata. Returns `"closed"` $\rightarrow$ workspace drops to Screen 1.
3. **Save & Close:** Retries `ProjectStore.save()`. 
   * *Success:* Closes with `"closed"` $\rightarrow$ drops to Screen 1.
   * *Failure:* Modal remains open, updates `Message`, sets `IsBusy = false` to enable retry or alternative selection.

---

## 3. UI State Transition Diagram

```
                       +-------------------------+
                       | Screen 1: Blank Shell   |
                       |       (Idle)            |
                       +-------------------------+
                         /         |          ^
                        /          |          |
       ImportFileCommand       OpenProject   CloseProject
             /                     |          |
            v                      v          |
  +-------------------+  +------------------+ |
  | Screen 1b: Blank  |  | Screen 3 / 3b:   | |
  |   Shell (Busy)    |  | Open Project Dlg | |
  +-------------------+  +------------------+ |
            |                      |          |
     (Import Success)      (Select & Open)    |
            |                      |          |
            +----------+-----------+          |
                       |                      |
                       v                      |
         +---------------------------+        |
         | Screen 2: Project Loaded  |--------+
         +---------------------------+
                       |
               (Store Write Error)
                       |
                       v
         +---------------------------+
         | Screen 4: Close Failure   |
         |       (Modal)             |
         +---------------------------+
```