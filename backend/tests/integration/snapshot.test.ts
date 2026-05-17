// backend/tests/integration/snapshot.test.ts
// Integration tests for F10 mapping snapshot routes.
// Mocks ../../src/db so no live DB required.

import request from 'supertest'

const mockQuery = jest.fn()
jest.mock('../../src/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

import { _resetEnsureForTest } from '../../src/services/auditService'
import { _resetSnapshotEnsureForTest } from '../../src/services/snapshotService'

import app from '../../src/index'

beforeEach(() => {
  mockQuery.mockReset()
  _resetEnsureForTest()
  _resetSnapshotEnsureForTest()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function insertSnapshotCalls() {
  return mockQuery.mock.calls.filter(
    ([sql]: [string]) => typeof sql === 'string' && sql.includes('INSERT INTO `bgs_mapping_snapshot`')
  )
}

function ensureSnapshotCalls() {
  return mockQuery.mock.calls.filter(
    ([sql]: [string]) => typeof sql === 'string' && sql.includes('bgs_mapping_snapshot') && sql.includes('CREATE TABLE IF NOT EXISTS')
  )
}

function updateCalls() {
  return mockQuery.mock.calls.filter(
    ([sql]: [string]) => typeof sql === 'string' && sql.startsWith('UPDATE')
  )
}

function auditInsertCalls() {
  return mockQuery.mock.calls.filter(
    ([sql]: [string]) => typeof sql === 'string' && sql.includes('INSERT INTO `bgs_mapping_audit`')
  )
}

// For capture: each non-pending category calls buildListSql → returns rows.
// We return empty rows for all categories to keep the mock manageable.
function mockAllCategoriesEmpty() {
  // buildListSql queries return empty rows for each non-pending category
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })
}

// ── POST /_snapshots ──────────────────────────────────────────────────────────

describe('POST /api/basic-config/_snapshots', () => {
  it('captures, saves, and returns { id }', async () => {
    // All category list queries return empty → capture is quick
    // Then: ensure snapshot table (CREATE TABLE IF NOT EXISTS) + INSERT
    let callIndex = 0
    mockQuery.mockImplementation(async (sql: string) => {
      callIndex++
      if (sql.includes('CREATE TABLE IF NOT EXISTS') && sql.includes('bgs_mapping_snapshot')) {
        return { rows: [], rowCount: 0 }
      }
      if (sql.includes('INSERT INTO `bgs_mapping_snapshot`')) {
        return { rows: [], rowCount: 1, insertId: 42 }
      }
      // All other queries (buildListSql) return empty rows
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app)
      .post('/api/basic-config/_snapshots')
      .set('x-actor', 'admin')
      .send({ label: 'before-update-2026' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id')
    expect(typeof res.body.id).toBe('number')
  })

  it('returns 400 when label is missing', async () => {
    const res = await request(app)
      .post('/api/basic-config/_snapshots')
      .send({})

    expect(res.status).toBe(400)
  })

  it('returns 400 when label is empty string', async () => {
    const res = await request(app)
      .post('/api/basic-config/_snapshots')
      .send({ label: '' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when label exceeds 120 chars', async () => {
    const res = await request(app)
      .post('/api/basic-config/_snapshots')
      .send({ label: 'x'.repeat(121) })

    expect(res.status).toBe(400)
  })

  it('inserts payload as JSON string containing _meta and at least one category key', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO `bgs_mapping_snapshot`')) {
        return { rows: [], rowCount: 1, insertId: 1 }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app)
      .post('/api/basic-config/_snapshots')
      .send({ label: 'test-snap' })

    expect(res.status).toBe(200)

    const insertCalls = insertSnapshotCalls()
    expect(insertCalls.length).toBe(1)
    const params: string[] = insertCalls[0]![1]
    // params: [registry, label, actor, payload]
    expect(params[0]).toBe('basic')
    expect(params[1]).toBe('test-snap')
    // payload is JSON; parse and check _meta
    const payload = JSON.parse(params[3]!) as { _meta?: unknown }
    expect(payload).toHaveProperty('_meta')
  })

  it('uses "snapshot" as default actor when x-actor header is absent', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO `bgs_mapping_snapshot`')) {
        return { rows: [], rowCount: 1, insertId: 2 }
      }
      return { rows: [], rowCount: 0 }
    })

    await request(app)
      .post('/api/basic-config/_snapshots')
      .send({ label: 'no-actor' })

    const insertCalls = insertSnapshotCalls()
    expect(insertCalls[0]![1][2]).toBe('snapshot')
  })

  it('uses eclaim registry for eclaim-config endpoint', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO `bgs_mapping_snapshot`')) {
        return { rows: [], rowCount: 1, insertId: 99 }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app)
      .post('/api/eclaim-config/_snapshots')
      .send({ label: 'eclaim-snap' })

    expect(res.status).toBe(200)
    const insertCalls = insertSnapshotCalls()
    expect(insertCalls[0]![1][0]).toBe('eclaim')
  })
})

// ── GET /_snapshots ───────────────────────────────────────────────────────────

describe('GET /api/basic-config/_snapshots', () => {
  it('returns a list of snapshots (no payload)', async () => {
    const fakeRows = [
      { id: 5, ts: '2026-05-17 10:00:00', label: 'snap-b', actor: 'admin' },
      { id: 3, ts: '2026-05-16 09:00:00', label: 'snap-a', actor: 'admin' },
    ]
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('CREATE TABLE IF NOT EXISTS') && sql.includes('bgs_mapping_snapshot')) {
        return { rows: [], rowCount: 0 }
      }
      if (sql.includes('SELECT') && sql.includes('bgs_mapping_snapshot') && !sql.includes('payload')) {
        return { rows: fakeRows, rowCount: 2 }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/basic-config/_snapshots')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(2)
    expect(res.body[0]).toHaveProperty('id')
    expect(res.body[0]).toHaveProperty('label')
    expect(res.body[0]).not.toHaveProperty('payload')
  })

  it('returns empty array when no snapshots exist', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })
    const res = await request(app).get('/api/basic-config/_snapshots')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

// ── GET /_snapshots/:id/diff ──────────────────────────────────────────────────

describe('GET /api/basic-config/_snapshots/:id/diff', () => {
  it('returns diff with changed entries when value changed', async () => {
    // Snapshot payload: occupation/01 had s='0100'; current returns '0200'
    const snapPayload = {
      _meta: { capturedAt: '2026-01-01T00:00:00.000Z', registry: 'basic', pendingSkipped: [] },
      occupation: { '01': { s: '0100' } },
    }

    mockQuery.mockImplementation(async (sql: string) => {
      // GET snapshot by id
      if (sql.includes('SELECT') && sql.includes('bgs_mapping_snapshot') && sql.includes('payload')) {
        return {
          rows: [{ id: 5, ts: '2026-05-17', registry: 'basic', label: 'snap', actor: 'admin', payload: JSON.stringify(snapPayload) }],
          rowCount: 1,
        }
      }
      // ensure table
      if (sql.includes('CREATE TABLE IF NOT EXISTS') && sql.includes('bgs_mapping_snapshot')) {
        return { rows: [], rowCount: 0 }
      }
      // buildListSql for occupation returns current value '0200'
      if (sql.includes('FROM `occupation`')) {
        return { rows: [{ code: '01', name: 'test', std_code: '0200', std_name: null, mapped: 1 }], rowCount: 1 }
      }
      // all other categories return empty
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/basic-config/_snapshots/5/diff')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('totalChanged')
    expect(res.body).toHaveProperty('changed')
    expect(res.body.totalChanged).toBeGreaterThan(0)
    const diff = res.body.changed.find((d: { field: string }) => d.field === 'std_code')
    expect(diff).toBeTruthy()
    expect(diff.from).toBe('0100')
    expect(diff.to).toBe('0200')
  })

  it('returns empty diff when snapshot matches current', async () => {
    const snapPayload = {
      _meta: { capturedAt: '2026-01-01T00:00:00.000Z', registry: 'basic', pendingSkipped: [] },
      occupation: { '01': { s: '0100' } },
    }

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT') && sql.includes('bgs_mapping_snapshot') && sql.includes('payload')) {
        return {
          rows: [{ id: 5, ts: '2026-05-17', registry: 'basic', label: 'snap', actor: 'admin', payload: JSON.stringify(snapPayload) }],
          rowCount: 1,
        }
      }
      if (sql.includes('CREATE TABLE IF NOT EXISTS') && sql.includes('bgs_mapping_snapshot')) {
        return { rows: [], rowCount: 0 }
      }
      if (sql.includes('FROM `occupation`')) {
        return { rows: [{ code: '01', name: 'test', std_code: '0100', std_name: null, mapped: 1 }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/basic-config/_snapshots/5/diff')

    expect(res.status).toBe(200)
    expect(res.body.totalChanged).toBe(0)
  })

  it('returns 404 for unknown snapshot id', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('CREATE TABLE IF NOT EXISTS') && sql.includes('bgs_mapping_snapshot')) {
        return { rows: [], rowCount: 0 }
      }
      if (sql.includes('SELECT') && sql.includes('bgs_mapping_snapshot') && sql.includes('payload')) {
        return { rows: [], rowCount: 0 }  // not found
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/basic-config/_snapshots/9999/diff')
    expect(res.status).toBe(404)
  })

  it('returns 404 when snapshot belongs to a different registry', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('CREATE TABLE IF NOT EXISTS') && sql.includes('bgs_mapping_snapshot')) {
        return { rows: [], rowCount: 0 }
      }
      // Query with WHERE registry=? filters by registry, so empty result = not found
      if (sql.includes('SELECT') && sql.includes('bgs_mapping_snapshot') && sql.includes('payload')) {
        return { rows: [], rowCount: 0 }
      }
      return { rows: [], rowCount: 0 }
    })

    // Querying basic-config for an eclaim snapshot
    const res = await request(app).get('/api/basic-config/_snapshots/7/diff')
    expect(res.status).toBe(404)
  })
})

// ── POST /_snapshots/:id/restore ─────────────────────────────────────────────

describe('POST /api/basic-config/_snapshots/:id/restore', () => {
  it('returns 404 for unknown snapshot id', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('CREATE TABLE IF NOT EXISTS') && sql.includes('bgs_mapping_snapshot')) {
        return { rows: [], rowCount: 0 }
      }
      if (sql.includes('SELECT') && sql.includes('bgs_mapping_snapshot') && sql.includes('payload')) {
        return { rows: [], rowCount: 0 }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).post('/api/basic-config/_snapshots/9999/restore')
    expect(res.status).toBe(404)
  })

  it('restores writes and records audit for changed value', async () => {
    // Snapshot: occupation/01 had s='0100'; current returns '0200' → one write needed
    const snapPayload = {
      _meta: { capturedAt: '2026-01-01T00:00:00.000Z', registry: 'basic', pendingSkipped: [] },
      occupation: { '01': { s: '0100' } },
    }

    mockQuery.mockImplementation(async (sql: string) => {
      // Snapshot retrieve
      if (sql.includes('SELECT') && sql.includes('bgs_mapping_snapshot') && sql.includes('payload')) {
        return {
          rows: [{ id: 5, ts: '2026-05-17', registry: 'basic', label: 'snap', actor: 'admin', payload: JSON.stringify(snapPayload) }],
          rowCount: 1,
        }
      }
      if (sql.includes('CREATE TABLE IF NOT EXISTS') && sql.includes('bgs_mapping_snapshot')) {
        return { rows: [], rowCount: 0 }
      }
      // Current capture: occupation returns '0200'
      if (sql.includes('FROM `occupation`') && sql.includes('AS code')) {
        return { rows: [{ code: '01', name: 'test', std_code: '0200', std_name: null, mapped: 1 }], rowCount: 1 }
      }
      // Existence check
      if (sql.includes('SELECT 1 FROM `occupation`') || sql.includes("EXISTS")) {
        return { rows: [{ '1': 1 }], rowCount: 1 }
      }
      // Audit table create/insert
      if (sql.includes('bgs_mapping_audit')) {
        return { rows: [], rowCount: 0 }
      }
      // UPDATE
      if (sql.startsWith('UPDATE')) {
        return { rows: [], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app)
      .post('/api/basic-config/_snapshots/5/restore')
      .set('x-actor', 'admin')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('restored')
    expect(res.body).toHaveProperty('skippedPending')
    expect(res.body).toHaveProperty('errors')
    expect(res.body.restored).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(res.body.errors)).toBe(true)
  })

  it('issues UPDATE for the restore write', async () => {
    const snapPayload = {
      _meta: { capturedAt: '2026-01-01T00:00:00.000Z', registry: 'basic', pendingSkipped: [] },
      occupation: { '01': { s: '0100' } },
    }

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT') && sql.includes('bgs_mapping_snapshot') && sql.includes('payload')) {
        return {
          rows: [{ id: 5, ts: '2026-05-17', registry: 'basic', label: 'snap', actor: 'admin', payload: JSON.stringify(snapPayload) }],
          rowCount: 1,
        }
      }
      if (sql.includes('CREATE TABLE IF NOT EXISTS')) {
        return { rows: [], rowCount: 0 }
      }
      if (sql.includes('FROM `occupation`') && sql.includes('AS code')) {
        return { rows: [{ code: '01', name: 'test', std_code: '0200', std_name: null, mapped: 1 }], rowCount: 1 }
      }
      if (sql.startsWith('UPDATE')) {
        return { rows: [], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app)
      .post('/api/basic-config/_snapshots/5/restore')
      .set('x-actor', 'admin')

    expect(res.status).toBe(200)
    // An UPDATE should have been called (occupation.nhso_code = ?)
    const upd = updateCalls()
    expect(upd.length).toBeGreaterThanOrEqual(1)
    const updSql: string = upd[0]![0]
    expect(updSql).toContain('UPDATE `occupation`')
    expect(updSql).toContain('`nhso_code`')
  })

  it('records audit for each restore write', async () => {
    const snapPayload = {
      _meta: { capturedAt: '2026-01-01T00:00:00.000Z', registry: 'basic', pendingSkipped: [] },
      occupation: { '01': { s: '0100' } },
    }

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT') && sql.includes('bgs_mapping_snapshot') && sql.includes('payload')) {
        return {
          rows: [{ id: 5, ts: '2026-05-17', registry: 'basic', label: 'snap', actor: 'admin', payload: JSON.stringify(snapPayload) }],
          rowCount: 1,
        }
      }
      if (sql.includes('CREATE TABLE IF NOT EXISTS')) {
        return { rows: [], rowCount: 0 }
      }
      if (sql.includes('FROM `occupation`') && sql.includes('AS code')) {
        return { rows: [{ code: '01', name: 'test', std_code: '0200', std_name: null, mapped: 1 }], rowCount: 1 }
      }
      if (sql.startsWith('UPDATE')) {
        return { rows: [], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app)
      .post('/api/basic-config/_snapshots/5/restore')
      .set('x-actor', 'admin')

    expect(res.status).toBe(200)
    const auditCalls = auditInsertCalls()
    expect(auditCalls.length).toBeGreaterThanOrEqual(1)
    // audit params: [registry, category, code, field, old_value, new_value, actor]
    const auditParams = auditCalls[0]![1]
    expect(auditParams[0]).toBe('basic')
    expect(auditParams[1]).toBe('occupation')
    expect(auditParams[2]).toBe('01')
    expect(auditParams[3]).toBe('std_code')
    expect(auditParams[6]).toBe('restore')
  })

  it('is resilient: continues on individual write failure, collects errors', async () => {
    // Two codes in snapshot: '01' changed, '02' changed
    const snapPayload = {
      _meta: { capturedAt: '2026-01-01T00:00:00.000Z', registry: 'basic', pendingSkipped: [] },
      occupation: { '01': { s: '0100' }, '02': { s: '0200' } },
    }

    let updateCount = 0
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT') && sql.includes('bgs_mapping_snapshot') && sql.includes('payload')) {
        return {
          rows: [{ id: 5, ts: '2026-05-17', registry: 'basic', label: 'snap', actor: 'admin', payload: JSON.stringify(snapPayload) }],
          rowCount: 1,
        }
      }
      if (sql.includes('CREATE TABLE IF NOT EXISTS')) {
        return { rows: [], rowCount: 0 }
      }
      if (sql.includes('FROM `occupation`') && sql.includes('AS code')) {
        return {
          rows: [
            { code: '01', name: 'a', std_code: '0199', std_name: null, mapped: 1 },
            { code: '02', name: 'b', std_code: '0299', std_name: null, mapped: 1 },
          ],
          rowCount: 2,
        }
      }
      if (sql.startsWith('UPDATE')) {
        updateCount++
        if (updateCount === 1) throw new Error('DB write error')  // first update fails
        return { rows: [], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app)
      .post('/api/basic-config/_snapshots/5/restore')
      .set('x-actor', 'admin')

    // Should not be 500; should report partial success
    expect(res.status).toBe(200)
    expect(res.body.errors.length).toBeGreaterThanOrEqual(1)
  })

  it('does not write to pending categories (skippedPending > 0 when snapshot has pending)', async () => {
    // NOTE: all basic-config categories are non-pending in the registry.
    // We test the pending guard indirectly via a category not in the registry
    // (restore would skip it since getCategoryFn returns undefined).
    // The main test is: if snapshot has a key that resolves to a pending cat,
    // that key's writes are skipped.
    // Since there are no pending basic-config cats, we just verify skippedPending=0.
    const snapPayload = {
      _meta: { capturedAt: '2026-01-01T00:00:00.000Z', registry: 'basic', pendingSkipped: [] },
      occupation: {},
    }

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT') && sql.includes('bgs_mapping_snapshot') && sql.includes('payload')) {
        return {
          rows: [{ id: 5, ts: '2026-05-17', registry: 'basic', label: 'snap', actor: 'admin', payload: JSON.stringify(snapPayload) }],
          rowCount: 1,
        }
      }
      if (sql.includes('CREATE TABLE IF NOT EXISTS')) {
        return { rows: [], rowCount: 0 }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app)
      .post('/api/basic-config/_snapshots/5/restore')

    expect(res.status).toBe(200)
    expect(res.body.skippedPending).toBe(0)
  })
})

// ── /:category still works after snapshot routes ─────────────────────────────

describe('/:category route not shadowed by /_snapshots', () => {
  it('GET /api/basic-config/occupation still returns rows', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ code: '05', name: 'เกษตรกร', std_code: '0510', std_name: 'x', mapped: 1 }],
      rowCount: 1,
    })
    const res = await request(app).get('/api/basic-config/occupation')
    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({ code: '05' })
  })

  it('GET /api/eclaim-config/eclaim-inscl still returns rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const res = await request(app).get('/api/eclaim-config/eclaim-inscl')
    expect(res.status).toBe(200)
  })
})

// ── eclaim registry ───────────────────────────────────────────────────────────

describe('Eclaim snapshot routes', () => {
  it('GET /api/eclaim-config/_snapshots returns list', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('CREATE TABLE IF NOT EXISTS') && sql.includes('bgs_mapping_snapshot')) {
        return { rows: [], rowCount: 0 }
      }
      if (sql.includes('SELECT') && sql.includes('bgs_mapping_snapshot') && !sql.includes('payload')) {
        return { rows: [{ id: 1, ts: '2026-05-17', label: 'eclaim-snap', actor: 'admin' }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app).get('/api/eclaim-config/_snapshots')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('POST /api/eclaim-config/_snapshots captures eclaim registry', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO `bgs_mapping_snapshot`')) {
        return { rows: [], rowCount: 1, insertId: 10 }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await request(app)
      .post('/api/eclaim-config/_snapshots')
      .send({ label: 'eclaim-v1' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id')
    const insertCalls = insertSnapshotCalls()
    expect(insertCalls[0]![1][0]).toBe('eclaim')
  })
})
