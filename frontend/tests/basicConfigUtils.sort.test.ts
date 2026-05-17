import { sortRows, BasicRow, SortKey, SortDir } from '../src/data/basicConfigUtils'

function makeRow(code: string, name: string, std_code: string | null = null, std_code2?: string | null): BasicRow {
  return { code, name, std_code, std_name: null, mapped: std_code != null && std_code !== '', std_code2 }
}

// ── sort by code ────────────────────────────────────────────────────────────
describe('sortRows by code', () => {
  const rows = [
    makeRow('B', 'beta'),
    makeRow('A', 'alpha'),
    makeRow('C', 'gamma'),
  ]

  it('sorts ascending', () => {
    const result = sortRows(rows, 'code', 'asc')
    expect(result.map(r => r.code)).toEqual(['A', 'B', 'C'])
  })

  it('sorts descending', () => {
    const result = sortRows(rows, 'code', 'desc')
    expect(result.map(r => r.code)).toEqual(['C', 'B', 'A'])
  })
})

// ── numeric: true so '10' sorts after '2' ──────────────────────────────────
describe('sortRows numeric code ordering', () => {
  const rows = [
    makeRow('10', 'ten'),
    makeRow('2', 'two'),
    makeRow('1', 'one'),
  ]

  it('sorts numerically ascending (1, 2, 10)', () => {
    const result = sortRows(rows, 'code', 'asc')
    expect(result.map(r => r.code)).toEqual(['1', '2', '10'])
  })
})

// ── Thai-aware sort by name ─────────────────────────────────────────────────
describe('sortRows Thai-aware by name', () => {
  // Thai alphabetical order: ก < ข < ค
  // 'กา' (ก) < 'ขนม' (ข) < 'คน' (ค)
  const rows = [
    makeRow('r1', 'ขนม'),
    makeRow('r2', 'กา'),
    makeRow('r3', 'คน'),
  ]

  it('sorts Thai asc: กา, ขนม, คน', () => {
    const result = sortRows(rows, 'name', 'asc')
    expect(result.map(r => r.name)).toEqual(['กา', 'ขนม', 'คน'])
  })

  it('sorts Thai desc: คน, ขนม, กา', () => {
    const result = sortRows(rows, 'name', 'desc')
    expect(result.map(r => r.name)).toEqual(['คน', 'ขนม', 'กา'])
  })
})

// ── null / '' always last in both directions ───────────────────────────────
describe('sortRows null/empty to end', () => {
  const rows = [
    makeRow('A', 'alpha', null),
    makeRow('B', 'beta', 'Z'),
    makeRow('C', 'gamma', ''),
    makeRow('D', 'delta', 'A'),
  ]

  it('null and empty std_code go last asc', () => {
    const result = sortRows(rows, 'std_code', 'asc')
    const codes = result.map(r => r.std_code)
    expect(codes[0]).toBe('A')
    expect(codes[1]).toBe('Z')
    // last two are null / ''
    expect(codes.slice(2).every(c => c == null || c === '')).toBe(true)
  })

  it('null and empty std_code go last desc', () => {
    const result = sortRows(rows, 'std_code', 'desc')
    const codes = result.map(r => r.std_code)
    expect(codes[0]).toBe('Z')
    expect(codes[1]).toBe('A')
    expect(codes.slice(2).every(c => c == null || c === '')).toBe(true)
  })
})

// ── immutability ────────────────────────────────────────────────────────────
describe('sortRows immutability', () => {
  const rows = [
    makeRow('C', 'gamma'),
    makeRow('A', 'alpha'),
    makeRow('B', 'beta'),
  ]
  const originalOrder = rows.map(r => r.code)

  it('returns a NEW array (does not mutate input)', () => {
    const result = sortRows(rows, 'code', 'asc')
    expect(result).not.toBe(rows)
    expect(rows.map(r => r.code)).toEqual(originalOrder)
  })

  it('result has the same length as input', () => {
    const result = sortRows(rows, 'code', 'asc')
    expect(result.length).toBe(rows.length)
  })
})

// ── std_code2 field ─────────────────────────────────────────────────────────
describe('sortRows by std_code2', () => {
  const rows = [
    makeRow('r1', 'one', null, 'C'),
    makeRow('r2', 'two', null, 'A'),
    makeRow('r3', 'three', null, null),
    makeRow('r4', 'four', null, 'B'),
  ]

  it('sorts by std_code2 asc, null last', () => {
    const result = sortRows(rows, 'std_code2', 'asc')
    const vals = result.map(r => r.std_code2)
    expect(vals[0]).toBe('A')
    expect(vals[1]).toBe('B')
    expect(vals[2]).toBe('C')
    expect(vals[3]).toBeNull()
  })
})
