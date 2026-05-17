/**
 * search.ts — pure helpers for F7 global cross-category search.
 *
 * All functions are pure (no DB, no side-effects) so they can be
 * TDD-tested without mocks.
 */

/**
 * Mirrors the frontend normalizeName from basicConfigUtils.ts.
 * Trims, lowercases, and collapses whitespace.
 * Returns '' for null/undefined input.
 */
export function normalizeName(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * A DB row returned by buildListSql (any category).
 * Only the fields used by the search are typed; extra fields (std_code2, etc.)
 * are present but may be absent — we accept them via the index signature.
 */
export interface SearchRow {
  code: string | null
  name: string | null
  std_code: string | null
  std_name: string | null
  mapped: number | boolean
  [key: string]: unknown
}

/**
 * Returns true if the row matches the query (case/space-insensitive substring
 * match via normalizeName). The query must be non-empty (the /_search route
 * requires q ≥ 1 char after trimming).
 *
 * Fields checked: code, name, std_code, std_name.
 * std_code2 / std_name2 are intentionally NOT checked here to keep the
 * helper focused; the route filters in memory after buildListSql already
 * returns these columns in the row, so callers may extend if needed.
 */
export function matchRow(row: SearchRow, q: string): boolean {
  const norm = normalizeName(q)
  if (!norm) return false
  return (
    normalizeName(String(row.code ?? '')).includes(norm) ||
    normalizeName(String(row.name ?? '')).includes(norm) ||
    normalizeName(String(row.std_code ?? '')).includes(norm) ||
    normalizeName(String(row.std_name ?? '')).includes(norm)
  )
}

/** One result row in the grouped search response. */
export interface SearchResultRow {
  category: string
  label: string
  code: string
  name: string
  std_code: string | null
  std_name: string | null
  mapped: boolean
}

/** One category group in the search response. */
export interface SearchGroup {
  category: string
  label: string
  count: number
  rows: SearchResultRow[]
}

/** Input to searchRowsAcross: per-category metadata + raw DB rows. */
export interface CategoryInput {
  key: string
  label: string
  rows: SearchRow[]
}

/**
 * Pure function: given an array of { key, label, rows } and a non-empty
 * normalised query, produce the grouped result sorted by count desc then label.
 *
 * limit is the maximum number of result rows kept per category.
 *
 * Only categories with ≥1 match are included in the output.
 */
export function searchRowsAcross(
  categories: CategoryInput[],
  q: string,
  limit: number,
): SearchGroup[] {
  const groups: SearchGroup[] = []

  for (const cat of categories) {
    const matched: SearchResultRow[] = []
    for (const row of cat.rows) {
      if (matched.length >= limit) break
      if (matchRow(row, q)) {
        matched.push({
          category: cat.key,
          label: cat.label,
          code: String(row.code ?? ''),
          name: String(row.name ?? ''),
          std_code: (row.std_code as string | null) ?? null,
          std_name: (row.std_name as string | null) ?? null,
          mapped: !!(row.mapped) && row.std_code != null && row.std_code !== '',
        })
      }
    }
    if (matched.length > 0) {
      groups.push({ category: cat.key, label: cat.label, count: matched.length, rows: matched })
    }
  }

  // Sort: most matches first; ties broken by label (Thai-locale-aware)
  groups.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.label.localeCompare(b.label, 'th')
  })

  return groups
}
