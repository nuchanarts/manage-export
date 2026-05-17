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
