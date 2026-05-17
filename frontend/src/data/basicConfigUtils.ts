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
