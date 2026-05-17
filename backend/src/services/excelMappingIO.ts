/**
 * excelMappingIO.ts
 *
 * Pure helpers for Excel ↔ category mapping I/O.
 * No Express / DB / ExcelJS imports so these are fast unit-testable.
 */

import type { CategoryDef } from './categoryRegistry'

// ─── Column target descriptors ────────────────────────────────────────────────

export type ColumnTarget =
  | { kind: 'code' }
  | { kind: 'std_code' }
  | { kind: 'std_code2' }
  | { kind: 'extra'; index: number }

export interface ColumnMapping {
  colIndex: number
  target: ColumnTarget
}

/**
 * Given the header row cells (array of string | null values at index 0, 1, 2, …)
 * and a CategoryDef, returns the mappings from column index → target field.
 *
 * Rules:
 *  - "รหัส (HIS)"  → code
 *  - "ชื่อ (HIS)"  → ignored (name is read-only)
 *  - primary std header (c.field1Label || "รหัสมาตรฐาน")  → std_code
 *  - secondary std header (c.field2Label) → std_code2 (only for dual categories)
 *  - extra field label  → extra:{index}
 *  Unknown headers are silently ignored.
 */
export function mapHeaderRowToFields(
  headerCells: (string | null | undefined)[],
  c: CategoryDef,
): ColumnMapping[] {
  const primaryLabel = c.field1Label ?? 'รหัสมาตรฐาน'
  const mappings: ColumnMapping[] = []

  for (let i = 0; i < headerCells.length; i++) {
    const cell = (headerCells[i] ?? '').trim()
    if (!cell) continue

    if (cell === 'รหัส (HIS)') {
      mappings.push({ colIndex: i, target: { kind: 'code' } })
      continue
    }
    // 'ชื่อ (HIS)' → skip (read-only)
    if (cell === 'ชื่อ (HIS)') continue

    if (cell === primaryLabel) {
      mappings.push({ colIndex: i, target: { kind: 'std_code' } })
      continue
    }

    if (c.mapCol2 && c.field2Label && cell === c.field2Label) {
      mappings.push({ colIndex: i, target: { kind: 'std_code2' } })
      continue
    }

    if (c.extraFields) {
      for (let ei = 0; ei < c.extraFields.length; ei++) {
        if (cell === c.extraFields[ei]!.label) {
          mappings.push({ colIndex: i, target: { kind: 'extra', index: ei } })
          break
        }
      }
    }
  }

  return mappings
}

/**
 * Normalise a spreadsheet cell value to either a non-empty string or null.
 * Empty string / whitespace-only / undefined → null (same semantics as PUT '' → null).
 */
export function normalizeCellValue(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  const s = String(raw).trim()
  return s === '' ? null : s
}

/**
 * Build the import summary text for display in the UI.
 * e.g. "อัปเดต 5 · ข้าม 2 · ผิดพลาด 0"
 */
export function buildImportSummary(updated: number, skipped: number, errors: number): string {
  return `อัปเดต ${updated} · ข้าม ${skipped} · ผิดพลาด ${errors}`
}
