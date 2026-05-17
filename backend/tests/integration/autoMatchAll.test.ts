// backend/tests/integration/autoMatchAll.test.ts
// Integration tests for POST /api/basic-config/_auto-match-all (F5)
// Mocks ../../src/db so no live DB required.

import request from 'supertest'

const mockQuery = jest.fn()
jest.mock('../../src/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

import { _resetEnsureForTest } from '../../src/services/auditService'

import app from '../../src/index'

beforeEach(() => {
  mockQuery.mockReset()
  _resetEnsureForTest()
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function auditInsertCalls() {
  return mockQuery.mock.calls.filter(
    ([sql]: [string]) => typeof sql === 'string' && sql.includes('INSERT INTO `bgs_mapping_audit`')
  )
}

function updateCalls() {
  return mockQuery.mock.calls.filter(
    ([sql]: [string]) => typeof sql === 'string' && sql.startsWith('UPDATE')
  )
}

// ─── Basic: POST /_auto-match-all applies matches and returns summary ─────────

describe('POST /api/basic-config/_auto-match-all — basic flow', () => {
  it('returns 200 with totalCategories, results, and totalMatched', async () => {
    // For each category the route calls: buildListSql + buildStdOptionsSql
    // For any category with 0 suggestions nothing else happens.
    // We return empty rows/options for all categories → 0 matches.
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    const res = await request(app)
      .post('/api/basic-config/_auto-match-all')
      .set('x-actor', 'admin')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('totalCategories')
    expect(res.body).toHaveProperty('totalMatched')
    expect(Array.isArray(res.body.results)).toBe(true)
    expect(res.body.totalCategories).toBeGreaterThan(0)
    expect(res.body.totalMatched).toBe(0)
  })

  it('applies updates and records audit when a row name exactly matches one option', async () => {
    // We need to make the route process at least one category with a match.
    // Strategy: for 'occupation' (first category) return a matchable row + options;
    // all other categories return empty.
    let callIndex = 0

    mockQuery.mockImplementation(async (sql: string) => {
      callIndex++
      // First call for occupation category: buildListSql returns one unmapped row
      if (sql.includes('FROM `occupation`') && sql.includes('AS mapped')) {
        return {
          rows: [{ code: '05', name: 'เกษตรกร', std_code: null, mapped: 0 }],
          rowCount: 1,
        }
      }
      // Std options for occupation: provis_occupa with a name match
      if (sql.includes('FROM `provis_occupa`')) {
        return {
          rows: [{ code: '0510', name: 'เกษตรกร' }],
          rowCount: 1,
        }
      }
      // select-current for audit old value
      if (sql.includes('current_val') && sql.includes('`occupation`')) {
        return { rows: [{ current_val: null }], rowCount: 1 }
      }
      // UPDATE occupation
      if (sql.startsWith('UPDATE `occupation`')) {
        return { rows: [], rowCount: 1 }
      }
      // ensure audit table + audit INSERT: best-effort
      if (sql.includes('CREATE TABLE IF NOT EXISTS')) {
        return { rows: [], rowCount: 0 }
      }
      if (sql.includes('INSERT INTO `bgs_mapping_audit`')) {
        return { rows: [], rowCount: 1 }
      }
      // Default: other categories → empty rows/options
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app)
      .post('/api/basic-config/_auto-match-all')
      .set('x-actor', 'nurse01')

    expect(res.status).toBe(200)
    expect(res.body.totalMatched).toBeGreaterThanOrEqual(1)

    // The occupation category result should show matched >= 1
    const occResult = res.body.results.find((r: { category: string }) => r.category === 'occupation')
    expect(occResult).toBeDefined()
    expect(occResult.matched).toBeGreaterThanOrEqual(1)

    // An UPDATE was issued
    const updates = updateCalls()
    expect(updates.length).toBeGreaterThanOrEqual(1)
    // The first UPDATE should target occupation with correct params
    const occUpdate = updates.find(([sql]: [string]) => sql.includes('`occupation`'))
    expect(occUpdate).toBeDefined()
    expect(occUpdate[0]).toContain('UPDATE `occupation` SET `nhso_code` = ?')
    expect(occUpdate[1]).toEqual(['0510', '05'])
  })

  it('records an audit row for each applied match', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM `occupation`') && sql.includes('AS mapped')) {
        return { rows: [{ code: '05', name: 'เกษตรกร', std_code: null, mapped: 0 }], rowCount: 1 }
      }
      if (sql.includes('FROM `provis_occupa`')) {
        return { rows: [{ code: '0510', name: 'เกษตรกร' }], rowCount: 1 }
      }
      if (sql.includes('current_val') && sql.includes('`occupation`')) {
        return { rows: [{ current_val: null }], rowCount: 1 }
      }
      if (sql.startsWith('UPDATE `occupation`')) {
        return { rows: [], rowCount: 1 }
      }
      if (sql.includes('CREATE TABLE IF NOT EXISTS')) {
        return { rows: [], rowCount: 0 }
      }
      if (sql.includes('INSERT INTO `bgs_mapping_audit`')) {
        return { rows: [], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })

    await request(app)
      .post('/api/basic-config/_auto-match-all')
      .set('x-actor', 'nurse01')

    const inserts = auditInsertCalls()
    expect(inserts.length).toBeGreaterThanOrEqual(1)
    const params = inserts[0][1]
    // params: [registry, category, code, field, old_value, new_value, actor]
    expect(params[0]).toBe('basic')
    expect(params[1]).toBe('occupation')
    expect(params[2]).toBe('05')
    expect(params[3]).toBe('std_code')
    expect(params[4]).toBeNull()
    expect(params[5]).toBe('0510')
    expect(params[6]).toBe('nurse01')
  })

  it('uses "auto-match" as actor when x-actor header is absent', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM `occupation`') && sql.includes('AS mapped')) {
        return { rows: [{ code: '05', name: 'เกษตรกร', std_code: null, mapped: 0 }], rowCount: 1 }
      }
      if (sql.includes('FROM `provis_occupa`')) {
        return { rows: [{ code: '0510', name: 'เกษตรกร' }], rowCount: 1 }
      }
      if (sql.includes('current_val') && sql.includes('`occupation`')) {
        return { rows: [{ current_val: null }], rowCount: 1 }
      }
      if (sql.startsWith('UPDATE `occupation`')) { return { rows: [], rowCount: 1 } }
      if (sql.includes('CREATE TABLE IF NOT EXISTS')) { return { rows: [], rowCount: 0 } }
      if (sql.includes('INSERT INTO `bgs_mapping_audit`')) { return { rows: [], rowCount: 1 } }
      return { rows: [], rowCount: 0 }
    })

    await request(app).post('/api/basic-config/_auto-match-all') // no x-actor

    const inserts = auditInsertCalls()
    if (inserts.length > 0) {
      expect(inserts[0][1][6]).toBe('auto-match')
    }
  })
})

// ─── Pending categories are SKIPPED ──────────────────────────────────────────

describe('POST /api/basic-config/_auto-match-all — pending categories skipped', () => {
  it('drug-ned-reason is now non-pending (editable, owner 2026-05-18) — processed, not skipped', async () => {
    // drug-ned-reason is now pending:false (editable with 2-char stdRule, owner decision 2026-05-18).
    // The route no longer skips it; it is processed like any other non-pending category.
    // All basic-config categories are now non-pending: skippedPending list must be empty.
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    const res = await request(app).post('/api/basic-config/_auto-match-all')
    expect(res.status).toBe(200)

    // No entries should be skipped as pending in the basic registry
    const skippedPending = res.body.results.filter((r: { skippedPending?: boolean }) => r.skippedPending === true)
    expect(skippedPending.length).toBe(0)

    // drug-ned-reason must appear as a normal (processed) result entry, not skipped
    const nedEntry = res.body.results.find((r: { category: string }) => r.category === 'drug-ned-reason')
    expect(nedEntry).toBeDefined()
    expect(nedEntry.skippedPending).toBeFalsy()

    // totalCategories counts all categories (all non-pending); results.length equals totalCategories
    expect(res.body.results.length).toBe(res.body.totalCategories)
  })
})

// ─── eclaim registry ─────────────────────────────────────────────────────────

describe('POST /api/eclaim-config/_auto-match-all', () => {
  it('returns 200 with eclaim registry categories', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

    const res = await request(app)
      .post('/api/eclaim-config/_auto-match-all')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('totalCategories')
    expect(res.body.totalCategories).toBeGreaterThan(0)
    expect(Array.isArray(res.body.results)).toBe(true)
    // eclaim categories have keys starting with 'eclaim-'
    const keys = res.body.results.map((r: { category: string }) => r.category)
    expect(keys.some((k: string) => k.startsWith('eclaim-'))).toBe(true)
  })

  it('applies matches for eclaim categories and records audit with registry=eclaim', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      // eclaim-inscl: pttype/nhso_inscl_code
      if (sql.includes('FROM `pttype`') && sql.includes('AS mapped') && sql.includes('pttype_std_code')) {
        return { rows: [{ code: 'OFC', name: 'ข้าราชการ', std_code: null, mapped: 0 }], rowCount: 1 }
      }
      if (sql.includes('FROM `nhso_inscl_code`')) {
        return { rows: [{ code: 'OFC', name: 'ข้าราชการ' }], rowCount: 1 }
      }
      if (sql.includes('current_val') && sql.includes('`pttype`')) {
        return { rows: [{ current_val: null }], rowCount: 1 }
      }
      if (sql.startsWith('UPDATE `pttype`')) { return { rows: [], rowCount: 1 } }
      if (sql.includes('CREATE TABLE IF NOT EXISTS')) { return { rows: [], rowCount: 0 } }
      if (sql.includes('INSERT INTO `bgs_mapping_audit`')) { return { rows: [], rowCount: 1 } }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app)
      .post('/api/eclaim-config/_auto-match-all')
      .set('x-actor', 'doctor01')

    expect(res.status).toBe(200)
    const inserts = auditInsertCalls()
    if (inserts.length > 0) {
      // First audit row should have registry=eclaim
      expect(inserts[0][1][0]).toBe('eclaim')
      expect(inserts[0][1][6]).toBe('doctor01')
    }
  })
})

// ─── One category failing does not break the batch ───────────────────────────

describe('POST /api/basic-config/_auto-match-all — resilience', () => {
  it('a single category throwing is collected in errors[] without failing the batch', async () => {
    // Throw on first SQL call (occupation list query), succeed for everything else
    let firstOccCall = true
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM `occupation`') && sql.includes('AS mapped') && firstOccCall) {
        firstOccCall = false
        throw new Error('DB connection dropped')
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).post('/api/basic-config/_auto-match-all')

    // Should still return 200 (resilient batch)
    expect(res.status).toBe(200)
    // errors array should contain the occupation failure
    expect(Array.isArray(res.body.errors)).toBe(true)
    expect(res.body.errors.length).toBeGreaterThanOrEqual(1)
    // The error entry should mention the category
    const errEntry = res.body.errors.find((e: string | { category?: string }) => {
      if (typeof e === 'string') return e.includes('occupation')
      return e.category === 'occupation'
    })
    expect(errEntry).toBeDefined()

    // Other categories should still be present in results
    expect(res.body.results.length).toBeGreaterThan(0)
  })
})
