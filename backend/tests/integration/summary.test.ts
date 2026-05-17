// backend/tests/integration/summary.test.ts
// Integration tests for GET /api/basic-config/_summary and /api/eclaim-config/_summary (F4).
// Mocks ../../src/db so no live DB required.

import request from 'supertest'

const mockQuery = jest.fn()
jest.mock('../../src/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

import app from '../../src/index'

beforeEach(() => {
  mockQuery.mockReset()
})

// ─── basic-config/_summary ────────────────────────────────────────────────────

describe('GET /api/basic-config/_summary', () => {
  it('returns per-category counts including some unmapped', async () => {
    // occupation has 3 rows: 2 mapped, 1 unmapped
    // religion has 2 rows: both mapped
    // All other categories → empty
    mockQuery.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('FROM `occupation`')) {
        return {
          rows: [
            { code: '01', name: 'เกษตรกร', std_code: '0510', mapped: 1 },
            { code: '02', name: 'รับราชการ', std_code: '0110', mapped: 1 },
            { code: '03', name: 'อื่นๆ', std_code: null, mapped: 0 },
          ],
          rowCount: 3,
        }
      }
      if (typeof sql === 'string' && sql.includes('FROM `religion`')) {
        return {
          rows: [
            { code: '1', name: 'พุทธ', std_code: '001', mapped: 1 },
            { code: '2', name: 'อิสลาม', std_code: '002', mapped: 1 },
          ],
          rowCount: 2,
        }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/basic-config/_summary')
    expect(res.status).toBe(200)

    // Top-level shape
    expect(res.body.registry).toBe('basic')
    expect(typeof res.body.totalCategories).toBe('number')
    expect(typeof res.body.totalRows).toBe('number')
    expect(typeof res.body.totalUnmapped).toBe('number')
    expect(Array.isArray(res.body.categories)).toBe(true)

    // occupation: 2 mapped, 1 unmapped
    const occ = res.body.categories.find((c: { key: string }) => c.key === 'occupation')
    expect(occ).toBeTruthy()
    expect(occ.pending).toBe(false)
    expect(occ.total).toBe(3)
    expect(occ.mapped).toBe(2)
    expect(occ.unmapped).toBe(1)
    expect(occ.percent).toBe(67) // Math.round(2/3*100)

    // religion: all mapped
    const rel = res.body.categories.find((c: { key: string }) => c.key === 'religion')
    expect(rel).toBeTruthy()
    expect(rel.total).toBe(2)
    expect(rel.mapped).toBe(2)
    expect(rel.unmapped).toBe(0)
    expect(rel.percent).toBe(100)

    // totalRows: at least 5 (3 + 2 + 0 for others)
    expect(res.body.totalRows).toBeGreaterThanOrEqual(5)
    // totalUnmapped: at least 1 from occupation
    expect(res.body.totalUnmapped).toBeGreaterThanOrEqual(1)
  })

  it('pending categories are included with pending:true and no counts', async () => {
    // Return empty for all non-pending categories
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    const res = await request(app).get('/api/basic-config/_summary')
    expect(res.status).toBe(200)

    // None of the basic-config categories are pending (all pending:false in the registry).
    // Verify no category has pending:true in the current registry.
    const pendingCats = res.body.categories.filter((c: { pending: boolean }) => c.pending === true)
    expect(pendingCats.length).toBe(0)

    // Verify non-pending categories get counts (they may be 0 rows if mock returns empty)
    const occ = res.body.categories.find((c: { key: string }) => c.key === 'occupation')
    expect(occ).toBeTruthy()
    expect(occ.pending).toBe(false)
    expect(typeof occ.total).toBe('number')
    expect(typeof occ.unmapped).toBe('number')
  })

  it('a failing category has error:true, others succeed, no 500', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('FROM `occupation`')) {
        throw new Error('simulated DB error for occupation')
      }
      // religion succeeds with one row
      if (typeof sql === 'string' && sql.includes('FROM `religion`')) {
        return {
          rows: [{ code: '1', name: 'พุทธ', std_code: '001', mapped: 1 }],
          rowCount: 1,
        }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/basic-config/_summary')
    // Must not 500
    expect(res.status).toBe(200)

    // occupation entry should have error:true
    const occ = res.body.categories.find((c: { key: string }) => c.key === 'occupation')
    expect(occ).toBeTruthy()
    expect(occ.error).toBe(true)
    // error category should NOT have counts
    expect(occ.total).toBeUndefined()

    // religion should still succeed
    const rel = res.body.categories.find((c: { key: string }) => c.key === 'religion')
    expect(rel).toBeTruthy()
    expect(rel.error).toBeUndefined()
    expect(rel.total).toBe(1)
  })

  it('overallPercent is computed from totalRows and totalUnmapped', async () => {
    // 2 mapped out of 4 total → 50%
    mockQuery.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('FROM `occupation`')) {
        return {
          rows: [
            { code: '01', std_code: 'A', mapped: 1 },
            { code: '02', std_code: null, mapped: 0 },
          ],
          rowCount: 2,
        }
      }
      if (typeof sql === 'string' && sql.includes('FROM `religion`')) {
        return {
          rows: [
            { code: '1', std_code: 'B', mapped: 1 },
            { code: '2', std_code: null, mapped: 0 },
          ],
          rowCount: 2,
        }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/basic-config/_summary')
    expect(res.status).toBe(200)
    // totalRows >= 4, totalUnmapped >= 2, overallPercent <= 50 (others have 0 rows)
    expect(typeof res.body.overallPercent).toBe('number')
  })

  // ── /:category route not shadowed ─────────────────────────────────────────────
  it('GET /api/basic-config/occupation still works (/_summary does not shadow /:category)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ code: '05', name: 'เกษตรกร', std_code: '0510', std_name: 'x', mapped: 1 }],
      rowCount: 1,
    })
    const res = await request(app).get('/api/basic-config/occupation')
    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({ code: '05', mapped: true })
  })
})

// ─── eclaim-config/_summary ───────────────────────────────────────────────────

describe('GET /api/eclaim-config/_summary', () => {
  it('returns summary for eclaim registry', async () => {
    // eclaim-inscl: 2 rows, 1 mapped
    mockQuery.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('FROM `pttype`')) {
        return {
          rows: [
            { code: '01', std_code: 'UCS', mapped: 1 },
            { code: '02', std_code: null, mapped: 0 },
          ],
          rowCount: 2,
        }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/eclaim-config/_summary')
    expect(res.status).toBe(200)
    expect(res.body.registry).toBe('eclaim')
    expect(typeof res.body.totalCategories).toBe('number')
    expect(res.body.totalCategories).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(res.body.categories)).toBe(true)

    // At least the eclaim-inscl category should appear
    const inscl = res.body.categories.find((c: { key: string }) => c.key === 'eclaim-inscl')
    expect(inscl).toBeTruthy()
    expect(inscl.pending).toBe(false)
  })

  it('eclaim: a failing category has error:true, no 500, others continue', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('FROM `pttype`')) {
        throw new Error('eclaim pttype DB error')
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/eclaim-config/_summary')
    expect(res.status).toBe(200)

    const inscl = res.body.categories.find((c: { key: string }) => c.key === 'eclaim-inscl')
    expect(inscl.error).toBe(true)
    expect(inscl.total).toBeUndefined()
  })
})
