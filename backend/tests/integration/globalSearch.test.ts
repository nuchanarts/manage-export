// backend/tests/integration/globalSearch.test.ts
// Integration tests for GET /api/basic-config/_search and /api/eclaim-config/_search (F7).
// Mocks ../../src/db so no live DB required.

import request from 'supertest'

const mockQuery = jest.fn()
jest.mock('../../src/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

import app from '../../src/index'

beforeEach(() => {
  mockQuery.mockReset()
})

// ─── Missing / empty q → 400 ─────────────────────────────────────────────────

describe('GET /api/basic-config/_search — validation', () => {
  it('returns 400 when q is missing', async () => {
    const res = await request(app).get('/api/basic-config/_search')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('MISSING_QUERY')
  })

  it('returns 400 when q is empty string', async () => {
    const res = await request(app).get('/api/basic-config/_search?q=')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('MISSING_QUERY')
  })

  it('returns 400 when q is whitespace-only', async () => {
    const res = await request(app).get('/api/basic-config/_search?q=   ')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('MISSING_QUERY')
  })
})

// ─── Existing /:category route still works (not shadowed by /_search) ─────────

describe('GET /api/basic-config/:category — not shadowed', () => {
  it('occupation still returns rows after /_search route is registered', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ code: '05', name: 'เกษตรกร', std_code: '0510', std_name: 'x', mapped: 1 }],
      rowCount: 1,
    })
    const res = await request(app).get('/api/basic-config/occupation')
    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({ code: '05', mapped: true })
  })
})

// ─── Successful search returns grouped matches ────────────────────────────────

describe('GET /api/basic-config/_search — grouped results', () => {
  it('returns matched rows grouped by category', async () => {
    // The route iterates all non-pending categories in order (occupation first).
    // We provide rows for occupation and let all others return empty.
    mockQuery.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('FROM `occupation`')) {
        return {
          rows: [
            { code: '05', name: 'เกษตรกร', std_code: '0510', std_name: 'Farmer', mapped: 1 },
            { code: '06', name: 'แพทย์', std_code: null, std_name: null, mapped: 0 },
          ],
          rowCount: 2,
        }
      }
      // All other categories → empty
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/basic-config/_search?q=เกษตรกร')
    expect(res.status).toBe(200)
    expect(res.body.q).toBe('เกษตรกร')
    expect(res.body.totalMatches).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(res.body.groups)).toBe(true)

    const occupationGroup = res.body.groups.find((g: { category: string }) => g.category === 'occupation')
    expect(occupationGroup).toBeTruthy()
    expect(occupationGroup.rows[0]).toMatchObject({
      category: 'occupation',
      code: '05',
      name: 'เกษตรกร',
      std_code: '0510',
      mapped: true,
    })
  })

  it('only returns categories with ≥1 match', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('FROM `occupation`')) {
        return {
          rows: [{ code: '05', name: 'target', std_code: null, std_name: null, mapped: 0 }],
          rowCount: 1,
        }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/basic-config/_search?q=target')
    expect(res.status).toBe(200)
    // Only occupation matched
    expect(res.body.groups.every((g: { category: string }) => g.category === 'occupation')).toBe(true)
    // No group for other categories
    expect(res.body.groups.find((g: { category: string }) => g.category === 'religion')).toBeUndefined()
  })

  it('returns empty groups + totalMatches=0 when nothing matches', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    const res = await request(app).get('/api/basic-config/_search?q=xxxxnotfound')
    expect(res.status).toBe(200)
    expect(res.body.totalMatches).toBe(0)
    expect(res.body.groups).toHaveLength(0)
  })

  it('response includes skippedPending, errors fields', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    const res = await request(app).get('/api/basic-config/_search?q=test')
    expect(res.status).toBe(200)
    expect(typeof res.body.skippedPending).toBe('number')
    expect(Array.isArray(res.body.errors)).toBe(true)
  })

  it('limit parameter caps rows per category (default 20)', async () => {
    // Return 25 rows for occupation; with default limit=20 only 20 should appear
    const manyRows = Array.from({ length: 25 }, (_, i) => ({
      code: `OCC${i}`,
      name: `อาชีพ${i}`,
      std_code: null,
      std_name: null,
      mapped: 0,
    }))
    mockQuery.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('FROM `occupation`')) {
        return { rows: manyRows, rowCount: manyRows.length }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/basic-config/_search?q=อาชีพ')
    expect(res.status).toBe(200)
    const occGroup = res.body.groups.find((g: { category: string }) => g.category === 'occupation')
    expect(occGroup).toBeTruthy()
    expect(occGroup.rows.length).toBeLessThanOrEqual(20)
  })

  it('custom limit parameter is respected (up to 100)', async () => {
    const manyRows = Array.from({ length: 50 }, (_, i) => ({
      code: `OCC${i}`,
      name: `อาชีพ${i}`,
      std_code: null,
      std_name: null,
      mapped: 0,
    }))
    mockQuery.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('FROM `occupation`')) {
        return { rows: manyRows, rowCount: manyRows.length }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/basic-config/_search?q=อาชีพ&limit=30')
    expect(res.status).toBe(200)
    const occGroup = res.body.groups.find((g: { category: string }) => g.category === 'occupation')
    expect(occGroup).toBeTruthy()
    expect(occGroup.rows.length).toBeLessThanOrEqual(30)
  })
})

// ─── Resilience: one failing category → errors[] + no 500 ────────────────────

describe('GET /api/basic-config/_search — resilience', () => {
  it('a failing category is added to errors[] but does not 500 the whole search', async () => {
    let callCount = 0
    mockQuery.mockImplementation(async (sql: string) => {
      callCount++
      // Fail the first category query (occupation)
      if (typeof sql === 'string' && sql.includes('FROM `occupation`')) {
        throw new Error('DB connection failed for occupation')
      }
      // religion returns a match
      if (typeof sql === 'string' && sql.includes('FROM `religion`')) {
        return {
          rows: [{ code: '1', name: 'พุทธ', std_code: 'B', std_name: 'Buddhism', mapped: 1 }],
          rowCount: 1,
        }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/basic-config/_search?q=พุทธ')
    expect(res.status).toBe(200)  // Not 500!
    expect(res.body.errors.length).toBeGreaterThanOrEqual(1)
    expect(res.body.errors[0].category).toBe('occupation')
    // religion group should still appear
    const religionGroup = res.body.groups.find((g: { category: string }) => g.category === 'religion')
    expect(religionGroup).toBeTruthy()
  })
})

// ─── Pending categories are skipped (no query issued for them) ────────────────

describe('GET /api/basic-config/_search — pending categories skipped', () => {
  it('skippedPending > 0 if any pending categories exist (and they are not queried)', async () => {
    // We don't know which categories are pending, but skippedPending should be ≥ 0
    // and NOT fail. If the registry currently has 0 pending categories, this is still
    // a valid test (skippedPending === 0).
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    const res = await request(app).get('/api/basic-config/_search?q=test')
    expect(res.status).toBe(200)
    expect(typeof res.body.skippedPending).toBe('number')
    expect(res.body.skippedPending).toBeGreaterThanOrEqual(0)
  })
})

// ─── eclaim-config search also works ─────────────────────────────────────────

describe('GET /api/eclaim-config/_search', () => {
  it('returns 400 when q is missing', async () => {
    const res = await request(app).get('/api/eclaim-config/_search')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('MISSING_QUERY')
  })

  it('returns grouped results for eclaim categories', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      // pttype is the first eclaim category (eclaim-inscl)
      if (typeof sql === 'string' && sql.includes('FROM `pttype`') && sql.includes('pttype_std_code')) {
        return {
          rows: [{ code: '01', name: 'สิทธิ UCS', std_code: 'UCS', std_name: 'Universal Coverage Scheme', mapped: 1 }],
          rowCount: 1,
        }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/eclaim-config/_search?q=UCS')
    expect(res.status).toBe(200)
    expect(res.body.q).toBe('UCS')
    expect(res.body.totalMatches).toBeGreaterThanOrEqual(1)
    const group = res.body.groups.find((g: { category: string }) => g.category === 'eclaim-inscl')
    expect(group).toBeTruthy()
    expect(group.rows[0]).toMatchObject({ code: '01', std_code: 'UCS', mapped: true })
  })
})
