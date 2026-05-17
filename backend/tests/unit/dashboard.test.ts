// backend/tests/unit/dashboard.test.ts
// TDD for summarizeCounts() in dashboard.ts (F4)
// RED → GREEN: run this before dashboard.ts exists, then implement.

import { summarizeCounts } from '../../src/services/dashboard'

describe('summarizeCounts', () => {
  it('returns zero counts for an empty array', () => {
    const result = summarizeCounts([])
    expect(result).toEqual({ total: 0, mapped: 0, unmapped: 0, percent: null })
  })

  it('all rows mapped: percent = 100', () => {
    const rows = [
      { mapped: 1, std_code: 'A01' },
      { mapped: true, std_code: 'B02' },
    ]
    const result = summarizeCounts(rows)
    expect(result).toEqual({ total: 2, mapped: 2, unmapped: 0, percent: 100 })
  })

  it('some rows unmapped: counts and percent rounded correctly', () => {
    const rows = [
      { mapped: 1, std_code: 'A01' },
      { mapped: 1, std_code: 'B02' },
      { mapped: 0, std_code: null },
    ]
    const result = summarizeCounts(rows)
    expect(result.total).toBe(3)
    expect(result.mapped).toBe(2)
    expect(result.unmapped).toBe(1)
    expect(result.percent).toBe(67)   // Math.round(2/3*100) = 67
  })

  it('std_code empty string counts as unmapped (even if mapped flag is truthy)', () => {
    const rows = [
      { mapped: 1, std_code: '' },    // std_code === '' → unmapped
      { mapped: 1, std_code: 'X99' }, // genuinely mapped
    ]
    const result = summarizeCounts(rows)
    expect(result.total).toBe(2)
    expect(result.mapped).toBe(1)
    expect(result.unmapped).toBe(1)
    expect(result.percent).toBe(50)
  })

  it('std_code null counts as unmapped (even if mapped flag is truthy)', () => {
    const rows = [
      { mapped: 1, std_code: null },
      { mapped: 1, std_code: 'Y01' },
    ]
    const result = summarizeCounts(rows)
    expect(result.total).toBe(2)
    expect(result.mapped).toBe(1)
    expect(result.unmapped).toBe(1)
  })

  it('mapped flag false counts as unmapped (even if std_code is non-empty)', () => {
    const rows = [
      { mapped: 0, std_code: 'Z01' }, // mapped flag falsy → unmapped
      { mapped: false, std_code: 'Z02' },
      { mapped: 1, std_code: 'Z03' },
    ]
    const result = summarizeCounts(rows)
    expect(result.total).toBe(3)
    expect(result.mapped).toBe(1)
    expect(result.unmapped).toBe(2)
  })

  it('all unmapped: percent = 0', () => {
    const rows = [
      { mapped: 0, std_code: null },
      { mapped: 0, std_code: '' },
    ]
    const result = summarizeCounts(rows)
    expect(result).toEqual({ total: 2, mapped: 0, unmapped: 2, percent: 0 })
  })
})
