// backend/tests/unit/autoMatch.test.ts
// TDD: RED → GREEN for the autoMatch helper (mirrors frontend autoMatchSuggestions)

import { normalizeName, autoMatchSuggestions, AmRow, AmOption } from '../../src/services/autoMatch'

// ─── normalizeName ────────────────────────────────────────────────────────────
describe('normalizeName', () => {
  it('trims leading/trailing whitespace', () => {
    expect(normalizeName('  hello  ')).toBe('hello')
  })

  it('lowercases the string', () => {
    expect(normalizeName('Hello World')).toBe('hello world')
  })

  it('collapses internal whitespace to a single space', () => {
    expect(normalizeName('hello   world')).toBe('hello world')
  })

  it('handles null → empty string', () => {
    expect(normalizeName(null)).toBe('')
  })

  it('handles undefined → empty string', () => {
    expect(normalizeName(undefined)).toBe('')
  })

  it('handles empty string', () => {
    expect(normalizeName('')).toBe('')
  })

  it('handles mixed: trim + lowercase + collapse', () => {
    expect(normalizeName('  HELLO   WORLD  ')).toBe('hello world')
  })
})

// ─── autoMatchSuggestions ─────────────────────────────────────────────────────
describe('autoMatchSuggestions', () => {
  const opts: AmOption[] = [
    { code: 'S01', name: 'อุบัติเหตุ' },
    { code: 'S02', name: 'ฉุกเฉิน' },
    { code: 'S03', name: 'Duplicate Name' },
    { code: 'S04', name: 'Duplicate Name' },
  ]

  it('returns empty array when options is empty', () => {
    const rows: AmRow[] = [
      { code: 'R01', name: 'อุบัติเหตุ', std_code: null, mapped: false },
    ]
    expect(autoMatchSuggestions(rows, [])).toEqual([])
  })

  it('returns empty array when rows is empty', () => {
    expect(autoMatchSuggestions([], opts)).toEqual([])
  })

  it('suggests mapping for an unmapped row whose name exactly matches one option (case/space-insensitively)', () => {
    const rows: AmRow[] = [
      { code: 'R01', name: 'อุบัติเหตุ', std_code: null, mapped: false },
    ]
    expect(autoMatchSuggestions(rows, opts)).toEqual([{ code: 'R01', std_code: 'S01' }])
  })

  it('normalises name before matching — trims and lowercases', () => {
    const latinOpts: AmOption[] = [{ code: 'L01', name: 'Routine Care' }]
    const latinRows: AmRow[] = [
      { code: 'R02', name: '  ROUTINE  CARE  ', std_code: null, mapped: false },
    ]
    expect(autoMatchSuggestions(latinRows, latinOpts)).toEqual([{ code: 'R02', std_code: 'L01' }])
  })

  it('skips already-mapped rows (mapped===true, std_code set)', () => {
    const rows: AmRow[] = [
      { code: 'R01', name: 'อุบัติเหตุ', std_code: 'S01', mapped: true },
    ]
    expect(autoMatchSuggestions(rows, opts)).toEqual([])
  })

  it('skips rows where std_code is non-null non-empty AND mapped is true', () => {
    const rows: AmRow[] = [
      { code: 'R01', name: 'อุบัติเหตุ', std_code: 'EXISTING', mapped: true },
    ]
    // Both mapped=true AND std_code is non-empty → treated as mapped → skip
    expect(autoMatchSuggestions(rows, opts)).toEqual([])
  })

  it('does NOT skip a row where mapped=false even if std_code is set (mirrors frontend isUnmapped)', () => {
    const rows: AmRow[] = [
      { code: 'R01', name: 'อุบัติเหตุ', std_code: 'EXISTING', mapped: false },
    ]
    // mapped=false triggers isUnmapped even if std_code has a value → eligible for auto-match
    expect(autoMatchSuggestions(rows, opts)).toEqual([{ code: 'R01', std_code: 'S01' }])
  })

  it('treats std_code null as unmapped even when mapped is false', () => {
    const rows: AmRow[] = [
      { code: 'R01', name: 'อุบัติเหตุ', std_code: null, mapped: false },
    ]
    expect(autoMatchSuggestions(rows, opts)).toHaveLength(1)
  })

  it('treats std_code "" as unmapped', () => {
    const rows: AmRow[] = [
      { code: 'R01', name: 'อุบัติเหตุ', std_code: '', mapped: false },
    ]
    expect(autoMatchSuggestions(rows, opts)).toHaveLength(1)
  })

  it('skips rows with zero matching options', () => {
    const rows: AmRow[] = [
      { code: 'R01', name: 'ไม่มีในรายการ', std_code: null, mapped: false },
    ]
    expect(autoMatchSuggestions(rows, opts)).toEqual([])
  })

  it('skips ambiguous rows (≥2 options share the same normalized name)', () => {
    const rows: AmRow[] = [
      { code: 'R01', name: 'Duplicate Name', std_code: null, mapped: false },
    ]
    expect(autoMatchSuggestions(rows, opts)).toEqual([])
  })

  it('skips rows with empty name', () => {
    const rows: AmRow[] = [
      { code: 'R01', name: '', std_code: null, mapped: false },
    ]
    expect(autoMatchSuggestions(rows, opts)).toEqual([])
  })

  it('handles multiple rows: mixes matched, skipped-mapped, skipped-zero, skipped-ambiguous', () => {
    const rows: AmRow[] = [
      { code: 'R01', name: 'อุบัติเหตุ', std_code: null, mapped: false },    // match
      { code: 'R02', name: 'ฉุกเฉิน',   std_code: 'S02', mapped: true },    // already mapped
      { code: 'R03', name: 'Duplicate Name', std_code: null, mapped: false }, // ambiguous
      { code: 'R04', name: 'ไม่มี',      std_code: null, mapped: false },    // zero match
    ]
    expect(autoMatchSuggestions(rows, opts)).toEqual([{ code: 'R01', std_code: 'S01' }])
  })

  it('handles multiple successful matches in one call', () => {
    const rows: AmRow[] = [
      { code: 'R01', name: 'อุบัติเหตุ', std_code: null, mapped: false },
      { code: 'R02', name: 'ฉุกเฉิน', std_code: null, mapped: false },
    ]
    expect(autoMatchSuggestions(rows, opts)).toEqual([
      { code: 'R01', std_code: 'S01' },
      { code: 'R02', std_code: 'S02' },
    ])
  })
})
