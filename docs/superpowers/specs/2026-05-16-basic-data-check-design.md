# Design: Basic Data Check & Mapping Page

**Date**: 2026-05-16
**Status**: Approved (brainstorming) — pending written-spec review
**Feature area**: `frontend/src/pages/BasicConfigPage.tsx`, `backend/src/api/routes/basicConfig.ts`
**Reference**: HOSxP PCU XE form `BMS43ExportBasicDataCheckForm` ("ตรวจสอบข้อมูลพื้นฐาน")

## 1. Problem & Goal

Before exporting the Thai MoPH 43-standard data files, hospital staff must verify that
every local HIS master code (occupation, race, religion, etc.) is mapped to the correct
national standard code. The reference application provides this as the
`BMS43ExportBasicDataCheckForm`: a master–detail screen listing ~32 basic-data categories
on the left and, for the selected category, a grid of `local code → standard code`
mappings on the right.

The web app already has the master–detail scaffold (`BasicConfigPage.tsx`) with all 32
category labels, but only **อาชีพ (occupation)** is functional. This feature makes the
remaining categories functional **and** lets users edit and persist the mapping back to
the HOSxP database, with unmapped rows highlighted for verification.

### Decisions captured during brainstorming

| Question | Decision |
|----------|----------|
| Editable or read-only? | **Editable** — users edit `local → standard` mapping and save back to HOSxP |
| Scope of first round | **All ~32 categories** |
| Highlight problems? | **Yes** — highlight rows that are not yet mapped |
| Source of mapping structure | **Derive from the live HOSxP DB schema** (Approach A) |
| Read-only DB constraint in plan.md | **Amend plan/constitution** — allow writes *only* to registered mapping columns |

### Schema probe (feasibility confirmed)

The HOSxP `demo` DB (`mysql://tool:***@127.0.0.1:3306/demo`) contains the master tables
(`occupation`, `religion`, `pttype`, `clinic`, `nationality`, `spclty`, …) and ~90
`provis_*` standard-reference tables (`provis_occupa`, `provis_race`, `provis_religion`,
`provis_nation`, `provis_pttype`, `provis_education`, `provis_chronic`, `provis_drug`,
`provis_proced`, `provis_fp`, `provis_instype`, …). The HOSxP convention is confirmed:
each master table carries a mapping column (e.g. `occupation.nhso_code`,
`religion.nhso_code`, `pttype.pttype_std_code`) referencing a `provis_*` table. The
existing `/occupation` route (`occupation LEFT JOIN provis_occupa`) is the proven pattern.

## 2. Architecture & Data Flow

Build on the existing master–detail page; do not redesign the layout (it already mirrors
the reference form).

```
BasicConfigPage (existing master-detail)
  └─ select category → DataTable
       ├─ GET  /api/basic-config/:category              → rows {code,name,std_code,std_name,mapped}
       ├─ GET  /api/basic-config/:category/std-options   → standard codes for the edit dropdown
       └─ PUT  /api/basic-config/:category/:code         → { std_code }   (UPDATE one mapping column)
                    ↓
            categoryRegistry  (single source of truth, allow-list)
                    ↓
            HOSxP MySQL `demo`  (master LEFT JOIN provis_*)
```

## 3. Core Abstraction — Category Registry (backend)

Replace the per-route hardcoded SQL in `basicConfig.ts` with one config-driven registry.
~32 categories become ~32 config entries, not ~32 functions (Constitution I — no
duplication).

```ts
interface CategoryDef {
  key: string         // 'occupation'
  label: string       // 'อาชีพ'
  table: string       // 'occupation'      master HIS table
  pk: string          // 'occupation'      PK / local code column
  nameCol: string     // 'name'            local display name
  mapCol: string      // 'nhso_code'       the ONLY writable column
  stdTable: string    // 'provis_occupa'   standard reference table
  stdCodeCol: string  // 'code'
  stdNameCol: string   // 'name'
}
```

The registry is also the **security allow-list**: every table/column identifier used in
any generated SQL must come from a `CategoryDef`. No identifier is ever taken from request
input. All values are passed as bound parameters.

## 4. Backend API

| Method | Path | Behaviour |
|--------|------|-----------|
| `GET` | `/api/basic-config/:category` | `[{ code, name, std_code, std_name, mapped }]`. `LEFT JOIN` standard table; `mapped=false` when the mapping column is NULL/empty or has no match in the `provis_*` table. |
| `GET` | `/api/basic-config/:category/std-options` | `[{ code, name }]` from the `provis_*` table — feeds the edit dropdown. |
| `PUT` | `/api/basic-config/:category/:code` | Body `{ std_code }`. Runs `UPDATE <table> SET <mapCol>=? WHERE <pk>=?`. Verifies the category exists in the registry and the code exists before updating. Updates exactly one registered column. Zod-validated body; clear error messages. |

`category` is rejected with HTTP 404 if not in the registry. `code` not found → 404.
Invalid body → 400 with a descriptive message (Constitution VI).

## 5. Frontend (extend `BasicConfigPage.tsx`)

- Add `std_code` / `std_name` columns rendered as an **editable dropdown** (React Query
  mutation → `PUT`; optimistic update then invalidate the category query).
- **Highlight unmapped rows**: light-red background + warning icon when `mapped=false`.
- Summary bar above the table: `ทั้งหมด N · ยังไม่ map M` (the "ตรวจสอบ" value).
- Success/error toast on save (Constitution III / VI).
- `EClaimConfigPage` placeholder is **out of scope** — left unchanged.

## 6. Write Safety

- Amend `specs/001-check-export/plan.md` and the constitution: change the "read-only
  database access" constraint to "read-only **except** mapping columns registered in the
  category registry."
- Only the `mapCol` declared in a `CategoryDef` is ever written. There is no endpoint that
  can modify any other column.
- Every identifier originates from the registry (allow-list); every value is a bound
  parameter — no string interpolation of request input into SQL.
- Each mapping change is logged (category, code, old value → new value) for observability.

## 7. Testing (TDD)

- **Unit**: registry SQL builder (correct SQL composed; unknown category rejected); body
  validation.
- **Integration** (Supertest against the `demo` DB): `GET` returns the correct `mapped`
  flag; `PUT` persists and a subsequent `GET` reflects the new value; `PUT` with an
  unknown category/code returns 404/400.
- **Frontend**: unmapped rows highlighted; mutation calls the correct `PUT` path.

## 8. Out of Scope & Risks

- **Out of scope**: E-Claim config, bulk import / auto-map, undo history.
- **Risk**: `provis_*` table names are not 1:1 with every category (e.g. เชื้อชาติ may map
  to `nationality` / `provis_race` / `provis_nation`). Mitigation: inspect and confirm
  each category individually while building the registry; categories that remain ambiguous
  are marked "pending confirmation" rather than guessed.
