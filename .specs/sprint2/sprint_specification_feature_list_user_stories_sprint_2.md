# Sprint Specification: Feature List & User Stories (Sprint 2)

## 1. Scope Overview
This specification details the scope and requirements for Sprint 2, focusing on delivering a virtualized, read-only DataFrame grid view for each sheet/table in an open project.

---

## 2. User Stories & Acceptance Criteria

### Epic: Read-Only Virtualized DataFrame Workspace

#### US1 — Virtualized Data Grid View
* **As a** user,
* **I want to** view my table data in a virtualized grid with real domain column names,
* **So that** I can cleanly inspect large datasets without UI performance lag.

**Acceptance Criteria (AC):**
* Grid headers render real column names and inferred data types derived from schema metadata (e.g., `Age (Int64)`), explicitly omitting spreadsheet-style column lettering ($A, B, C$).
* The leftmost fixed column renders $0$-based row indices ($0, 1, 2, \dots$) matching pandas/Danfo.js DataFrame conventions.
* Grid rendering uses virtualized viewport scrolling to maintain smooth performance regardless of row count.

---

#### US2 — Server-Driven Grid Pagination
* **As a** user,
* **I want to** navigate table data using pagination controls,
* **So that** I can browse large datasets without loading entire datasets into UI memory at once.

**Acceptance Criteria (AC):**
* Pagination controls display `PageIndex`, `TotalPages`, current page row range (e.g., $1 - 100$), and `TotalRowCount`.
* Executing `NextPageCommand` or `PrevPageCommand` fetches the corresponding slice and recalibrates the row index offset ($PageIndex \times PageSize$).
* Pagination controls dynamically enable/disable based on bounds (`CanExecute`).

---

#### US3 — Non-Mutating Cell Selection
* **As a** user,
* **I can** click to select a cell or row in the grid,
* **So that** I can track my position without accidentally modifying underlying data.

**Acceptance Criteria (AC):**
* Clicking a cell sets active visual highlight indicators.
* Double-clicking or pressing keyboard keys does not trigger cell editors, value mutations, or edit states.

---

## 3. Explicit Out-of-Scope Safeguards for Sprint 2
* **No Cell / Row / Column Editing:** No value modifications, row insertions/deletions, or column additions.
* **No Spreadsheet Lettering:** Headers must not display $A, B, C$ index letters.
* **No Schema Transformations:** Column renaming, data type casting, and reordering are explicitly deferred.
* **No Sorting & Filtering:** Multi-column sorting and row filtering are deferred.
* **No Export Pipeline:** Cleaning pipelines and exporting to `.xlsx`/`.csv` remain out of scope for this initial grid phase.