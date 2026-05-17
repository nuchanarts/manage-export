/**
 * autoMatch.ts
 *
 * Pure helper that mirrors the frontend autoMatchSuggestions() rule:
 *   - For each UNMAPPED row (mapped===false OR std_code is null/empty),
 *     if exactly ONE option has the same normalized name → suggest mapping.
 *   - Skip rows with empty name, already-mapped rows, and ambiguous (0 or >1) matches.
 *
 * This is intentionally dependency-free (no DB, no express) so it can be
 * unit-tested in isolation and reused in the POST /_auto-match-all route.
 */

export interface AmRow {
  code: string
  name: string
  std_code: string | null
  mapped: boolean
}

export interface AmOption {
  code: string
  name: string
}

/**
 * Normalises a name for comparison: trim, lowercase, collapse whitespace.
 * null/undefined → ''.
 * Same semantics as frontend basicConfigUtils.normalizeName().
 */
export function normalizeName(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * For each unmapped row, if exactly one option has the same normalized name,
 * returns a suggestion { code, std_code }.
 *
 * Unmapped = !mapped || std_code == null || std_code === ''.
 * Skips rows with empty name. Skips 0 or >1 option matches (ambiguous).
 */
export function autoMatchSuggestions(
  rows: AmRow[],
  options: AmOption[],
): { code: string; std_code: string }[] {
  const out: { code: string; std_code: string }[] = []
  for (const row of rows) {
    // Skip already-mapped rows
    if (row.mapped && row.std_code != null && row.std_code !== '') continue
    const target = normalizeName(row.name)
    // Skip empty names
    if (!target) continue
    // Find matching options
    const hits = options.filter(o => normalizeName(o.name) === target)
    // Only suggest when exactly one match
    if (hits.length === 1) {
      out.push({ code: row.code, std_code: hits[0]!.code })
    }
  }
  return out
}
