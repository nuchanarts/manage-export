// backend/tests/unit/dryrun.test.ts
// TDD for buildDryRunResult() in services/dryrun.ts (F12).
// RED → GREEN: write tests before implementation.

import { buildDryRunResult } from '../../src/services/dryrun'

// ─── shape helpers ────────────────────────────────────────────────────────────

type InputCategory = Parameters<typeof buildDryRunResult>[0][number]

function makeRows(
  total: number,
  unmappedCodes: { code: string; name: string }[],
): { code: string; name: string; mapped: number | boolean; std_code: string | null }[] {
  const unmappedSet = new Set(unmappedCodes.map(u => u.code))
  const rows: { code: string; name: string; mapped: number | boolean; std_code: string | null }[] = []
  let m = 0
  for (let i = 0; i < total - unmappedCodes.length; i++) {
    rows.push({ code: `M${i}`, name: `Mapped ${i}`, mapped: 1, std_code: `S${i}` })
    m++
  }
  for (const u of unmappedCodes) {
    rows.push({ code: u.code, name: u.name, mapped: 0, std_code: null })
  }
  return rows
}

// ─── empty registry ───────────────────────────────────────────────────────────

describe('buildDryRunResult — empty registry', () => {
  it('returns PASS with zeros', () => {
    const result = buildDryRunResult([], 15)
    expect(result.status).toBe('PASS')
    expect(result.totalCategories).toBe(0)
    expect(result.categoriesWithIssues).toBe(0)
    expect(result.totalUnmapped).toBe(0)
    expect(result.results).toEqual([])
  })
})

// ─── all mapped → PASS ───────────────────────────────────────────────────────

describe('buildDryRunResult — all mapped', () => {
  it('returns PASS when every category has unmappedCount = 0', () => {
    const cats: InputCategory[] = [
      { key: 'occupation', label: 'อาชีพ', rows: makeRows(3, []) },
      { key: 'religion', label: 'ศาสนา', rows: makeRows(2, []) },
    ]
    const result = buildDryRunResult(cats, 15)

    expect(result.status).toBe('PASS')
    expect(result.totalCategories).toBe(2)
    expect(result.categoriesWithIssues).toBe(0)
    expect(result.totalUnmapped).toBe(0)

    const occ = result.results.find(r => r.key === 'occupation')!
    expect(occ).toBeDefined()
    expect(occ.unmappedCount).toBe(0)
    expect(occ.samples).toEqual([])
    expect(occ.pending).toBeFalsy()
    expect(occ.error).toBeFalsy()
  })
})

// ─── some unmapped → FAIL ────────────────────────────────────────────────────

describe('buildDryRunResult — some unmapped', () => {
  it('returns FAIL with correct counts and samples', () => {
    const unmapped = [
      { code: 'U1', name: 'รายการ 1' },
      { code: 'U2', name: 'รายการ 2' },
    ]
    const cats: InputCategory[] = [
      { key: 'occupation', label: 'อาชีพ', rows: makeRows(5, unmapped) },
      { key: 'religion', label: 'ศาสนา', rows: makeRows(2, []) },
    ]
    const result = buildDryRunResult(cats, 15)

    expect(result.status).toBe('FAIL')
    expect(result.totalUnmapped).toBe(2)
    expect(result.categoriesWithIssues).toBe(1)

    const occ = result.results.find(r => r.key === 'occupation')!
    expect(occ.unmappedCount).toBe(2)
    expect(occ.samples).toHaveLength(2)
    expect(occ.samples[0]).toMatchObject({ code: 'U1', name: 'รายการ 1' })
    expect(occ.samples[1]).toMatchObject({ code: 'U2', name: 'รายการ 2' })

    const rel = result.results.find(r => r.key === 'religion')!
    expect(rel.unmappedCount).toBe(0)
    expect(rel.samples).toEqual([])
  })

  it('samples are capped at sampleLimit', () => {
    const unmapped = Array.from({ length: 20 }, (_, i) => ({ code: `U${i}`, name: `Name ${i}` }))
    const cats: InputCategory[] = [
      { key: 'occupation', label: 'อาชีพ', rows: makeRows(20, unmapped) },
    ]
    const result = buildDryRunResult(cats, 5)

    expect(result.totalUnmapped).toBe(20)
    const occ = result.results.find(r => r.key === 'occupation')!
    expect(occ.unmappedCount).toBe(20)
    expect(occ.samples).toHaveLength(5)
  })

  it('sampleLimit = 0 → samples array is empty even with unmapped rows', () => {
    const cats: InputCategory[] = [
      { key: 'occupation', label: 'อาชีพ', rows: makeRows(3, [{ code: 'U1', name: 'N1' }]) },
    ]
    const result = buildDryRunResult(cats, 0)
    expect(result.totalUnmapped).toBe(1)
    expect(result.results[0]!.samples).toEqual([])
  })
})

// ─── pending categories ───────────────────────────────────────────────────────

describe('buildDryRunResult — pending categories', () => {
  it('pending category sets pending:true, is excluded from status', () => {
    const cats: InputCategory[] = [
      { key: 'pending-cat', label: 'รอยืนยัน', pending: true },
      { key: 'occupation', label: 'อาชีพ', rows: makeRows(2, []) },
    ]
    const result = buildDryRunResult(cats, 15)

    expect(result.status).toBe('PASS')
    expect(result.totalCategories).toBe(2)

    const pend = result.results.find(r => r.key === 'pending-cat')!
    expect(pend).toBeDefined()
    expect(pend.pending).toBe(true)
    expect(pend.unmappedCount).toBeUndefined()
    expect(pend.samples).toBeUndefined()
  })

  it('pending category with unmapped rows does NOT contribute to FAIL', () => {
    // Only the pending category has unmapped — status must still be PASS
    const cats: InputCategory[] = [
      { key: 'pending-cat', label: 'รอยืนยัน', pending: true },
    ]
    const result = buildDryRunResult(cats, 15)

    expect(result.status).toBe('PASS')
    expect(result.totalUnmapped).toBe(0)
    expect(result.categoriesWithIssues).toBe(0)
  })
})

// ─── error categories ─────────────────────────────────────────────────────────

describe('buildDryRunResult — error categories', () => {
  it('error category sets error:true and is passed through', () => {
    const cats: InputCategory[] = [
      { key: 'occupation', label: 'อาชีพ', error: true },
      { key: 'religion', label: 'ศาสนา', rows: makeRows(2, []) },
    ]
    const result = buildDryRunResult(cats, 15)

    const occ = result.results.find(r => r.key === 'occupation')!
    expect(occ.error).toBe(true)
    expect(occ.unmappedCount).toBeUndefined()
    expect(occ.samples).toBeUndefined()
  })

  it('error category does NOT contribute to totalUnmapped or categoriesWithIssues', () => {
    const cats: InputCategory[] = [
      { key: 'occupation', label: 'อาชีพ', error: true },
    ]
    const result = buildDryRunResult(cats, 15)

    expect(result.totalUnmapped).toBe(0)
    expect(result.categoriesWithIssues).toBe(0)
  })

  it('status is still FAIL if another (non-error) category has unmapped rows', () => {
    const cats: InputCategory[] = [
      { key: 'occupation', label: 'อาชีพ', error: true },
      { key: 'religion', label: 'ศาสนา', rows: makeRows(2, [{ code: 'U1', name: 'N1' }]) },
    ]
    const result = buildDryRunResult(cats, 15)
    expect(result.status).toBe('FAIL')
    expect(result.totalUnmapped).toBe(1)
    expect(result.categoriesWithIssues).toBe(1)
  })
})

// ─── mapped predicate edge cases ─────────────────────────────────────────────

describe('buildDryRunResult — mapped predicate mirrors F4 logic', () => {
  it('std_code="" counts as unmapped even when mapped flag is truthy', () => {
    const cats: InputCategory[] = [
      {
        key: 'occupation', label: 'อาชีพ',
        rows: [
          { code: 'A', name: 'A name', mapped: 1, std_code: '' },    // std_code '' → unmapped
          { code: 'B', name: 'B name', mapped: 1, std_code: 'X01' }, // genuine map
        ],
      },
    ]
    const result = buildDryRunResult(cats, 15)
    expect(result.totalUnmapped).toBe(1)
    expect(result.status).toBe('FAIL')
    const occ = result.results[0]!
    expect(occ.unmappedCount).toBe(1)
    const sample = occ.samples[0]!
    expect(sample.code).toBe('A')
  })

  it('mapped=false with non-null std_code counts as unmapped', () => {
    const cats: InputCategory[] = [
      {
        key: 'occupation', label: 'อาชีพ',
        rows: [
          { code: 'A', name: 'A name', mapped: false, std_code: 'X99' },
        ],
      },
    ]
    const result = buildDryRunResult(cats, 15)
    expect(result.totalUnmapped).toBe(1)
    expect(result.status).toBe('FAIL')
  })
})

// ─── registry label passthrough ──────────────────────────────────────────────

describe('buildDryRunResult — registry field', () => {
  it('registry field is echoed back when provided', () => {
    const result = buildDryRunResult([], 15, 'basic')
    expect(result.registry).toBe('basic')
  })

  it('registry field is undefined when not provided', () => {
    const result = buildDryRunResult([], 15)
    expect(result.registry).toBeUndefined()
  })
})
