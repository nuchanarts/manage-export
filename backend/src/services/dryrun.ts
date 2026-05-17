/**
 * dryrun.ts — pure helper for F12 dry-run export simulation.
 *
 * buildDryRunResult() is the pure aggregation/sampling/status function.
 * It has no DB calls and is fully unit-testable.
 *
 * Mapped predicate (mirrors F4 / /:category route):
 *   mapped = !!row.mapped && row.std_code != null && row.std_code !== ''
 */

export interface DryRunSample {
  code: string
  name: string
}

export interface DryRunCategoryResult {
  key: string
  label: string
  /** true for pending categories (not queried) */
  pending?: true
  /** true for categories that threw an error during DB query */
  error?: true
  /** number of unmapped rows; absent for pending/error entries */
  unmappedCount?: number
  /** up to sampleLimit failing {code,name} pairs; absent for pending/error entries */
  samples?: DryRunSample[]
}

export interface DryRunResult {
  registry?: string
  status: 'PASS' | 'FAIL'
  totalCategories: number
  categoriesWithIssues: number
  totalUnmapped: number
  results: DryRunCategoryResult[]
}

/**
 * Input shape for each category fed to buildDryRunResult.
 * The route gathers rows from DB then calls this pure function.
 */
export interface DryRunCategoryInput {
  key: string
  label: string
  /** true = pending (do not query, do not count toward status) */
  pending?: boolean
  /** true = a DB error occurred for this category */
  error?: boolean
  /** raw rows from buildListSql() — present when !pending && !error */
  rows?: {
    code: unknown
    name: unknown
    mapped: number | boolean | null | undefined
    std_code: string | null | undefined
    [key: string]: unknown
  }[]
}

/**
 * Pure aggregation helper. Takes per-category inputs (with rows already fetched)
 * and returns the complete DryRunResult shape.
 *
 * @param perCategory  Array of category inputs (pending/error/rows).
 * @param sampleLimit  Maximum number of failing entries to include per category.
 * @param registry     Optional registry name echoed back in the result.
 */
export function buildDryRunResult(
  perCategory: DryRunCategoryInput[],
  sampleLimit: number,
  registry?: string,
): DryRunResult {
  let totalUnmapped = 0
  let categoriesWithIssues = 0

  const results: DryRunCategoryResult[] = perCategory.map(cat => {
    // ── Pending: skip querying, skip status contribution ──────────────────
    if (cat.pending) {
      return { key: cat.key, label: cat.label, pending: true as const }
    }

    // ── Error: no counts, no samples; do not contribute to totals ─────────
    if (cat.error) {
      return { key: cat.key, label: cat.label, error: true as const }
    }

    // ── Normal: compute unmapped rows ─────────────────────────────────────
    const rows = cat.rows ?? []
    const unmappedRows = rows.filter(
      r => !(!!r.mapped && r.std_code != null && r.std_code !== ''),
    )
    const unmappedCount = unmappedRows.length

    // Collect samples (capped)
    const samples: DryRunSample[] = unmappedRows.slice(0, sampleLimit).map(r => ({
      code: String(r.code ?? ''),
      name: String(r.name ?? ''),
    }))

    totalUnmapped += unmappedCount
    if (unmappedCount > 0) categoriesWithIssues++

    return {
      key: cat.key,
      label: cat.label,
      unmappedCount,
      samples,
    }
  })

  const status: 'PASS' | 'FAIL' = totalUnmapped === 0 ? 'PASS' : 'FAIL'

  return {
    ...(registry !== undefined ? { registry } : {}),
    status,
    totalCategories: perCategory.length,
    categoriesWithIssues,
    totalUnmapped,
    results,
  }
}
