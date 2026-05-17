// backend/tests/unit/search.test.ts
// TDD unit tests for F7 search helpers (normalizeName, matchRow, searchRowsAcross).
// All pure — no mocks required.

import { normalizeName, matchRow, searchRowsAcross, SearchRow, CategoryInput } from '../../src/services/search'

// ─── normalizeName ────────────────────────────────────────────────────────────
describe('normalizeName', () => {
  it('returns empty string for null', () => {
    expect(normalizeName(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(normalizeName(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(normalizeName('')).toBe('')
  })

  it('trims leading/trailing whitespace', () => {
    expect(normalizeName('  hello  ')).toBe('hello')
  })

  it('lowercases ASCII', () => {
    expect(normalizeName('ABC')).toBe('abc')
  })

  it('collapses inner whitespace to single space', () => {
    expect(normalizeName('a  b   c')).toBe('a b c')
  })

  it('handles Thai text (passthrough; no case change expected)', () => {
    expect(normalizeName(' เกษตรกร ')).toBe('เกษตรกร')
  })

  it('lowercases mixed English inside Thai', () => {
    expect(normalizeName('คลินิก ABC')).toBe('คลินิก abc')
  })
})

// ─── matchRow ─────────────────────────────────────────────────────────────────
const baseRow: SearchRow = {
  code: '05',
  name: 'เกษตรกร',
  std_code: '0510',
  std_name: 'Farmer',
  mapped: 1,
}

describe('matchRow', () => {
  it('matches on code (exact)', () => {
    expect(matchRow(baseRow, '05')).toBe(true)
  })

  it('matches on code (substring)', () => {
    expect(matchRow(baseRow, '5')).toBe(true)
  })

  it('matches on name (Thai)', () => {
    expect(matchRow(baseRow, 'เกษตรกร')).toBe(true)
  })

  it('matches on name (partial Thai)', () => {
    expect(matchRow(baseRow, 'เกษตร')).toBe(true)
  })

  it('matches on std_code', () => {
    expect(matchRow(baseRow, '0510')).toBe(true)
  })

  it('matches on std_name (English, case-insensitive)', () => {
    expect(matchRow(baseRow, 'farmer')).toBe(true)
  })

  it('matches on std_name (mixed case)', () => {
    expect(matchRow(baseRow, 'FARMER')).toBe(true)
  })

  it('returns false for non-matching query', () => {
    expect(matchRow(baseRow, 'xxxxnotfound')).toBe(false)
  })

  it('returns false for empty query', () => {
    // In the /_search route, empty q is rejected at 400; matchRow itself
    // returns false for empty to be safe.
    expect(matchRow(baseRow, '')).toBe(false)
  })

  it('returns false for whitespace-only query', () => {
    expect(matchRow(baseRow, '   ')).toBe(false)
  })

  it('handles null std_code gracefully', () => {
    const row: SearchRow = { ...baseRow, std_code: null, std_name: null }
    // Should match on name, not crash on null fields
    expect(matchRow(row, 'เกษตรกร')).toBe(true)
    expect(matchRow(row, 'farmer')).toBe(false)
  })

  it('handles null name gracefully', () => {
    const row: SearchRow = { ...baseRow, name: null }
    // Should still match on code
    expect(matchRow(row, '05')).toBe(true)
  })

  it('handles null code gracefully', () => {
    const row: SearchRow = { ...baseRow, code: null }
    expect(matchRow(row, 'เกษตรกร')).toBe(true)
  })

  it('space-normalised query matches name with extra spaces', () => {
    const row: SearchRow = { ...baseRow, name: 'เกษตร  กร' }
    // Both query and name are normalised, so spaces are collapsed
    expect(matchRow(row, 'เกษตร กร')).toBe(true)
  })
})

// ─── searchRowsAcross ─────────────────────────────────────────────────────────
describe('searchRowsAcross', () => {
  const cat1: CategoryInput = {
    key: 'occupation',
    label: 'อาชีพ',
    rows: [
      { code: '05', name: 'เกษตรกร', std_code: '0510', std_name: 'Farmer', mapped: 1 },
      { code: '06', name: 'แพทย์', std_code: '0600', std_name: 'Doctor', mapped: 1 },
      { code: '07', name: 'ยังไม่ map', std_code: null, std_name: null, mapped: 0 },
    ],
  }

  const cat2: CategoryInput = {
    key: 'religion',
    label: 'ศาสนา',
    rows: [
      { code: '1', name: 'พุทธ', std_code: 'B', std_name: 'Buddhism', mapped: 1 },
      { code: '2', name: 'คริสต์', std_code: null, std_name: null, mapped: 0 },
    ],
  }

  it('returns only categories with ≥1 match', () => {
    const result = searchRowsAcross([cat1, cat2], 'เกษตรกร', 20)
    expect(result).toHaveLength(1)
    expect(result[0]!.category).toBe('occupation')
  })

  it('returns rows with correct shape', () => {
    const result = searchRowsAcross([cat1], 'เกษตรกร', 20)
    expect(result[0]!.rows[0]).toMatchObject({
      category: 'occupation',
      label: 'อาชีพ',
      code: '05',
      name: 'เกษตรกร',
      std_code: '0510',
      std_name: 'Farmer',
      mapped: true,
    })
  })

  it('sets mapped=false when std_code is null', () => {
    const result = searchRowsAcross([cat1], 'ยังไม่ map', 20)
    expect(result[0]!.rows[0]!.mapped).toBe(false)
  })

  it('sets mapped=false when std_code is empty string', () => {
    const row: SearchRow = { code: 'X', name: 'test', std_code: '', std_name: null, mapped: 1 }
    const result = searchRowsAcross(
      [{ key: 'k', label: 'L', rows: [row] }],
      'test',
      20,
    )
    expect(result[0]!.rows[0]!.mapped).toBe(false)
  })

  it('respects limit per category', () => {
    // Build rows where all 3 match the query 'xyz', and limit=2 should cap at 2
    const bigCat: CategoryInput = {
      key: 'test',
      label: 'Test',
      rows: [
        { code: '1', name: 'xyz-a', std_code: null, std_name: null, mapped: 0 },
        { code: '2', name: 'xyz-b', std_code: null, std_name: null, mapped: 0 },
        { code: '3', name: 'xyz-c', std_code: null, std_name: null, mapped: 0 },
      ],
    }
    const result = searchRowsAcross([bigCat], 'xyz', 2)
    expect(result).toHaveLength(1)
    expect(result[0]!.rows.length).toBe(2)
  })

  it('sorts groups by count desc then label asc', () => {
    // cat2 (religion) will have 2 matches on 'า' (พุทธ has า? no — use a match that hits 2 in cat2, 1 in cat1)
    const catA: CategoryInput = {
      key: 'zzz',
      label: 'ZZZ',
      rows: [
        { code: '1', name: 'alpha', std_code: 'A', std_name: 'Alpha', mapped: 1 },
      ],
    }
    const catB: CategoryInput = {
      key: 'aaa',
      label: 'AAA',
      rows: [
        { code: '1', name: 'alpha', std_code: 'A', std_name: 'Alpha', mapped: 1 },
        { code: '2', name: 'alphabet', std_code: 'B', std_name: 'Alphabet', mapped: 1 },
      ],
    }
    // catB has 2 matches on 'alpha', catA has 1 → catB first
    const result = searchRowsAcross([catA, catB], 'alpha', 20)
    expect(result[0]!.category).toBe('aaa')  // higher count
    expect(result[1]!.category).toBe('zzz')
  })

  it('ties in count broken by label asc', () => {
    const catA: CategoryInput = {
      key: 'b-cat',
      label: 'Beta',
      rows: [{ code: '1', name: 'test', std_code: null, std_name: null, mapped: 0 }],
    }
    const catB: CategoryInput = {
      key: 'a-cat',
      label: 'Alpha',
      rows: [{ code: '2', name: 'test', std_code: null, std_name: null, mapped: 0 }],
    }
    const result = searchRowsAcross([catA, catB], 'test', 20)
    expect(result[0]!.label).toBe('Alpha')
    expect(result[1]!.label).toBe('Beta')
  })

  it('returns empty array when no categories match', () => {
    const result = searchRowsAcross([cat1, cat2], 'xxxxnotfound', 20)
    expect(result).toHaveLength(0)
  })

  it('handles empty categories array', () => {
    const result = searchRowsAcross([], 'test', 20)
    expect(result).toHaveLength(0)
  })

  it('includes count equal to rows.length in the group', () => {
    const result = searchRowsAcross([cat1], 'แพทย์', 20)
    expect(result[0]!.count).toBe(result[0]!.rows.length)
  })
})
