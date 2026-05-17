export interface BasicRow {
  code: string
  name: string
  std_code: string | null
  std_name: string | null
  mapped: boolean
  // Optional secondary mapping fields (present for dual categories only)
  std_code2?: string | null
  std_name2?: string | null
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
export function filterRows(rows: BasicRow[], query: string): BasicRow[] {
  const q = normalizeName(query)
  if (!q) return rows
  return rows.filter(r =>
    r.code.toLowerCase().includes(q) ||
    normalizeName(r.name).includes(q) ||
    normalizeName(r.std_code ?? '').includes(q) ||
    normalizeName(r.std_name ?? '').includes(q) ||
    normalizeName(r.std_code2 ?? '').includes(q) ||
    normalizeName(r.std_name2 ?? '').includes(q))
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
