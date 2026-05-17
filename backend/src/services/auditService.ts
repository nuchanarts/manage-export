/**
 * auditService.ts
 *
 * Provides best-effort audit logging for every mapping change.
 * An audit INSERT failure is swallowed (logged to console) and NEVER propagates
 * to the calling request path — mapping saves must not fail because of audit issues.
 *
 * SQL identifiers are all literal/constant strings in this file (never from user input).
 * All values are parameterized.
 */

import { query } from '../db'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditEntry {
  registry: 'basic' | 'eclaim'
  category: string
  code: string
  field: string          // 'std_code' | 'std_code2' | 'std_code_e{i}'
  oldValue: string | null
  newValue: string | null
  actor: string
}

export interface AuditRow {
  id?: number            // present in getLastChange result
  ts: string             // ISO-formatted datetime string
  code: string
  field: string
  old_value: string | null
  new_value: string | null
  actor: string
}

/**
 * Describes which kind of mapping field an audit field string refers to.
 * Returned by resolveAuditField().
 */
export interface AuditFieldResolution {
  kind: 'primary' | 'secondary' | 'extra'
  index?: number   // only set when kind === 'extra'
}

// ── Audit table name (constant; never from user input) ───────────────────────
const AUDIT_TABLE = 'bgs_mapping_audit'

// ── Once-guard for table creation ────────────────────────────────────────────
let ensurePromise: Promise<void> | null = null

/**
 * Idempotent: creates `bgs_mapping_audit` if it does not exist.
 * The promise is memoized so the CREATE TABLE IF NOT EXISTS runs at most once
 * per process lifetime.
 */
export async function ensureAuditTable(): Promise<void> {
  if (ensurePromise) return ensurePromise
  ensurePromise = (async () => {
    const sql =
      `CREATE TABLE IF NOT EXISTS \`${AUDIT_TABLE}\` (` +
      '`id` BIGINT AUTO_INCREMENT PRIMARY KEY, ' +
      '`ts` DATETIME NOT NULL, ' +
      '`registry` VARCHAR(20) NOT NULL, ' +
      '`category` VARCHAR(64) NOT NULL, ' +
      '`code` VARCHAR(190) NOT NULL, ' +
      '`field` VARCHAR(32) NOT NULL, ' +
      '`old_value` VARCHAR(255) NULL, ' +
      '`new_value` VARCHAR(255) NULL, ' +
      '`actor` VARCHAR(64) NOT NULL, ' +
      `INDEX \`idx_audit_reg_cat_ts\` (\`registry\`, \`category\`, \`ts\`) ` +
      ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    await query(sql)
  })()
  // If the ensure itself fails, reset so subsequent calls retry
  ensurePromise.catch(() => { ensurePromise = null })
  return ensurePromise
}

/**
 * Records one mapping change row to `bgs_mapping_audit`.
 * Best-effort: any error is swallowed (printed to stderr) and never rethrown.
 * No-op if oldValue === newValue (identical — nothing changed).
 */
export async function recordMappingChange(entry: AuditEntry): Promise<void> {
  // Skip no-op writes
  if (entry.oldValue === entry.newValue) return
  // Normalise: treat both null and '' as null for comparison purposes
  const norm = (v: string | null) => (v === '' ? null : v)
  if (norm(entry.oldValue) === norm(entry.newValue)) return

  try {
    await ensureAuditTable()
    const sql =
      `INSERT INTO \`${AUDIT_TABLE}\` (\`ts\`, \`registry\`, \`category\`, \`code\`, \`field\`, \`old_value\`, \`new_value\`, \`actor\`) ` +
      'VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?)'
    const params: (string | null)[] = [
      entry.registry,
      entry.category,
      entry.code,
      entry.field,
      norm(entry.oldValue),
      norm(entry.newValue),
      entry.actor,
    ]
    await query(sql, params)
  } catch (err) {
    // Audit is best-effort: log loudly but never propagate
    console.error('[audit] FAILED to write audit row:', err instanceof Error ? err.message : String(err), entry)
  }
}

/**
 * Returns recent audit rows for a given registry + category, ordered by ts/id DESC.
 * `registry` and `category` come from the route / registry (not raw user input),
 * but we still parameterize them as values in the query.
 */
export async function getAudit(
  registry: 'basic' | 'eclaim',
  category: string,
  limit = 100,
): Promise<AuditRow[]> {
  await ensureAuditTable()
  const safeLimit = Math.max(1, Math.min(Number.isFinite(limit) ? Math.floor(limit) : 100, 1000))
  const sql =
    `SELECT \`ts\`, \`code\`, \`field\`, \`old_value\`, \`new_value\`, \`actor\` ` +
    `FROM \`${AUDIT_TABLE}\` ` +
    'WHERE `registry` = ? AND `category` = ? ' +
    `ORDER BY \`ts\` DESC, \`id\` DESC ` +
    `LIMIT ${safeLimit}`
  const { rows } = await query(sql, [registry, category])
  return rows as unknown as AuditRow[]
}

/**
 * Returns the single most recent audit row for a registry+category,
 * or null if no rows exist.
 * Uses ORDER BY id DESC LIMIT 1 — parameterized; table/col names are literals.
 */
export async function getLastChange(
  registry: 'basic' | 'eclaim',
  category: string,
): Promise<AuditRow | null> {
  await ensureAuditTable()
  const sql =
    `SELECT \`id\`, \`ts\`, \`code\`, \`field\`, \`old_value\`, \`new_value\`, \`actor\` ` +
    `FROM \`${AUDIT_TABLE}\` ` +
    'WHERE `registry` = ? AND `category` = ? ' +
    `ORDER BY \`id\` DESC ` +
    'LIMIT 1'
  const { rows } = await query(sql, [registry, category])
  const arr = rows as unknown as AuditRow[]
  return arr.length > 0 ? arr[0]! : null
}

/**
 * Parses an audit field string ('std_code' | 'std_code2' | 'std_code_e{i}')
 * and returns a structured resolution object for selecting the correct SQL builder.
 *
 * Throws if the field string is unrecognised.
 */
export function resolveAuditField(field: string): AuditFieldResolution {
  if (field === 'std_code') return { kind: 'primary' }
  if (field === 'std_code2') return { kind: 'secondary' }
  const extraMatch = /^std_code_e(\d+)$/.exec(field)
  if (extraMatch) {
    return { kind: 'extra', index: parseInt(extraMatch[1]!, 10) }
  }
  throw new Error(`resolveAuditField: unrecognised field '${field}'`)
}

/** Resets the memoized ensure-promise (for testing only). */
export function _resetEnsureForTest(): void {
  ensurePromise = null
}
