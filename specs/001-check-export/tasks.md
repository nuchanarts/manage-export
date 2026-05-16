# Tasks: BGS Check Export — Health Data Check & Export Tool

**Input**: Design documents from `specs/001-check-export/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/api.md ✅

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo project initialization, package configuration, and build tooling

- [x] T001 Create monorepo root `package.json` with workspaces for backend and frontend
- [x] T002 Initialize backend: `backend/package.json` with Express 5, exceljs, zod, cors, dotenv, TypeScript dependencies
- [x] T003 [P] Initialize frontend: `frontend/package.json` with React 18, React Query 5, React Hook Form, Vite 5, Tailwind CSS, axios
- [x] T004 [P] Configure backend TypeScript in `backend/tsconfig.json` targeting Node.js 20
- [x] T005 [P] Configure frontend TypeScript + Vite in `frontend/tsconfig.json` and `frontend/vite.config.ts`
- [x] T006 [P] Configure Tailwind CSS in `frontend/tailwind.config.ts` and `frontend/src/index.css`
- [x] T007 Create `backend/.env.example` with DATABASE_URL, PORT, NODE_ENV placeholders
- [x] T008 Add root-level `npm run dev` script that starts both backend and frontend concurrently in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure — database connection, server setup, and error handling

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Create backend entry point `backend/src/index.ts` with Express app, CORS, JSON body parser on port 3001
- [x] T010 [P] Create database connection module `backend/src/db.ts` that reads DATABASE_URL from env and exports a query helper
- [x] T011 [P] Create error handling middleware `backend/src/middleware/errorHandler.ts` with structured JSON error responses
- [x] T012 Create `backend/src/api/routes/index.ts` that mounts all route modules and exposes GET /health endpoint
- [x] T013 [P] Create TypeScript interfaces for HealthRecord, SearchFilter, SearchResult in `backend/src/models/types.ts`
- [x] T014 Create frontend entry `frontend/src/main.tsx` with React Query provider wrapping `<App />`
- [x] T015 [P] Create `frontend/src/App.tsx` with basic layout shell (header with title, main content area)
- [x] T016 Create `frontend/src/services/api.ts` with axios instance configured to `http://localhost:3001/api`

**Checkpoint**: Run `npm run dev` — both servers start; GET /health returns `{"status":"ok"}`

---

## Phase 3: User Story 1 — ค้นหาและตรวจสอบข้อมูลสุขภาพ (Priority: P1) 🎯 MVP

**Goal**: Staff can filter health records by date range and view a paginated results table

**Independent Test**: Enter date range → click ค้นหา → see records table with total count displayed

### Implementation for User Story 1

- [x] T017 [US1] Implement `RecordService.search()` in `backend/src/services/recordService.ts` — builds parameterized SQL query from SearchFilter, returns SearchResult with pagination
- [x] T018 [P] [US1] Implement Zod validation schema for SearchFilter in `backend/src/api/validators/searchValidator.ts` — validates dateFrom, dateTo required; birthFrom/birthTo paired; pageSize 1–200
- [x] T019 [US1] Create GET /records route in `backend/src/api/routes/records.ts` — validates query params via searchValidator, calls RecordService.search(), returns SearchResult JSON
- [x] T020 [P] [US1] Create `SearchForm` component in `frontend/src/components/search/SearchForm.tsx` — date inputs (dateFrom, dateTo), optional hospcode, optional birthFrom/birthTo, ค้นหา button, validation
- [x] T021 [US1] Create `RecordsTable` component in `frontend/src/components/search/RecordsTable.tsx` — displays HealthRecord[] in a table with Thai column headers, shows total count, pagination controls
- [x] T022 [US1] Create `useSearchRecords` hook in `frontend/src/hooks/useSearchRecords.ts` — wraps React Query call to GET /api/records, manages loading/error/data state
- [x] T023 [US1] Wire SearchForm + RecordsTable into `frontend/src/pages/HomePage.tsx` — form submission triggers search, results displayed in table, loading spinner while fetching
- [x] T024 [US1] Add error display component `frontend/src/components/shared/ErrorMessage.tsx` for API errors shown below search form

**Checkpoint**: Search by date range works end-to-end — results shown in table, total count displayed, pagination works, birth date is optional ✅

---

## Phase 4: User Story 2 — Export ข้อมูลเป็น Excel (Priority: P1)

**Goal**: Staff can download all filtered records as a complete Excel file

**Independent Test**: After search → click Export Excel → .xlsx file downloads with all records and all columns

### Implementation for User Story 2

- [x] T025 [US2] Implement `RecordService.exportAll()` in `backend/src/services/recordService.ts` — same filter as search but fetches ALL records without pagination (streaming if >5000 rows)
- [x] T026 [US2] Implement Excel builder `backend/src/services/excelService.ts` using exceljs — creates workbook with Thai column headers, writes HealthRecord rows, streams response
- [x] T027 [US2] Create GET /records/export route in `backend/src/api/routes/records.ts` — validates filter, calls exportAll(), pipes Excel stream to response with correct Content-Disposition header
- [x] T028 [P] [US2] Add "ไม่มีข้อมูลสำหรับ Export" 404 response when export query returns 0 records
- [x] T029 [US2] Create `ExportButton` component in `frontend/src/components/search/ExportButton.tsx` — disabled when no results, shows loading state during export, triggers file download via anchor tag
- [x] T030 [US2] Integrate ExportButton into `frontend/src/pages/HomePage.tsx` below RecordsTable — passes current search filter to export, disabled when total=0

**Checkpoint**: Export Excel button downloads complete .xlsx file with all rows matching search, file opens correctly in Excel ✅

---

## Phase 5: User Story 3 — ดูรายละเอียดข้อมูลรายบุคคล (Priority: P2)

**Goal**: Staff can click a row to see full record details in a modal

**Independent Test**: Click any row in results table → detail modal opens with all fields displayed

### Implementation for User Story 3

- [x] T031 [US3] Create GET /records/:pid route in `backend/src/api/routes/records.ts` — fetches single record by PID, returns 404 if not found
- [x] T032 [P] [US3] Create `RecordDetailModal` component in `frontend/src/components/search/RecordDetailModal.tsx` — modal overlay with all HealthRecord fields labeled in Thai, close button
- [x] T033 [US3] Create `useRecordDetail` hook in `frontend/src/hooks/useRecordDetail.ts` — React Query call to GET /api/records/:pid, enabled only when PID is set
- [x] T034 [US3] Make RecordsTable rows clickable in `frontend/src/components/search/RecordsTable.tsx` — onClick sets selectedPid state, cursor: pointer on rows
- [x] T035 [US3] Wire RecordDetailModal into `frontend/src/pages/HomePage.tsx` — show modal when selectedPid is set, close on dismiss restores search results

**Checkpoint**: Click row → modal shows full detail → close modal → search results still visible ✅

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T036 [P] Add loading spinner component `frontend/src/components/shared/LoadingSpinner.tsx` used by search, export, and detail modal
- [x] T037 [P] Add date format utility `frontend/src/utils/dateFormat.ts` — converts YYYYMMDD strings to Thai Buddhist calendar display (พ.ศ.)
- [x] T038 Add backend request logging in `backend/src/middleware/requestLogger.ts` — logs method, path, status, duration
- [x] T039 [P] Add frontend page title and basic responsive layout in `frontend/src/App.tsx` — "BGS Check Export" header, responsive container
- [x] T040 Write backend unit tests for `RecordService.search()` filter building in `backend/tests/unit/recordService.test.ts`
- [x] T041 [P] Write backend unit tests for `excelService.ts` column generation in `backend/tests/unit/excelService.test.ts`
- [x] T042 Validate quickstart.md: run through all 4 test scenarios from `specs/001-check-export/quickstart.md` and confirm each passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Start immediately — no dependencies
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user story phases
- **Phase 3 (US1 Search)**: Depends on Phase 2 — implements search feature
- **Phase 4 (US2 Export)**: Depends on Phase 2 + T017 (RecordService exists) — can start when Phase 3 service layer done
- **Phase 5 (US3 Detail)**: Depends on Phase 2 — mostly independent from US1/US2
- **Phase 6 (Polish)**: Depends on all story phases

### Parallel Opportunities (within each phase)

- Phase 1: T003, T004, T005, T006 can all run in parallel after T001–T002
- Phase 2: T010, T011, T013, T015, T016 can run in parallel after T009
- Phase 3: T018, T020 can start in parallel; T019 needs T017+T018; T021–T024 after T019
- Phase 4: T028, T029 can run in parallel with T025–T027
- Phase 5: T032 can run in parallel with T031

---

## Implementation Strategy

### MVP (User Stories 1 + 2 — both P1)

1. Phase 1: Setup → Phase 2: Foundational
2. Phase 3: Search feature → **test search independently**
3. Phase 4: Export feature → **test export independently**
4. Ship: Staff can search + export health data

### Full Delivery (add US3)

5. Phase 5: Detail modal
6. Phase 6: Polish + tests

---

## Total Tasks: 42 ✅ ALL COMPLETE

| Phase | Tasks | User Story | Status |
|-------|-------|------------|--------|
| Setup | T001–T008 | — | ✅ Done |
| Foundational | T009–T016 | — | ✅ Done |
| US1 Search | T017–T024 | US1 (P1) | ✅ Done |
| US2 Export | T025–T030 | US2 (P1) | ✅ Done |
| US3 Detail | T031–T035 | US3 (P2) | ✅ Done |
| Polish | T036–T042 | — | ✅ Done |
