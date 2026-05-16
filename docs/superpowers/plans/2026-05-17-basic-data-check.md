# Basic Data Check & Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all ~32 basic-data categories on the Basic Data Check page functional, with editable local→standard code mapping persisted back to the HOSxP database and unmapped rows highlighted.

**Architecture:** A single backend *category registry* (one config entry per category) drives generic GET/PUT routes. All table/column identifiers come from the registry (allow-list); all values are bound parameters. Writes touch only the one registered mapping column. The existing React master–detail page is extended with an editable dropdown, an unmapped highlight, and a summary bar.

**Tech Stack:** Express 5 + ts-jest + supertest (backend), `mysql2` via `backend/src/db.ts`, zod for validation; React 18 + React Query + Tailwind (frontend); Jest for pure-logic unit tests.

**Spec:** `docs/superpowers/specs/2026-05-16-basic-data-check-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `backend/src/services/categoryRegistry.ts` (create) | `CategoryDef` type, the registry array, `getCategory()`, SQL builders |
| `backend/src/api/routes/basicConfig.ts` (replace) | Generic `GET /`, `GET /:category`, `GET /:category/std-options`, `PUT /:category/:code` |
| `backend/tests/unit/categoryRegistry.test.ts` (create) | Registry lookup + SQL builder unit tests |
| `backend/tests/integration/basicConfig.test.ts` (create) | Route behaviour with the `db` module mocked at the boundary |
| `backend/scripts/probeRegistry.cjs` (create) | One-off DB probe that prints confirmed/ambiguous mapping candidates |
| `frontend/src/data/basicConfigUtils.ts` (create) | Pure helpers: `isUnmapped(row)`, `summarize(rows)` |
| `frontend/tests/basicConfigUtils.test.ts` (create) | Unit tests for the pure helpers |
| `frontend/src/pages/BasicConfigPage.tsx` (modify) | Registry-driven menu, editable std dropdown, highlight, summary, toast |
| `specs/001-check-export/plan.md` (modify) | Amend the read-only constraint |
| `.specify/memory/constitution.md` (modify, path TBD-confirmed in Task 1) | Amend the read-only principle |

---

## Task 1: Amend the read-only database constraint

**Files:**
- Modify: `specs/001-check-export/plan.md` (the `**Constraints**:` line, ~line 36)
- Modify: project constitution (locate first — see Step 1)

- [ ] **Step 1: Locate the constitution file**

Run: `ls .specify/memory/constitution.md docs/constitution.md CONSTITUTION.md 2>/dev/null`
Expected: one path printed. Use that path below (the commit `505abc4` ratified it, so it exists).

- [ ] **Step 2: Edit `specs/001-check-export/plan.md`**

Replace the constraints line:

```
**Constraints**: Read-only database access; no mobile; no auth complexity (single-hospital LAN deployment)
```

with:

```
**Constraints**: Read-only database access EXCEPT mapping columns explicitly registered in
the category registry (`backend/src/services/categoryRegistry.ts`), which the Basic Data
Check page may UPDATE; no mobile; no auth complexity (single-hospital LAN deployment)
```

- [ ] **Step 3: Edit the constitution file**

In the principle that states read-only DB access, append this sentence to that principle's body:

```
Exception: the Basic Data Check feature may write to mapping columns that are explicitly
declared in the category registry allow-list, and to no other column.
```

- [ ] **Step 4: Commit**

```bash
git add specs/001-check-export/plan.md <constitution path>
git -c commit.gpgsign=false commit -m "docs: allow scoped writes to registered mapping columns

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Category registry type + lookup

**Files:**
- Create: `backend/src/services/categoryRegistry.ts`
- Test: `backend/tests/unit/categoryRegistry.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/tests/unit/categoryRegistry.test.ts
import { getCategory, listCategories, CATEGORY_REGISTRY } from '../../src/services/categoryRegistry'

describe('category registry', () => {
  it('has occupation fully configured and confirmed', () => {
    const occ = getCategory('occupation')
    expect(occ).toMatchObject({
      key: 'occupation', table: 'occupation', pk: 'occupation',
      nameCol: 'name', mapCol: 'nhso_code',
      stdTable: 'provis_occupa', stdCodeCol: 'code', stdNameCol: 'name',
      pending: false,
    })
  })

  it('returns undefined for an unknown category', () => {
    expect(getCategory('not-a-real-category')).toBeUndefined()
  })

  it('lists every category with key + label', () => {
    const list = listCategories()
    expect(list.length).toBeGreaterThanOrEqual(30)
    for (const c of list) {
      expect(c.key.length).toBeGreaterThan(0)
      expect(c.label.length).toBeGreaterThan(0)
      expect(typeof c.pending).toBe('boolean')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/unit/categoryRegistry.test.ts`
Expected: FAIL — `Cannot find module '../../src/services/categoryRegistry'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// backend/src/services/categoryRegistry.ts
export interface CategoryDef {
  key: string        // url + query key, e.g. 'occupation'
  label: string      // Thai label shown in the menu
  table: string      // HIS master table
  pk: string         // PK / local code column
  nameCol: string    // local display-name column
  mapCol: string     // the ONLY writable column (local → standard mapping)
  stdTable: string   // provis_* standard reference table
  stdCodeCol: string // standard code column in stdTable
  stdNameCol: string // standard name column in stdTable
  pending: boolean   // true = table/column not yet confirmed against the DB
}

// Confirmed against the live HOSxP `demo` schema probe (2026-05-16):
//   occupation(name, occupation, nhso_code)  -> provis_occupa(code, name)
//   religion(religion, name, nhso_code)      -> provis_religion(code, name)
export const CATEGORY_REGISTRY: CategoryDef[] = [
  { key: 'occupation', label: 'อาชีพ', table: 'occupation', pk: 'occupation',
    nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'provis_occupa', stdCodeCol: 'code', stdNameCol: 'name', pending: false },
  { key: 'religion', label: 'ศาสนา', table: 'religion', pk: 'religion',
    nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'provis_religion', stdCodeCol: 'code', stdNameCol: 'name', pending: false },
]

export function getCategory(key: string): CategoryDef | undefined {
  return CATEGORY_REGISTRY.find(c => c.key === key)
}

export function listCategories(): Pick<CategoryDef, 'key' | 'label' | 'pending'>[] {
  return CATEGORY_REGISTRY.map(({ key, label, pending }) => ({ key, label, pending }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest tests/unit/categoryRegistry.test.ts`
Expected: PASS — except `lists every category … >= 30` FAILS (only 2 entries).
Leave that assertion failing; Task 4 populates the registry. To keep the suite green meanwhile, change `toBeGreaterThanOrEqual(30)` to `toBeGreaterThanOrEqual(2)` now and restore it to `30` in Task 4 Step 5.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/categoryRegistry.ts backend/tests/unit/categoryRegistry.test.ts
git -c commit.gpgsign=false commit -m "feat: category registry type + lookup

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: SQL builders (allow-list, parameterized)

**Files:**
- Modify: `backend/src/services/categoryRegistry.ts`
- Test: `backend/tests/unit/categoryRegistry.test.ts`

- [ ] **Step 1: Write the failing test (append to the existing test file)**

```typescript
import { buildListSql, buildStdOptionsSql, buildUpdateSql } from '../../src/services/categoryRegistry'

describe('SQL builders', () => {
  const occ = getCategory('occupation')!

  it('buildListSql LEFT JOINs the standard table and flags mapped', () => {
    const sql = buildListSql(occ)
    expect(sql).toContain('FROM `occupation`')
    expect(sql).toContain('LEFT JOIN `provis_occupa`')
    expect(sql).toContain('`occupation`.`nhso_code`')
    expect(sql).not.toMatch(/;\s*\S/) // single statement, no stacked queries
  })

  it('buildStdOptionsSql selects code+name from the provis table', () => {
    const sql = buildStdOptionsSql(occ)
    expect(sql).toContain('FROM `provis_occupa`')
    expect(sql).toContain('`code`')
    expect(sql).toContain('`name`')
  })

  it('buildUpdateSql writes only the mapping column, parameterized by PK', () => {
    const { sql, params } = buildUpdateSql(occ, '05', '0510')
    expect(sql).toBe('UPDATE `occupation` SET `nhso_code` = ? WHERE `occupation` = ?')
    expect(params).toEqual(['0510', '05'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/unit/categoryRegistry.test.ts`
Expected: FAIL — `buildListSql is not a function`

- [ ] **Step 3: Write minimal implementation (append to `categoryRegistry.ts`)**

```typescript
// All identifiers below come from CategoryDef (registry), never from request input.
function ident(name: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`unsafe identifier: ${name}`)
  return '`' + name + '`'
}

export function buildListSql(c: CategoryDef): string {
  return (
    `SELECT m.${ident(c.pk).slice(1, -1) && ident(c.pk)} AS code, ` +
    `m.${ident(c.nameCol)} AS name, ` +
    `m.${ident(c.mapCol)} AS std_code, ` +
    `s.${ident(c.stdNameCol)} AS std_name, ` +
    `(s.${ident(c.stdCodeCol)} IS NOT NULL) AS mapped ` +
    `FROM ${ident(c.table)} m ` +
    `LEFT JOIN ${ident(c.stdTable)} s ON m.${ident(c.mapCol)} = s.${ident(c.stdCodeCol)} ` +
    `ORDER BY m.${ident(c.pk)}`
  )
}

export function buildStdOptionsSql(c: CategoryDef): string {
  return (
    `SELECT ${ident(c.stdCodeCol)} AS code, ${ident(c.stdNameCol)} AS name ` +
    `FROM ${ident(c.stdTable)} ORDER BY ${ident(c.stdCodeCol)}`
  )
}

export function buildUpdateSql(
  c: CategoryDef, code: string, stdCode: string
): { sql: string; params: (string | null)[] } {
  return {
    sql: `UPDATE ${ident(c.table)} SET ${ident(c.mapCol)} = ? WHERE ${ident(c.pk)} = ?`,
    params: [stdCode === '' ? null : stdCode, code],
  }
}
```

Note: the test asserts the literal `` `occupation`.`nhso_code` `` appears in `buildListSql`. Replace the first two SELECT expressions so the qualified columns are emitted exactly as table-qualified backticked names. Concretely, implement `buildListSql` as:

```typescript
export function buildListSql(c: CategoryDef): string {
  const m = ident(c.table)
  const s = ident(c.stdTable)
  return (
    `SELECT ${m}.${ident(c.pk)} AS code, ` +
    `${m}.${ident(c.nameCol)} AS name, ` +
    `${m}.${ident(c.mapCol)} AS std_code, ` +
    `${s}.${ident(c.stdNameCol)} AS std_name, ` +
    `(${s}.${ident(c.stdCodeCol)} IS NOT NULL) AS mapped ` +
    `FROM ${m} ` +
    `LEFT JOIN ${s} ON ${m}.${ident(c.mapCol)} = ${s}.${ident(c.stdCodeCol)} ` +
    `ORDER BY ${m}.${ident(c.pk)}`
  )
}
```

Use this second form; delete the first `buildListSql` draft above.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest tests/unit/categoryRegistry.test.ts`
Expected: PASS (all builder tests green; the `>= 2` registry-count test still green).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/categoryRegistry.ts backend/tests/unit/categoryRegistry.test.ts
git -c commit.gpgsign=false commit -m "feat: parameterized allow-list SQL builders for registry

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Probe the DB and populate the full registry

**Files:**
- Create: `backend/scripts/probeRegistry.cjs`
- Modify: `backend/src/services/categoryRegistry.ts`
- Modify: `backend/tests/unit/categoryRegistry.test.ts`

- [ ] **Step 1: Write the probe script**

```javascript
// backend/scripts/probeRegistry.cjs
// Prints, for each candidate master table, its columns and whether a matching
// provis_* table exists. Used to fill CATEGORY_REGISTRY by hand (no guessing).
const fs = require('fs')
const url = fs.readFileSync(__dirname + '/../.env', 'utf8').match(/DATABASE_URL=(.*)/)[1].trim()
const CANDIDATES = [
  ['occupation','occupation','provis_occupa'], ['religion','religion','provis_religion'],
  ['nationality','race','provis_race'], ['nationality','nation','provis_nation'],
  ['pttype','pttype','provis_instype'], ['spclty','department','provis_service'],
  ['provis_education','education','provis_education'], ['pcualcohol','chronic','provis_chronic'],
  // add the remaining ~24 master tables here as discovered from the menu labels
]
;(async () => {
  const mysql = require('mysql2/promise')
  const p = mysql.createPool(url)
  for (const [table, key, std] of CANDIDATES) {
    try {
      const [cols] = await p.query('SHOW COLUMNS FROM `' + table + '`')
      const [[{ n }]] = await p.query(
        "SELECT COUNT(*) n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?", [std])
      console.log(key, '| table=', table, 'exists; provis=', std, n ? 'OK' : 'MISSING',
        '| cols:', cols.map(c => c.Field).filter(f => /code|name|nhso|std/i.test(f)).join(','))
    } catch (e) { console.log(key, '| table=', table, 'ERR', e.code) }
  }
  await p.end()
})().catch(e => { console.error(e.code || e.message); process.exit(1) })
```

- [ ] **Step 2: Run the probe**

Run: `cd backend && node scripts/probeRegistry.cjs`
Expected: one line per candidate showing the master table's code/name/nhso columns and whether the `provis_*` table exists. Use this output as the source of truth.

- [ ] **Step 3: Populate `CATEGORY_REGISTRY`**

For every menu label in `frontend/src/pages/BasicConfigPage.tsx`'s `SUB_MENUS`, add a `CategoryDef`:
- If the probe confirms the master table, its mapping column, and the matching `provis_*` table → set `pending: false` with the confirmed identifiers.
- If the master table or its mapping column is ambiguous/missing in the probe output → still add the entry with your best-known identifiers but set `pending: true`.

Every entry's `table`, `pk`, `nameCol`, `mapCol`, `stdTable`, `stdCodeCol`, `stdNameCol` MUST be a value that appeared in the probe output for that table. Do not invent column names.

- [ ] **Step 4: Add a registry-integrity test (append to the unit test file)**

```typescript
import { CATEGORY_REGISTRY } from '../../src/services/categoryRegistry'

describe('registry integrity', () => {
  it('uses only safe identifiers everywhere', () => {
    const safe = /^[A-Za-z0-9_]+$/
    for (const c of CATEGORY_REGISTRY) {
      for (const v of [c.table, c.pk, c.nameCol, c.mapCol, c.stdTable, c.stdCodeCol, c.stdNameCol]) {
        expect(v).toMatch(safe)
      }
    }
  })

  it('has unique keys', () => {
    const keys = CATEGORY_REGISTRY.map(c => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
```

- [ ] **Step 5: Restore the count assertion and run tests**

In `backend/tests/unit/categoryRegistry.test.ts` change `toBeGreaterThanOrEqual(2)` back to `toBeGreaterThanOrEqual(30)`.
Run: `cd backend && npx jest tests/unit/categoryRegistry.test.ts`
Expected: PASS — all assertions, including `>= 30` and the integrity tests.

- [ ] **Step 6: Commit**

```bash
git add backend/scripts/probeRegistry.cjs backend/src/services/categoryRegistry.ts backend/tests/unit/categoryRegistry.test.ts
git -c commit.gpgsign=false commit -m "feat: populate full category registry from DB probe

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Generic backend routes

**Files:**
- Replace: `backend/src/api/routes/basicConfig.ts`
- Test: `backend/tests/integration/basicConfig.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/tests/integration/basicConfig.test.ts
import request from 'supertest'

const mockQuery = jest.fn()
jest.mock('../../src/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

import app from '../../src/index'

describe('basic-config routes', () => {
  beforeEach(() => mockQuery.mockReset())

  it('GET /api/basic-config lists categories', async () => {
    const res = await request(app).get('/api/basic-config')
    expect(res.status).toBe(200)
    expect(res.body.find((c: { key: string }) => c.key === 'occupation')).toBeTruthy()
  })

  it('GET /api/basic-config/:category returns rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ code: '05', name: 'เกษตรกร', std_code: '0510', std_name: 'x', mapped: 1 }], rowCount: 1 })
    const res = await request(app).get('/api/basic-config/occupation')
    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({ code: '05', mapped: true })
  })

  it('GET unknown category → 404', async () => {
    const res = await request(app).get('/api/basic-config/nope')
    expect(res.status).toBe(404)
  })

  it('PUT updates the mapping and returns ok', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ code: '05' }], rowCount: 1 }) // existence check
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })               // update
    const res = await request(app).put('/api/basic-config/occupation/05').send({ std_code: '0510' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    const updateCall = mockQuery.mock.calls[1]
    expect(updateCall[0]).toContain('UPDATE `occupation` SET `nhso_code` = ?')
    expect(updateCall[1]).toEqual(['0510', '05'])
  })

  it('PUT invalid body → 400', async () => {
    const res = await request(app).put('/api/basic-config/occupation/05').send({})
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/integration/basicConfig.test.ts`
Expected: FAIL — current `basicConfig.ts` has no `GET /` or `PUT`, so the list/404/PUT assertions fail.

- [ ] **Step 3: Replace `backend/src/api/routes/basicConfig.ts`**

```typescript
import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { query } from '../../db'
import { AppError } from '../../middleware/errorHandler'
import {
  getCategory, listCategories,
  buildListSql, buildStdOptionsSql, buildUpdateSql,
} from '../../services/categoryRegistry'

const router = Router()
const bodySchema = z.object({ std_code: z.string().max(20) })

router.get('/', (_req: Request, res: Response) => {
  res.json(listCategories())
})

router.get('/:category', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const c = getCategory(req.params.category)
    if (!c) throw new AppError(404, 'NOT_FOUND', `ไม่พบหมวด: ${req.params.category}`)
    const { rows } = await query(buildListSql(c))
    res.json(rows.map(r => ({ ...r, mapped: !!r.mapped && r.std_code != null && r.std_code !== '' })))
  } catch (err) { next(err) }
})

router.get('/:category/std-options', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const c = getCategory(req.params.category)
    if (!c) throw new AppError(404, 'NOT_FOUND', `ไม่พบหมวด: ${req.params.category}`)
    const { rows } = await query(buildStdOptionsSql(c))
    res.json(rows)
  } catch (err) { next(err) }
})

router.put('/:category/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const c = getCategory(req.params.category)
    if (!c) throw new AppError(404, 'NOT_FOUND', `ไม่พบหมวด: ${req.params.category}`)
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) throw new AppError(400, 'INVALID_BODY', 'ต้องระบุ std_code')
    const code = req.params.code

    const exists = await query(
      `SELECT 1 FROM \`${c.table}\` WHERE \`${c.pk}\` = ? LIMIT 1`, [code])
    if (exists.rowCount === 0) throw new AppError(404, 'NOT_FOUND', `ไม่พบรหัส: ${code}`)

    const { sql, params } = buildUpdateSql(c, code, parsed.data.std_code)
    await query(sql, params)
    console.log(`[basic-config] ${c.key} ${code} -> ${parsed.data.std_code || 'NULL'}`)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest tests/integration/basicConfig.test.ts`
Expected: PASS — all five assertions green.

- [ ] **Step 5: Run the full backend suite**

Run: `cd backend && npx jest`
Expected: PASS — all suites; output pristine.

- [ ] **Step 6: Commit**

```bash
git add backend/src/api/routes/basicConfig.ts backend/tests/integration/basicConfig.test.ts
git -c commit.gpgsign=false commit -m "feat: generic registry-driven basic-config routes (list/detail/std-options/update)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Frontend pure helpers (unmapped + summary)

**Files:**
- Create: `frontend/src/data/basicConfigUtils.ts`
- Test: `frontend/tests/basicConfigUtils.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/tests/basicConfigUtils.test.ts
import { isUnmapped, summarize, BasicRow } from '../src/data/basicConfigUtils'

const rows: BasicRow[] = [
  { code: '01', name: 'a', std_code: '0110', std_name: 'A', mapped: true },
  { code: '02', name: 'b', std_code: '',    std_name: null, mapped: false },
  { code: '03', name: 'c', std_code: null,  std_name: null, mapped: false },
]

describe('isUnmapped', () => {
  it('is true when std_code is empty/null or mapped is false', () => {
    expect(isUnmapped(rows[0])).toBe(false)
    expect(isUnmapped(rows[1])).toBe(true)
    expect(isUnmapped(rows[2])).toBe(true)
  })
})

describe('summarize', () => {
  it('counts total and unmapped', () => {
    expect(summarize(rows)).toEqual({ total: 3, unmapped: 2 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx jest tests/basicConfigUtils.test.ts`
Expected: FAIL — `Cannot find module '../src/data/basicConfigUtils'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// frontend/src/data/basicConfigUtils.ts
export interface BasicRow {
  code: string
  name: string
  std_code: string | null
  std_name: string | null
  mapped: boolean
}

export function isUnmapped(row: BasicRow): boolean {
  return !row.mapped || row.std_code == null || row.std_code === ''
}

export function summarize(rows: BasicRow[]): { total: number; unmapped: number } {
  return { total: rows.length, unmapped: rows.filter(isUnmapped).length }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx jest tests/basicConfigUtils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/data/basicConfigUtils.ts frontend/tests/basicConfigUtils.test.ts
git -c commit.gpgsign=false commit -m "feat: basic-config pure helpers (isUnmapped, summarize)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Wire the frontend page (registry-driven menu, edit, highlight, summary)

**Files:**
- Modify: `frontend/src/pages/BasicConfigPage.tsx`

No frontend component test infra (RTL) is configured; the testable logic lives in
`basicConfigUtils.ts` (Task 6) and is already covered. This task is wiring only.

- [ ] **Step 1: Replace the static `SUB_MENUS` with a registry fetch**

In `BasicConfigPage.tsx`, remove the hardcoded `SUB_MENUS` array and the `apiPath`/`columns`
fields. Fetch the menu from the backend:

```tsx
const { data: menus = [] } = useQuery({
  queryKey: ['basic-config-menus'],
  queryFn: () => axios.get<{ key: string; label: string; pending: boolean }[]>('/api/basic-config').then(r => r.data),
  staleTime: 300_000,
})
```

Render `menus` in the existing left-nav `<nav>` exactly as today, using `m.key`/`m.label`,
and show the amber dot when `m.pending`.

- [ ] **Step 2: Replace `DataTable` body with the editable, registry-shaped table**

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isUnmapped, summarize, BasicRow } from '../data/basicConfigUtils'

function DataTable({ menu }: { menu: { key: string; label: string } }) {
  const qc = useQueryClient()
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['basic-config', menu.key],
    queryFn: () => axios.get<BasicRow[]>(`/api/basic-config/${menu.key}`).then(r => r.data),
    staleTime: 60_000,
  })
  const { data: opts = [] } = useQuery({
    queryKey: ['basic-config-opts', menu.key],
    queryFn: () => axios.get<{ code: string; name: string }[]>(`/api/basic-config/${menu.key}/std-options`).then(r => r.data),
    staleTime: 300_000,
  })
  const save = useMutation({
    mutationFn: (v: { code: string; std_code: string }) =>
      axios.put(`/api/basic-config/${menu.key}/${encodeURIComponent(v.code)}`, { std_code: v.std_code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['basic-config', menu.key] }),
  })

  if (isLoading) return <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
  if (isError) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">เกิดข้อผิดพลาดในการดึงข้อมูล</div>

  const s = summarize(rows)
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b flex items-center justify-between">
        <p className="text-sm text-gray-600 font-medium">{menu.label}</p>
        <p className="text-xs text-gray-500">
          ทั้งหมด {s.total.toLocaleString()} ·{' '}
          <span className={s.unmapped ? 'text-red-600 font-semibold' : 'text-green-600'}>
            ยังไม่ map {s.unmapped.toLocaleString()}
          </span>
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-700 text-white">
            <tr>
              <th className="text-left px-3 py-2 font-medium w-20">รหัส</th>
              <th className="text-left px-3 py-2 font-medium w-56">ชื่อ (HIS)</th>
              <th className="text-left px-3 py-2 font-medium">รหัสมาตรฐาน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">ไม่พบข้อมูล</td></tr>
            ) : rows.map(row => (
              <tr key={row.code} className={isUnmapped(row) ? 'bg-red-50' : 'bg-white'}>
                <td className="px-3 py-2 text-gray-700">{row.code}</td>
                <td className="px-3 py-2 text-gray-700">
                  {isUnmapped(row) && <span className="mr-1 text-red-500" title="ยังไม่ map">⚠</span>}
                  {row.name}
                </td>
                <td className="px-3 py-2">
                  <select
                    defaultValue={row.std_code ?? ''}
                    onChange={e => save.mutate({ code: row.code, std_code: e.target.value })}
                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full max-w-md"
                  >
                    <option value="">— ยังไม่ map —</option>
                    {opts.map(o => (
                      <option key={o.code} value={o.code}>{o.code} — {o.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {save.isError && <div className="px-4 py-2 text-sm text-red-700 bg-red-50">บันทึกไม่สำเร็จ</div>}
      {save.isSuccess && <div className="px-4 py-2 text-sm text-green-700 bg-green-50">บันทึกแล้ว</div>}
    </div>
  )
}
```

- [ ] **Step 3: Update `BasicConfigPage` to use the fetched menu**

Set `activeKey` from the first fetched menu (guard for empty during load). Keep the existing
sidebar layout/markup; only the data source changes.

- [ ] **Step 4: Type-check the two feature files**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -E 'BasicConfigPage|basicConfigUtils' || echo "no errors in feature files"`
Expected: `no errors in feature files` (pre-existing unrelated errors elsewhere are out of scope).

- [ ] **Step 5: Manual smoke check**

Run `npm run dev`, open the app, select การตั้งค่า → ตรวจสอบรหัสข้อมูลพื้นฐาน. Confirm:
the left menu loads from the API; selecting อาชีพ shows rows; unmapped rows are red with ⚠;
changing a dropdown shows "บันทึกแล้ว" and the count updates after refetch.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/BasicConfigPage.tsx
git -c commit.gpgsign=false commit -m "feat: registry-driven editable Basic Data Check page with unmapped highlight

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full backend suite**

Run: `cd backend && npx jest`
Expected: PASS, pristine output.

- [ ] **Step 2: Full frontend pure-logic suite**

Run: `cd frontend && npx jest`
Expected: PASS (nhsoLinks + basicConfigUtils + categoryRegistry-frontend if any).

- [ ] **Step 3: Confirm scoped-write safety by inspection**

Grep the codebase: the only `UPDATE`/write SQL is `buildUpdateSql`, it targets only
`c.mapCol`, and every identifier passes the `ident()` allow-list.

Run: `cd backend && grep -rn "UPDATE\|INSERT\|DELETE" src/ | grep -v node_modules`
Expected: the only data-modifying statement is the `UPDATE` in `categoryRegistry.ts`
(plus the read-only `SELECT 1 … LIMIT 1` existence check in `basicConfig.ts`).

- [ ] **Step 4: Report status honestly**

Summarize: tests passing, any `pending: true` categories still needing schema confirmation,
and that pre-existing unrelated `tsc` errors (App.tsx:77 etc.) remain out of scope.

---

## Self-Review

**Spec coverage:**
- Editable mapping + save to HOSxP → Tasks 3 (`buildUpdateSql`), 5 (PUT route), 7 (dropdown+mutation) ✓
- All ~32 categories → Task 4 (probe + populate, count ≥ 30 enforced) ✓
- Highlight unmapped → Tasks 6 (`isUnmapped`), 7 (red row + ⚠) ✓
- Derive from HOSxP DB → Task 4 probe ✓
- Amend read-only constraint → Task 1 ✓
- Registry as allow-list / parameterized writes → Tasks 2–3, verified in Task 8 Step 3 ✓
- std-options for dropdown → Tasks 3, 5, 7 ✓
- Tests (unit + integration) → Tasks 2,3,5,6 ✓

**Placeholder scan:** Task 4 Step 3 is a procedure (probe → fill) rather than literal final
code — this is intentional and matches the spec's stated mitigation (schema must be
inspected; ambiguous entries flagged `pending`). It is bounded by a concrete probe script,
an explicit "no invented column names" rule, and the registry-integrity + count tests that
fail until satisfied. No other placeholders.

**Type consistency:** `CategoryDef` fields, `BasicRow` shape, builder names
(`buildListSql`/`buildStdOptionsSql`/`buildUpdateSql`), and route response keys
(`code,name,std_code,std_name,mapped`) are consistent across Tasks 2–7.
