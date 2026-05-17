// backend/tests/unit/snapshotService.test.ts
// TDD pure-logic tests for diffSnapshotVsCurrent and planRestore.
// No DB calls — these are entirely pure functions.

import {
  diffSnapshotVsCurrent,
  planRestore,
} from '../../src/services/snapshotService'
import type { SnapshotPayload } from '../../src/services/snapshotService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePayload(
  categories: Record<string, Record<string, { s?: string | null; s2?: string | null; e?: Record<number, string | null> }>>,
): SnapshotPayload {
  const payload: SnapshotPayload = {
    _meta: { capturedAt: '2026-01-01T00:00:00.000Z', registry: 'basic', pendingSkipped: [] },
  }
  for (const [cat, rows] of Object.entries(categories)) {
    const catPayload: Record<string, { s: string | null; s2?: string | null; e?: Record<number, string | null> }> = {}
    for (const [code, val] of Object.entries(rows)) {
      catPayload[code] = { s: val.s ?? null, ...(val.s2 !== undefined ? { s2: val.s2 } : {}), ...(val.e ? { e: val.e } : {}) }
    }
    payload[cat] = catPayload
  }
  return payload
}

// ── diffSnapshotVsCurrent ─────────────────────────────────────────────────────

describe('diffSnapshotVsCurrent', () => {
  it('returns empty when snapshot and current are identical', () => {
    const snap = makePayload({ occupation: { '01': { s: '0100' }, '02': { s: null } } })
    const curr = makePayload({ occupation: { '01': { s: '0100' }, '02': { s: null } } })
    const result = diffSnapshotVsCurrent(snap, curr)
    expect(result.totalChanged).toBe(0)
    expect(result.changed).toHaveLength(0)
  })

  it('detects a changed std_code value', () => {
    const snap = makePayload({ occupation: { '01': { s: '0100' } } })
    const curr = makePayload({ occupation: { '01': { s: '0200' } } })
    const result = diffSnapshotVsCurrent(snap, curr)
    expect(result.totalChanged).toBe(1)
    expect(result.changed[0]).toMatchObject({
      category: 'occupation',
      code: '01',
      field: 'std_code',
      from: '0100',
      to: '0200',
    })
  })

  it('detects a value cleared (non-null → null)', () => {
    const snap = makePayload({ occupation: { '03': { s: '0300' } } })
    const curr = makePayload({ occupation: { '03': { s: null } } })
    const result = diffSnapshotVsCurrent(snap, curr)
    expect(result.totalChanged).toBe(1)
    expect(result.changed[0]).toMatchObject({ from: '0300', to: null })
  })

  it('treats empty string same as null (no diff)', () => {
    const snap = makePayload({ occupation: { '04': { s: null } } })
    const curr = makePayload({ occupation: { '04': { s: '' } } })
    const result = diffSnapshotVsCurrent(snap, curr)
    // Both are normalised to null → no diff
    expect(result.totalChanged).toBe(0)
  })

  it('detects a code that exists in snapshot but not in current (treated as null)', () => {
    const snap = makePayload({ occupation: { '05': { s: '0500' } } })
    // current has no rows in occupation
    const curr = makePayload({ occupation: {} })
    const result = diffSnapshotVsCurrent(snap, curr)
    expect(result.totalChanged).toBe(1)
    expect(result.changed[0]).toMatchObject({ code: '05', from: '0500', to: null })
  })

  it('does NOT include codes added in current that are not in snapshot', () => {
    const snap = makePayload({ occupation: { '01': { s: '0100' } } })
    const curr = makePayload({ occupation: { '01': { s: '0100' }, '99': { s: '9900' } } })
    const result = diffSnapshotVsCurrent(snap, curr)
    // code '99' is new; should not appear in diff
    expect(result.totalChanged).toBe(0)
    expect(result.changed.some(d => d.code === '99')).toBe(false)
  })

  it('detects changed std_code2 value', () => {
    const snap = makePayload({ clinic: { 'C01': { s: 'ICD01', s2: 'ACT01' } } })
    const curr = makePayload({ clinic: { 'C01': { s: 'ICD01', s2: 'ACT99' } } })
    const result = diffSnapshotVsCurrent(snap, curr)
    expect(result.totalChanged).toBe(1)
    expect(result.changed[0]).toMatchObject({ field: 'std_code2', from: 'ACT01', to: 'ACT99' })
  })

  it('detects changed extra field', () => {
    const snap = makePayload({ 'eclaim-charge': { 'I001': { s: 'BC01', e: { 0: 'FTYPE1' } } } })
    const curr = makePayload({ 'eclaim-charge': { 'I001': { s: 'BC01', e: { 0: 'FTYPE2' } } } })
    const result = diffSnapshotVsCurrent(snap, curr)
    expect(result.totalChanged).toBe(1)
    expect(result.changed[0]).toMatchObject({ field: 'std_code_e0', from: 'FTYPE1', to: 'FTYPE2' })
  })

  it('handles multiple categories and multiple diffs', () => {
    const snap = makePayload({
      occupation: { '01': { s: '0100' }, '02': { s: '0200' } },
      religion:   { '01': { s: 'R01' } },
    })
    const curr = makePayload({
      occupation: { '01': { s: '0199' }, '02': { s: '0200' } }, // 01 changed
      religion:   { '01': { s: 'R01' } },                        // same
    })
    const result = diffSnapshotVsCurrent(snap, curr)
    expect(result.totalChanged).toBe(1)
    expect(result.changed[0]).toMatchObject({ category: 'occupation', code: '01' })
  })

  it('skips _meta key entirely', () => {
    const snap = makePayload({ occupation: { '01': { s: '0100' } } })
    const curr = makePayload({ occupation: { '01': { s: '0199' } } })
    // _meta is always present; should not appear as a diff entry
    const result = diffSnapshotVsCurrent(snap, curr)
    expect(result.changed.every(d => d.category !== '_meta')).toBe(true)
  })
})

// ── planRestore ───────────────────────────────────────────────────────────────

describe('planRestore', () => {
  it('returns empty when snapshot and current are identical', () => {
    const snap = makePayload({ occupation: { '01': { s: '0100' } } })
    const curr = makePayload({ occupation: { '01': { s: '0100' } } })
    expect(planRestore(snap, curr)).toHaveLength(0)
  })

  it('includes write for changed std_code', () => {
    const snap = makePayload({ occupation: { '01': { s: '0100' } } })
    const curr = makePayload({ occupation: { '01': { s: '0200' } } })
    const writes = planRestore(snap, curr)
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({
      category: 'occupation',
      code: '01',
      field: 'std_code',
      value: '0100',
    })
  })

  it('includes write to clear when snapshot had null', () => {
    const snap = makePayload({ occupation: { '01': { s: null } } })
    const curr = makePayload({ occupation: { '01': { s: '0200' } } })
    const writes = planRestore(snap, curr)
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({ field: 'std_code', value: null })
  })

  it('includes write for std_code2 change', () => {
    const snap = makePayload({ clinic: { 'C01': { s: 'ICD01', s2: 'ACT01' } } })
    const curr = makePayload({ clinic: { 'C01': { s: 'ICD01', s2: 'ACT99' } } })
    const writes = planRestore(snap, curr)
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({ field: 'std_code2', value: 'ACT01' })
  })

  it('includes write for changed extra field', () => {
    const snap = makePayload({ 'eclaim-charge': { 'I001': { s: 'BC01', e: { 0: 'FTYPE1' } } } })
    const curr = makePayload({ 'eclaim-charge': { 'I001': { s: 'BC01', e: { 0: 'FTYPE2' } } } })
    const writes = planRestore(snap, curr)
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({ field: 'std_code_e0', value: 'FTYPE1' })
  })

  it('only writes differences, not identical values', () => {
    const snap = makePayload({
      occupation: { '01': { s: '0100' }, '02': { s: '0200' } },
    })
    const curr = makePayload({
      occupation: { '01': { s: '0199' }, '02': { s: '0200' } }, // only 01 changed
    })
    const writes = planRestore(snap, curr)
    expect(writes).toHaveLength(1)
    expect(writes[0]!.code).toBe('01')
  })

  it('normalises empty string to null when comparing', () => {
    const snap = makePayload({ occupation: { '01': { s: null } } })
    const curr = makePayload({ occupation: { '01': { s: '' } } })
    // Both are null after normalisation → no write needed
    expect(planRestore(snap, curr)).toHaveLength(0)
  })

  it('writes a restore for a code missing from current (null → snap value)', () => {
    const snap = makePayload({ occupation: { '05': { s: '0500' } } })
    const curr = makePayload({ occupation: {} })
    const writes = planRestore(snap, curr)
    // Snapshot had '0500'; current is null → write to restore '0500'
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({ code: '05', field: 'std_code', value: '0500' })
  })

  it('returns writes for multiple categories', () => {
    const snap = makePayload({
      occupation: { '01': { s: '0100' } },
      religion:   { '01': { s: 'R01' } },
    })
    const curr = makePayload({
      occupation: { '01': { s: '0199' } },
      religion:   { '01': { s: 'R99' } },
    })
    const writes = planRestore(snap, curr)
    expect(writes).toHaveLength(2)
    const cats = writes.map(w => w.category)
    expect(cats).toContain('occupation')
    expect(cats).toContain('religion')
  })

  it('skips _meta key entirely', () => {
    const snap = makePayload({ occupation: { '01': { s: '0100' } } })
    const curr = makePayload({ occupation: { '01': { s: '0199' } } })
    const writes = planRestore(snap, curr)
    expect(writes.every(w => w.category !== '_meta')).toBe(true)
  })
})
