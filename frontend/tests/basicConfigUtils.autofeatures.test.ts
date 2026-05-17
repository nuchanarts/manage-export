import {
  normalizeName,
  filterOptions,
  autoMatchSuggestions,
  BasicRow,
  StdOption,
} from '../src/data/basicConfigUtils'

// ─── normalizeName ───────────────────────────────────────────────────────────
describe('normalizeName', () => {
  it('trims leading and trailing whitespace', () => {
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

// ─── filterOptions ────────────────────────────────────────────────────────────
describe('filterOptions', () => {
  const opts: StdOption[] = [
    { code: 'A01', name: 'อุบัติเหตุ' },
    { code: 'B10', name: 'ฉุกเฉิน' },
    { code: 'C99', name: 'Routine Care' },
  ]

  it('empty query returns all options', () => {
    expect(filterOptions(opts, '')).toEqual(opts)
  })

  it('whitespace-only query returns all options', () => {
    expect(filterOptions(opts, '   ')).toEqual(opts)
  })

  it('matches on code substring (case-insensitive)', () => {
    expect(filterOptions(opts, 'a01')).toEqual([{ code: 'A01', name: 'อุบัติเหตุ' }])
    expect(filterOptions(opts, 'A01')).toEqual([{ code: 'A01', name: 'อุบัติเหตุ' }])
  })

  it('matches on name substring case-insensitively', () => {
    expect(filterOptions(opts, 'routine')).toEqual([{ code: 'C99', name: 'Routine Care' }])
    expect(filterOptions(opts, 'ROUTINE')).toEqual([{ code: 'C99', name: 'Routine Care' }])
  })

  it('returns empty array when no match', () => {
    expect(filterOptions(opts, 'zzz')).toEqual([])
  })

  it('matches partial code', () => {
    const result = filterOptions(opts, 'B')
    expect(result).toEqual([{ code: 'B10', name: 'ฉุกเฉิน' }])
  })

  it('returns multiple matches when applicable', () => {
    const result = filterOptions(opts, '1')
    // 'A01' contains '1', 'B10' contains '1'
    expect(result).toHaveLength(2)
  })
})

// ─── autoMatchSuggestions ────────────────────────────────────────────────────
describe('autoMatchSuggestions', () => {
  const opts: StdOption[] = [
    { code: 'S01', name: 'อุบัติเหตุ' },
    { code: 'S02', name: 'ฉุกเฉิน' },
    { code: 'S03', name: 'Duplicate Name' },
    { code: 'S04', name: 'Duplicate Name' },
  ]

  it('suggests mapping for an unmapped row whose name matches exactly one option (case/space-insensitively)', () => {
    const rows: BasicRow[] = [
      { code: 'R01', name: 'อุบัติเหตุ', std_code: null, std_name: null, mapped: false },
    ]
    expect(autoMatchSuggestions(rows, opts)).toEqual([{ code: 'R01', std_code: 'S01' }])
  })

  it('normalises name before matching (different casing)', () => {
    const rows: BasicRow[] = [
      { code: 'R01', name: 'อุบัติเหตุ', std_code: null, std_name: null, mapped: false },
    ]
    // Thai uppercase vs lowercase—normalizeName lowercases, so if Thai letters are
    // already consistent this should match.  More importantly, test Latin names:
    const latinOpts: StdOption[] = [{ code: 'L01', name: 'Routine Care' }]
    const latinRows: BasicRow[] = [
      { code: 'R02', name: '  ROUTINE  CARE  ', std_code: null, std_name: null, mapped: false },
    ]
    expect(autoMatchSuggestions(latinRows, latinOpts)).toEqual([{ code: 'R02', std_code: 'L01' }])
  })

  it('skips already-mapped rows', () => {
    const rows: BasicRow[] = [
      { code: 'R01', name: 'อุบัติเหตุ', std_code: 'S01', std_name: null, mapped: true },
    ]
    expect(autoMatchSuggestions(rows, opts)).toEqual([])
  })

  it('skips rows with zero matching options', () => {
    const rows: BasicRow[] = [
      { code: 'R01', name: 'ไม่มีในรายการ', std_code: null, std_name: null, mapped: false },
    ]
    expect(autoMatchSuggestions(rows, opts)).toEqual([])
  })

  it('skips ambiguous rows (≥2 options share the name)', () => {
    const rows: BasicRow[] = [
      { code: 'R01', name: 'Duplicate Name', std_code: null, std_name: null, mapped: false },
    ]
    expect(autoMatchSuggestions(rows, opts)).toEqual([])
  })

  it('skips rows with empty name', () => {
    const rows: BasicRow[] = [
      { code: 'R01', name: '', std_code: null, std_name: null, mapped: false },
    ]
    expect(autoMatchSuggestions(rows, opts)).toEqual([])
  })

  it('handles multiple rows: mixes matched, skipped-mapped, skipped-zero, skipped-ambiguous', () => {
    const rows: BasicRow[] = [
      { code: 'R01', name: 'อุบัติเหตุ', std_code: null, std_name: null, mapped: false },   // match
      { code: 'R02', name: 'ฉุกเฉิน',   std_code: 'S02', std_name: null, mapped: true },    // already mapped
      { code: 'R03', name: 'Duplicate Name', std_code: null, std_name: null, mapped: false }, // ambiguous
      { code: 'R04', name: 'ไม่มี',      std_code: null, std_name: null, mapped: false },    // zero match
    ]
    expect(autoMatchSuggestions(rows, opts)).toEqual([{ code: 'R01', std_code: 'S01' }])
  })
})
