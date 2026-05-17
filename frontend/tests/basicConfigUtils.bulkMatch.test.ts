// frontend/tests/basicConfigUtils.bulkMatch.test.ts
// Tests for F5 bulk auto-match utility helpers in basicConfigUtils.ts

import {
  buildBulkMatchSummary,
  BulkMatchResult,
} from '../src/data/basicConfigUtils'

const baseResult: BulkMatchResult = {
  totalCategories: 30,
  totalMatched: 12,
  results: [
    { category: 'occupation', label: 'อาชีพ', matched: 5, unmatched: 3 },
    { category: 'religion', label: 'ศาสนา', matched: 7, unmatched: 0 },
    { category: 'race', label: 'เชื้อชาติ', matched: 0, unmatched: 10, skippedPending: false },
  ],
  errors: [],
}

describe('buildBulkMatchSummary', () => {
  it('includes totalMatched and totalCategories in the output', () => {
    const msg = buildBulkMatchSummary(baseResult)
    expect(msg).toContain('12')
    expect(msg).toContain('30')
  })

  it('returns a non-empty string', () => {
    const msg = buildBulkMatchSummary(baseResult)
    expect(msg.length).toBeGreaterThan(0)
  })

  it('handles zero totalMatched gracefully', () => {
    const result: BulkMatchResult = { ...baseResult, totalMatched: 0 }
    const msg = buildBulkMatchSummary(result)
    expect(msg).toContain('0')
  })

  it('handles a single category', () => {
    const result: BulkMatchResult = { ...baseResult, totalCategories: 1, totalMatched: 1 }
    const msg = buildBulkMatchSummary(result)
    expect(msg).toContain('1')
  })

  it('is consistent — same input gives same output', () => {
    expect(buildBulkMatchSummary(baseResult)).toBe(buildBulkMatchSummary(baseResult))
  })
})
