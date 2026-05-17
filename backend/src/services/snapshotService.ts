/**
 * snapshotService.ts — F10: Mapping Snapshot / Versioning
 *
 * Provides idempotent table creation, snapshot capture, save, list, get,
 * diff, and pure planRestore. Restore is performed in the route layer
 * (needs builders + audit). All SQL identifiers are literal constants;
 * all values are parameterized.
 */

import { query } from '../db'
import type { CategoryDef } from './categoryRegistry'
import { buildListSql } from './categoryRegistry'

// ── Table name (constant; never from user input) ──────────────────────────────
const SNAPSHOT_TABLE = 'bgs_mapping_snapshot'

// ── Once-guard for table creation ────────────────────────────────────────────
let ensureSnapshotPromise: Promise<void> | null = null

/**
 * Idempotent: creates `bgs_mapping_snapshot` if it does not exist.
 * The promise is memoized so the CREATE TABLE IF NOT EXISTS runs at most once
 * per process lifetime.
 */
export async function ensureSnapshotTable(): Promise<void> {
  if (ensureSnapshotPromise) return ensureSnapshotPromise
  ensureSnapshotPromise = (async () => {
    const sql =
      `CREATE TABLE IF NOT EXISTS \`${SNAPSHOT_TABLE}\` (` +
      '`id` BIGINT AUTO_INCREMENT PRIMARY KEY, ' +
      '`ts` DATETIME NOT NULL, ' +
      '`registry` VARCHAR(20) NOT NULL, ' +
      '`label` VARCHAR(120) NOT NULL, ' +
      '`actor` VARCHAR(64) NOT NULL, ' +
      '`payload` LONGTEXT NOT NULL, ' +
      `INDEX \`idx_snap_reg_ts\` (\`registry\`, \`ts\`) ` +
      ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    await query(sql)
  })()
  // If the ensure itself fails, reset so subsequent calls retry
  ensureSnapshotPromise.catch(() => { ensureSnapshotPromise = null })
  return ensureSnapshotPromise
}

// ── Types ─────────────────────────────────────────────────────────────────────

/** Compact per-row mapping values stored in a snapshot. */
export interface SnapshotRowValue {
  s: string | null          // std_code
  s2?: string | null        // std_code2 (dual categories only)
  e?: Record<number, string | null>  // extra fields: { index: value }
}

/** Full payload stored in the snapshot. */
export interface SnapshotPayload {
  _meta: {
    capturedAt: string            // ISO timestamp
    registry: string
    pendingSkipped: string[]      // category keys skipped because pending
  }
  [categoryKey: string]: SnapshotCategoryPayload | SnapshotPayload['_meta']
}

/** Per-category payload: code → SnapshotRowValue */
export type SnapshotCategoryPayload = Record<string, SnapshotRowValue>

/** Row returned by listSnapshots (no payload). */
export interface SnapshotListItem {
  id: number
  ts: string
  label: string
  actor: string
}

/** Full snapshot row including parsed payload. */
export interface SnapshotRow extends SnapshotListItem {
  registry: string
  payload: SnapshotPayload
}

/** One diff entry: a mapping value that changed between snapshot and current. */
export interface DiffEntry {
  category: string
  code: string
  field: string   // 'std_code' | 'std_code2' | `std_code_e${number}`
  from: string | null
  to: string | null
}

/** Result of diffSnapshotVsCurrent. */
export interface DiffResult {
  changed: DiffEntry[]
  totalChanged: number
}

/** One planned write from planRestore. */
export interface RestoreWrite {
  category: string
  code: string
  field: string   // 'std_code' | 'std_code2' | `std_code_e${number}`
  value: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise: treat '' and null as null for comparison. */
function norm(v: string | null | undefined): string | null {
  return (v == null || v === '') ? null : v
}

// ── Core service functions ────────────────────────────────────────────────────

/**
 * Captures a payload snapshot from live DB data.
 * Skips pending categories (records them in _meta.pendingSkipped).
 *
 * @param registry  'basic' | 'eclaim'
 * @param listFn    returns the list of all category list items (key + pending)
 * @param getFn     returns CategoryDef by key (undefined if not found)
 */
export async function captureSnapshot(
  registry: string,
  listFn: () => { key: string; pending: boolean }[],
  getFn: (key: string) => CategoryDef | undefined,
): Promise<SnapshotPayload> {
  const categories = listFn()
  const pendingSkipped: string[] = []
  const payload: SnapshotPayload = {
    _meta: {
      capturedAt: new Date().toISOString(),
      registry,
      pendingSkipped,
    },
  }

  for (const cat of categories) {
    if (cat.pending) {
      pendingSkipped.push(cat.key)
      continue
    }

    const c = getFn(cat.key)
    if (!c) continue

    const { rows } = await query(buildListSql(c))
    const catPayload: SnapshotCategoryPayload = {}

    for (const row of rows as Record<string, unknown>[]) {
      const code = String(row['code'] ?? '')
      if (!code) continue

      const entry: SnapshotRowValue = {
        s: norm(row['std_code'] as string | null | undefined),
      }

      // Secondary mapping (dual categories)
      if (c.mapCol2 && 'std_code2' in row) {
        entry.s2 = norm(row['std_code2'] as string | null | undefined)
      }

      // Extra fields
      if (c.extraFields && c.extraFields.length > 0) {
        const extraMap: Record<number, string | null> = {}
        let hasExtra = false
        for (let i = 0; i < c.extraFields.length; i++) {
          const key = `std_code_e${i}`
          if (key in row) {
            extraMap[i] = norm(row[key] as string | null | undefined)
            hasExtra = true
          }
        }
        if (hasExtra) entry.e = extraMap
      }

      catPayload[code] = entry
    }

    payload[cat.key] = catPayload
  }

  return payload
}

/**
 * Saves a snapshot to the database.
 * Returns the inserted id.
 */
export async function saveSnapshot(
  registry: string,
  label: string,
  actor: string,
  payload: SnapshotPayload,
): Promise<number> {
  await ensureSnapshotTable()
  const sql =
    `INSERT INTO \`${SNAPSHOT_TABLE}\` (\`ts\`, \`registry\`, \`label\`, \`actor\`, \`payload\`) ` +
    'VALUES (NOW(), ?, ?, ?, ?)'
  const params: string[] = [registry, label, actor, JSON.stringify(payload)]
  const result = await query(sql, params) as { insertId?: number; rows: unknown[] }
  return result.insertId ?? 0
}

/**
 * Lists snapshots for a registry (no payload; ORDER BY id DESC).
 */
export async function listSnapshots(
  registry: string,
): Promise<SnapshotListItem[]> {
  await ensureSnapshotTable()
  const sql =
    `SELECT \`id\`, \`ts\`, \`label\`, \`actor\` ` +
    `FROM \`${SNAPSHOT_TABLE}\` ` +
    'WHERE `registry` = ? ' +
    'ORDER BY `id` DESC'
  const { rows } = await query(sql, [registry])
  return rows as unknown as SnapshotListItem[]
}

/**
 * Gets a single snapshot row (with parsed payload).
 * Returns null if not found or registry doesn't match.
 */
export async function getSnapshot(
  registry: string,
  id: number,
): Promise<SnapshotRow | null> {
  await ensureSnapshotTable()
  const sql =
    `SELECT \`id\`, \`ts\`, \`registry\`, \`label\`, \`actor\`, \`payload\` ` +
    `FROM \`${SNAPSHOT_TABLE}\` ` +
    'WHERE `id` = ? AND `registry` = ? ' +
    'LIMIT 1'
  const { rows } = await query(sql, [id, registry])
  const arr = rows as { id: number; ts: string; registry: string; label: string; actor: string; payload: string }[]
  if (arr.length === 0) return null
  const row = arr[0]!
  let parsedPayload: SnapshotPayload
  try {
    parsedPayload = JSON.parse(row.payload) as SnapshotPayload
  } catch {
    parsedPayload = { _meta: { capturedAt: '', registry, pendingSkipped: [] } }
  }
  return { ...row, payload: parsedPayload }
}

/**
 * PURE function: computes differences between a saved snapshot payload and
 * a freshly-captured current payload. Returns { changed, totalChanged }.
 *
 * "Missing" codes (in snapshot but gone from current) are treated as null→null
 * (no diff — they no longer exist). "New" codes (in current but not in snapshot)
 * are NOT included (snapshot doesn't know about them).
 *
 * Only compares categories that appear in the snapshot (not _meta).
 */
export function diffSnapshotVsCurrent(
  snapshotPayload: SnapshotPayload,
  currentPayload: SnapshotPayload,
): DiffResult {
  const changed: DiffEntry[] = []

  for (const categoryKey of Object.keys(snapshotPayload)) {
    if (categoryKey === '_meta') continue

    const snapCat = snapshotPayload[categoryKey] as SnapshotCategoryPayload
    const currCat = (currentPayload[categoryKey] ?? {}) as SnapshotCategoryPayload

    for (const code of Object.keys(snapCat)) {
      const snapRow = snapCat[code]!
      const currRow = currCat[code]

      // Compare std_code (s)
      const snapS = norm(snapRow.s)
      const currS = currRow ? norm(currRow.s) : null
      if (snapS !== currS) {
        changed.push({ category: categoryKey, code, field: 'std_code', from: snapS, to: currS })
      }

      // Compare std_code2 (s2) — only if present in snapshot
      if ('s2' in snapRow) {
        const snapS2 = norm(snapRow.s2)
        const currS2 = currRow && 's2' in currRow ? norm(currRow.s2) : null
        if (snapS2 !== currS2) {
          changed.push({ category: categoryKey, code, field: 'std_code2', from: snapS2, to: currS2 })
        }
      }

      // Compare extra fields (e) — only if present in snapshot
      if (snapRow.e) {
        for (const idxStr of Object.keys(snapRow.e)) {
          const idx = Number(idxStr)
          const snapE = norm(snapRow.e[idx])
          const currE = currRow?.e ? norm(currRow.e[idx]) : null
          if (snapE !== currE) {
            changed.push({ category: categoryKey, code, field: `std_code_e${idx}`, from: snapE, to: currE })
          }
        }
      }
    }
  }

  return { changed, totalChanged: changed.length }
}

/**
 * PURE function: given a snapshot payload and the current payload, returns
 * the list of writes needed to restore the snapshot values.
 *
 * Only includes rows/fields where the snapshot value differs from current.
 * "Missing" current rows are treated as null (still included as writes if snapshot had a value).
 * Codes not in snapshot are ignored.
 */
export function planRestore(
  snapshotPayload: SnapshotPayload,
  currentPayload: SnapshotPayload,
): RestoreWrite[] {
  const writes: RestoreWrite[] = []

  for (const categoryKey of Object.keys(snapshotPayload)) {
    if (categoryKey === '_meta') continue

    const snapCat = snapshotPayload[categoryKey] as SnapshotCategoryPayload
    const currCat = (currentPayload[categoryKey] ?? {}) as SnapshotCategoryPayload

    for (const code of Object.keys(snapCat)) {
      const snapRow = snapCat[code]!
      const currRow = currCat[code]

      // std_code
      const snapS = norm(snapRow.s)
      const currS = currRow ? norm(currRow.s) : null
      if (snapS !== currS) {
        writes.push({ category: categoryKey, code, field: 'std_code', value: snapS })
      }

      // std_code2
      if ('s2' in snapRow) {
        const snapS2 = norm(snapRow.s2)
        const currS2 = currRow && 's2' in currRow ? norm(currRow.s2) : null
        if (snapS2 !== currS2) {
          writes.push({ category: categoryKey, code, field: 'std_code2', value: snapS2 })
        }
      }

      // extra fields
      if (snapRow.e) {
        for (const idxStr of Object.keys(snapRow.e)) {
          const idx = Number(idxStr)
          const snapE = norm(snapRow.e[idx])
          const currE = currRow?.e ? norm(currRow.e[idx]) : null
          if (snapE !== currE) {
            writes.push({ category: categoryKey, code, field: `std_code_e${idx}`, value: snapE })
          }
        }
      }
    }
  }

  return writes
}

/** Resets the memoized ensure-promise (for testing only). */
export function _resetSnapshotEnsureForTest(): void {
  ensureSnapshotPromise = null
}
