/**
 * Optional validation rule for a std-code value (mirrors backend StdRule).
 * Returned by GET / list endpoints in the category meta (F6).
 */
export interface StdRule {
  pattern?: string   // RegExp pattern string to test against the value
  minLen?: number    // minimum length (inclusive)
  maxLen?: number    // maximum length (inclusive)
  message: string    // Thai user-facing message shown when validation fails
}

/**
 * Pure frontend mirror of the backend validateStdValue helper (F6).
 * Returns {ok:true} when:
 *   - rule is undefined (no rule configured), OR
 *   - value is '' (empty = clearing the mapping; always allowed).
 * Otherwise checks minLen, maxLen, pattern in sequence.
 * A malformed pattern string is treated as a pass (never throws).
 */
export function validateStdValue(
  rule: StdRule | undefined,
  value: string,
): { ok: boolean; message?: string } {
  if (!rule) return { ok: true }
  if (value === '') return { ok: true }
  if (rule.minLen !== undefined && value.length < rule.minLen) {
    return { ok: false, message: rule.message }
  }
  if (rule.maxLen !== undefined && value.length > rule.maxLen) {
    return { ok: false, message: rule.message }
  }
  if (rule.pattern !== undefined) {
    try {
      const re = new RegExp(rule.pattern)
      if (!re.test(value)) return { ok: false, message: rule.message }
    } catch {
      // Bad regex → treat as pass
    }
  }
  return { ok: true }
}

/** Metadata for one extra editable column (returned by GET / list endpoint). */
export interface ExtraFieldMeta {
  label: string
  hasOptions: boolean
  rule?: StdRule  // additive (F6): optional validation rule for this extra field
}

export interface BasicRow {
  code: string
  name: string
  std_code: string | null
  std_name: string | null
  mapped: boolean
  // Optional secondary mapping fields (present for dual categories only)
  std_code2?: string | null
  std_name2?: string | null
  // Optional N-field extra columns — std_code_e0, std_code_e1, …, std_name_e0, …
  [key: string]: string | null | boolean | undefined
}

/** Returns true if a row has secondary mapping data (std_code2 key is present) */
export function isDualRow(row: BasicRow): boolean {
  return 'std_code2' in row
}

export function isUnmapped(row: BasicRow): boolean {
  return !row.mapped || row.std_code == null || row.std_code === ''
}

export function summarize(rows: BasicRow[]): { total: number; unmapped: number } {
  return { total: rows.length, unmapped: rows.filter(isUnmapped).length }
}

export function normalizeName(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export interface StdOption { code: string; name: string }

// case-insensitive substring match on code OR name; empty query → all
export function filterOptions(options: StdOption[], query: string): StdOption[] {
  const q = normalizeName(query)
  if (!q) return options
  return options.filter(o =>
    o.code.toLowerCase().includes(q) || normalizeName(o.name).includes(q))
}

// For each UNMAPPED row, if exactly one option has the same normalized name,
// suggest mapping that row.code -> option.code. Skips rows already mapped and
// ambiguous (0 or >1 name matches).
export function autoMatchSuggestions(
  rows: BasicRow[], options: StdOption[]
): { code: string; std_code: string }[] {
  const out: { code: string; std_code: string }[] = []
  for (const row of rows) {
    if (!isUnmapped(row)) continue
    const target = normalizeName(row.name)
    if (!target) continue
    const hits = options.filter(o => normalizeName(o.name) === target)
    if (hits.length === 1) out.push({ code: row.code, std_code: hits[0]!.code })
  }
  return out
}

// Filters rows by a free-text query across all code/name fields.
// Normalises via normalizeName() so Thai diacritics and case are handled uniformly.
// Empty / whitespace-only query returns ALL rows unchanged.
// Also searches any extra field columns (std_code_e0, std_name_e0, …) present on the row.
export function filterRows(rows: BasicRow[], query: string): BasicRow[] {
  const q = normalizeName(query)
  if (!q) return rows
  return rows.filter(r => {
    if (
      r.code.toLowerCase().includes(q) ||
      normalizeName(r.name as string).includes(q) ||
      normalizeName((r.std_code as string) ?? '').includes(q) ||
      normalizeName((r.std_name as string) ?? '').includes(q) ||
      normalizeName((r.std_code2 as string) ?? '').includes(q) ||
      normalizeName((r.std_name2 as string) ?? '').includes(q)
    ) return true
    // Search extra fields dynamically
    let i = 0
    while (`std_code_e${i}` in r) {
      if (normalizeName((r[`std_code_e${i}`] as string) ?? '').includes(q)) return true
      if (normalizeName((r[`std_name_e${i}`] as string) ?? '').includes(q)) return true
      i++
    }
    return false
  })
}

/**
 * Resolves what value to commit when the user submits a combobox query.
 *
 * Priority:
 *   1. If query exactly matches an option's code → return that option's code.
 *   2. If query exactly matches an option's name (normalised) → return that option's code.
 *   3. If query is non-empty (trimmed) → return the raw trimmed query (free-text/custom code).
 *   4. Empty query → return '' (clear mapping / "ยังไม่ map").
 *
 * This is a pure helper so it can be TDD-tested independently of the component.
 */
export function resolveComboCommit(query: string, options: StdOption[]): string {
  const trimmed = query.trim()
  if (!trimmed) return ''
  // Exact code match (case-insensitive)
  const byCode = options.find(o => o.code.toLowerCase() === trimmed.toLowerCase())
  if (byCode) return byCode.code
  // Exact name match (normalised)
  const normQ = normalizeName(trimmed)
  const byName = options.find(o => normalizeName(o.name) === normQ)
  if (byName) return byName.code
  // No match → commit the raw typed string
  return trimmed
}

/**
 * Build the import result summary string from the backend response.
 * e.g. "อัปเดต 5 · ข้าม 2 · ผิดพลาด 0"
 */
export function buildImportSummary(updated: number, skipped: number, errors: number): string {
  return `อัปเดต ${updated} · ข้าม ${skipped} · ผิดพลาด ${errors}`
}

/**
 * Per-category result from the bulk auto-match response.
 */
export interface BulkMatchCategoryResult {
  category: string
  label: string
  matched: number
  unmatched: number
  skippedPending?: boolean
}

/**
 * Full response shape from POST /_auto-match-all.
 */
export interface BulkMatchResult {
  totalCategories: number
  totalMatched: number
  results: BulkMatchCategoryResult[]
  errors: { category: string; error: string }[]
}

/**
 * Builds a one-line summary banner for the bulk auto-match operation.
 * e.g. "จับคู่อัตโนมัติทุกหมวด: 12 รายการ จาก 30 หมวด"
 */
export function buildBulkMatchSummary(result: BulkMatchResult): string {
  return `จับคู่อัตโนมัติทุกหมวด: ${result.totalMatched} รายการ จาก ${result.totalCategories} หมวด`
}

/**
 * Formats the undo success banner text.
 * e.g. "ย้อนแล้ว: 05 กลับเป็น 0100" or "ย้อนแล้ว: 05 กลับเป็น (ว่าง)"
 */
export function formatRevertBanner(code: string, to: string | null): string {
  const toDisplay = to != null && to !== '' ? to : '(ว่าง)'
  return `ย้อนแล้ว: ${code} กลับเป็น ${toDisplay}`
}

/**
 * Converts the `categories` array from a `/_summary` response into a plain
 * Record mapping category key → unmapped count.
 *
 * Rules:
 *   - pending categories are excluded (no badge shown for pending)
 *   - categories with unmapped == null | undefined | 0 are excluded
 *   - only categories with unmapped > 0 and not pending are included
 */
export function summaryToUnmappedMap(
  categories: { key: string; unmapped?: number | null; pending?: boolean }[],
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const cat of categories) {
    if (cat.pending) continue
    const count = cat.unmapped ?? 0
    if (count > 0) result[cat.key] = count
  }
  return result
}

export type SortKey = 'code' | 'name' | 'std_code' | 'std_code2'
export type SortDir = 'asc' | 'desc'

// Returns a NEW array sorted by the given field. Thai/locale-aware string
// compare; null/undefined/'' always sort to the end regardless of dir.
export function sortRows(rows: BasicRow[], key: SortKey, dir: SortDir): BasicRow[] {
  const factor = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = (a[key] ?? '') as string
    const bv = (b[key] ?? '') as string
    const ae = av === '', be = bv === ''
    if (ae && be) return 0
    if (ae) return 1            // empties last
    if (be) return -1
    return av.localeCompare(bv, 'th', { numeric: true, sensitivity: 'base' }) * factor
  })
}
