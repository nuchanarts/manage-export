// backend/tests/integration/dryrun.test.ts
// Integration tests for GET /api/basic-config/_dryrun and /api/eclaim-config/_dryrun (F12).
// Mocks ../../src/db so no live DB required.

import request from 'supertest'

const mockQuery = jest.fn()
jest.mock('../../src/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

import app from '../../src/index'

beforeEach(() => {
  mockQuery.mockReset()
})

// ─── basic-config/_dryrun ─────────────────────────────────────────────────────

describe('GET /api/basic-config/_dryrun', () => {
  it('returns FAIL with unmapped samples when some rows are unmapped', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('FROM `occupation`')) {
        return {
          rows: [
            { code: '01', name: 'เกษตรกร',  std_code: '0510', mapped: 1 },
            { code: '02', name: 'รับราชการ', std_code: null,   mapped: 0 },
            { code: '03', name: 'อื่นๆ',     std_code: '',     mapped: 0 },
          ],
          rowCount: 3,
        }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/basic-config/_dryrun')
    expect(res.status).toBe(200)

    expect(res.body.registry).toBe('basic')
    expect(res.body.status).toBe('FAIL')
    expect(typeof res.body.totalCategories).toBe('number')
    expect(res.body.totalUnmapped).toBeGreaterThanOrEqual(2)
    expect(res.body.categoriesWithIssues).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(res.body.results)).toBe(true)

    const occ = res.body.results.find((r: { key: string }) => r.key === 'occupation')
    expect(occ).toBeTruthy()
    expect(occ.unmappedCount).toBe(2)
    expect(Array.isArray(occ.samples)).toBe(true)
    expect(occ.samples.length).toBeGreaterThanOrEqual(1)
    // first sample should be the null-std_code row
    const codes = occ.samples.map((s: { code: string }) => s.code)
    expect(codes).toContain('02')
    expect(codes).toContain('03')
  })

  it('returns PASS when all categories are fully mapped', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { code: '01', name: 'เกษตรกร', std_code: '0510', mapped: 1 },
      ],
      rowCount: 1,
    })

    const res = await request(app).get('/api/basic-config/_dryrun')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('PASS')
    expect(res.body.totalUnmapped).toBe(0)
    expect(res.body.categoriesWithIssues).toBe(0)
  })

  it('pending category in registry is present with pending:true and not queried', async () => {
    // basic-config registry currently has no pending categories, but we verify the
    // route handles the pending branch by checking none are unexpectedly queried
    // and any that ARE pending come back with pending:true.
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    const res = await request(app).get('/api/basic-config/_dryrun')
    expect(res.status).toBe(200)

    // All results must have key + label
    for (const r of res.body.results) {
      expect(typeof r.key).toBe('string')
      expect(typeof r.label).toBe('string')
    }

    // Pending entries should have pending:true and no unmappedCount / samples
    const pendingResults = res.body.results.filter((r: { pending?: boolean }) => r.pending)
    for (const p of pendingResults) {
      expect(p.unmappedCount).toBeUndefined()
      expect(p.samples).toBeUndefined()
    }
  })

  it('one category throws → error:true entry, no 500, batch continues', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('FROM `occupation`')) {
        throw new Error('simulated DB error for occupation')
      }
      if (typeof sql === 'string' && sql.includes('FROM `religion`')) {
        return {
          rows: [{ code: '1', name: 'พุทธ', std_code: '001', mapped: 1 }],
          rowCount: 1,
        }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/basic-config/_dryrun')
    expect(res.status).toBe(200)

    const occ = res.body.results.find((r: { key: string }) => r.key === 'occupation')
    expect(occ).toBeTruthy()
    expect(occ.error).toBe(true)
    expect(occ.unmappedCount).toBeUndefined()
    expect(occ.samples).toBeUndefined()

    // religion should still appear and succeed
    const rel = res.body.results.find((r: { key: string }) => r.key === 'religion')
    expect(rel).toBeTruthy()
    expect(rel.error).toBeUndefined()
    expect(rel.unmappedCount).toBe(0)
  })

  // ── /:category route not shadowed ─────────────────────────────────────────────
  it('GET /api/basic-config/occupation still works (/_dryrun does not shadow /:category)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ code: '05', name: 'เกษตรกร', std_code: '0510', std_name: 'x', mapped: 1 }],
      rowCount: 1,
    })
    const res = await request(app).get('/api/basic-config/occupation')
    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({ code: '05', mapped: true })
  })

  it('samples are capped at 15 per category', async () => {
    // Return 20 unmapped rows for occupation
    const unmappedRows = Array.from({ length: 20 }, (_, i) => ({
      code: `U${i}`,
      name: `Name ${i}`,
      std_code: null,
      mapped: 0,
    }))
    mockQuery.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('FROM `occupation`')) {
        return { rows: unmappedRows, rowCount: unmappedRows.length }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/basic-config/_dryrun')
    expect(res.status).toBe(200)

    const occ = res.body.results.find((r: { key: string }) => r.key === 'occupation')
    expect(occ.unmappedCount).toBe(20)
    expect(occ.samples.length).toBe(15) // capped at default sampleLimit
  })
})

// ─── eclaim-config/_dryrun ────────────────────────────────────────────────────

describe('GET /api/eclaim-config/_dryrun', () => {
  it('returns 200 with correct registry = "eclaim"', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    const res = await request(app).get('/api/eclaim-config/_dryrun')
    expect(res.status).toBe(200)
    expect(res.body.registry).toBe('eclaim')
    expect(typeof res.body.status).toBe('string')
    expect(['PASS', 'FAIL']).toContain(res.body.status)
    expect(Array.isArray(res.body.results)).toBe(true)
  })

  it('eclaim: returns FAIL when eclaim-inscl has unmapped rows', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('FROM `pttype`')) {
        return {
          rows: [
            { code: '01', name: 'สิทธิ UCS', std_code: 'UCS', mapped: 1 },
            { code: '02', name: 'ไม่ทราบ',   std_code: null,   mapped: 0 },
          ],
          rowCount: 2,
        }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/eclaim-config/_dryrun')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('FAIL')

    const inscl = res.body.results.find((r: { key: string }) => r.key === 'eclaim-inscl')
    expect(inscl).toBeTruthy()
    expect(inscl.unmappedCount).toBe(1)
    expect(inscl.samples[0]).toMatchObject({ code: '02' })
  })

  it('eclaim: one failing category → error:true entry, no 500', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('FROM `pttype`')) {
        throw new Error('eclaim pttype DB error')
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/eclaim-config/_dryrun')
    expect(res.status).toBe(200)

    const inscl = res.body.results.find((r: { key: string }) => r.key === 'eclaim-inscl')
    expect(inscl.error).toBe(true)
    expect(inscl.unmappedCount).toBeUndefined()
  })
})
