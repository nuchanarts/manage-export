// frontend/tests/basicConfigUtils.dryrun.test.ts
// TDD for F12 pure helpers in basicConfigUtils.ts: formatDryRunHeadline.

import { formatDryRunHeadline } from '../src/data/basicConfigUtils'
import type { DryRunResult } from '../src/data/basicConfigUtils'

function makeResult(overrides: Partial<DryRunResult>): DryRunResult {
  return {
    registry: 'basic',
    status: 'PASS',
    totalCategories: 5,
    categoriesWithIssues: 0,
    totalUnmapped: 0,
    results: [],
    ...overrides,
  }
}

describe('formatDryRunHeadline', () => {
  it('PASS → "พร้อมส่งออก ✅"', () => {
    expect(formatDryRunHeadline(makeResult({ status: 'PASS' }))).toBe('พร้อมส่งออก ✅')
  })

  it('FAIL with 1 unmapped → includes count', () => {
    const headline = formatDryRunHeadline(makeResult({ status: 'FAIL', totalUnmapped: 1 }))
    expect(headline).toContain('1')
    expect(headline).not.toBe('พร้อมส่งออก ✅')
  })

  it('FAIL with 42 unmapped → includes 42 formatted', () => {
    const headline = formatDryRunHeadline(makeResult({ status: 'FAIL', totalUnmapped: 42 }))
    expect(headline).toContain('42')
  })

  it('FAIL with 1000 unmapped → toLocaleString formatting used', () => {
    const headline = formatDryRunHeadline(makeResult({ status: 'FAIL', totalUnmapped: 1000 }))
    // toLocaleString in Node may use 1,000 or 1000 depending on locale
    expect(headline).toMatch(/1[,.]?000|1000/)
  })
})
