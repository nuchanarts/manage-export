/**
 * dashboard.ts — pure helpers for the completeness dashboard (F4).
 *
 * `summarizeCounts` mirrors the mapped predicate used in configRouterFactory
 * and the /:category list endpoint:
 *   mapped = !!mapped && std_code != null && std_code !== ''
 */

export interface SummaryRow {
  mapped: number | boolean | null | undefined
  std_code: string | null | undefined
}

export interface CategoryCounts {
  total: number
  mapped: number
  unmapped: number
  /** null when total === 0 */
  percent: number | null
}

/**
 * Pure helper: given an array of rows from buildListSql(), compute
 * total / mapped / unmapped / percent for one category.
 *
 * Mirrors the mapped predicate:  !!row.mapped && row.std_code != null && row.std_code !== ''
 */
export function summarizeCounts(rows: SummaryRow[]): CategoryCounts {
  const total = rows.length
  const mapped = rows.filter(r => !!r.mapped && r.std_code != null && r.std_code !== '').length
  const unmapped = total - mapped
  const percent = total > 0 ? Math.round((mapped / total) * 100) : null
  return { total, mapped, unmapped, percent }
}
