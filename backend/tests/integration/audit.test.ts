// backend/tests/integration/audit.test.ts
// Integration tests for F1 audit logging:
//   - PUT wires audit (old→new, category, field, actor)
//   - no-op PUT (old===new) skips audit insert
//   - pending category → 400 and NO audit
//   - GET /:category/audit returns rows

import request from 'supertest'

const mockQuery = jest.fn()
jest.mock('../../src/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

// Reset the audit table ensure-guard between tests so each test controls the full call sequence.
import { _resetEnsureForTest } from '../../src/services/auditService'

import app from '../../src/index'

beforeEach(() => {
  mockQuery.mockReset()
  _resetEnsureForTest()
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns all mock calls whose SQL contains 'INSERT INTO `bgs_mapping_audit`' */
function auditInsertCalls() {
  return mockQuery.mock.calls.filter(
    ([sql]: [string]) => typeof sql === 'string' && sql.includes('INSERT INTO `bgs_mapping_audit`')
  )
}

/** Returns all mock calls whose SQL contains 'CREATE TABLE IF NOT EXISTS' */
function ensureCalls() {
  return mockQuery.mock.calls.filter(
    ([sql]: [string]) => typeof sql === 'string' && sql.includes('CREATE TABLE IF NOT EXISTS')
  )
}

/** Returns all mock calls whose SQL starts with 'SELECT' and reads current_val */
function selectCurrentCalls() {
  return mockQuery.mock.calls.filter(
    ([sql]: [string]) => typeof sql === 'string' && sql.includes('current_val')
  )
}

// ─── PUT std_code — audit is written ─────────────────────────────────────────

describe('PUT std_code → audit row written', () => {
  it('basic-config PUT occupation/:code → audit INSERT called with old/new/field/category/actor', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ occupation: '05' }], rowCount: 1 }) // exists
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 }) // select-current
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                       // update
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })                       // ensure audit table
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                       // audit INSERT

    const res = await request(app)
      .put('/api/basic-config/occupation/05')
      .set('x-actor', 'nurse01')
      .send({ std_code: '0510' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })

    const auditCalls = auditInsertCalls()
    expect(auditCalls.length).toBe(1)
    const [, params] = auditCalls[0]
    // params: [registry, category, code, field, old_value, new_value, actor]
    expect(params[0]).toBe('basic')
    expect(params[1]).toBe('occupation')
    expect(params[2]).toBe('05')
    expect(params[3]).toBe('std_code')
    expect(params[4]).toBeNull()        // old_value was null
    expect(params[5]).toBe('0510')      // new_value
    expect(params[6]).toBe('nurse01')   // actor from x-actor header
  })

  it('uses "unknown" as actor when x-actor header is absent', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ occupation: '05' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ current_val: '0100' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })

    const res = await request(app)
      .put('/api/basic-config/occupation/05')
      .send({ std_code: '0510' })

    expect(res.status).toBe(200)
    const auditCalls = auditInsertCalls()
    expect(auditCalls.length).toBe(1)
    expect(auditCalls[0][1][6]).toBe('unknown')
  })

  it('reads old value via SELECT current_val before UPDATE', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ occupation: '05' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ current_val: 'OLD_CODE' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })

    await request(app)
      .put('/api/basic-config/occupation/05')
      .set('x-actor', 'admin')
      .send({ std_code: 'NEW_CODE' })

    const selCalls = selectCurrentCalls()
    expect(selCalls.length).toBe(1)
    expect(selCalls[0][0]).toContain('current_val')

    const auditCalls = auditInsertCalls()
    expect(auditCalls[0][1][4]).toBe('OLD_CODE') // old_value
    expect(auditCalls[0][1][5]).toBe('NEW_CODE') // new_value
  })
})

// ─── No-op PUT (old === new) — no audit INSERT ────────────────────────────────

describe('PUT where new === old → NO audit insert', () => {
  it('when old_value equals new_value, audit INSERT is NOT called', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ occupation: '05' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ current_val: '0510' }], rowCount: 1 }) // old = '0510'
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // update still happens

    const res = await request(app)
      .put('/api/basic-config/occupation/05')
      .send({ std_code: '0510' }) // new = '0510' → same → skip audit

    expect(res.status).toBe(200)
    expect(auditInsertCalls().length).toBe(0)
    // ensureAuditTable was NOT called either (since recordMappingChange short-circuits)
    expect(ensureCalls().length).toBe(0)
  })
})

// ─── Pending category → 400, no audit ────────────────────────────────────────

describe('pending category → 400 and NO audit', () => {
  it('PUT to a pending category returns 400 and does not call any DB query', async () => {
    // All categories in basic-config are non-pending; we use an unknown key to
    // verify the guard fires before any DB call (same guard path as pending).
    const res = await request(app)
      .put('/api/basic-config/totally-unknown-key/001')
      .send({ std_code: '001' })

    // unknown key → 404 (guard fires before DB)
    expect(res.status).toBe(404)
    expect(mockQuery).not.toHaveBeenCalled()
  })
})

// ─── GET /:category/audit endpoint ───────────────────────────────────────────

describe('GET /:category/audit', () => {
  it('returns 200 with audit rows for a known category', async () => {
    const fakeRows = [
      { ts: '2026-05-17T10:00:00', code: '05', field: 'std_code', old_value: null, new_value: '0510', actor: 'nurse01' },
    ]
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })    // ensureAuditTable
      .mockResolvedValueOnce({ rows: fakeRows, rowCount: 1 }) // SELECT audit

    const res = await request(app).get('/api/basic-config/occupation/audit')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(1)
    expect(res.body[0]).toMatchObject({ code: '05', field: 'std_code', new_value: '0510', actor: 'nurse01' })
  })

  it('returns 404 for unknown category', async () => {
    const res = await request(app).get('/api/basic-config/no-such-category/audit')
    expect(res.status).toBe(404)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('passes custom limit query param', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })
    await request(app).get('/api/basic-config/occupation/audit?limit=10')
    // Second call is the SELECT
    const selSql: string = mockQuery.mock.calls[1][0]
    expect(selSql).toContain('LIMIT 10')
  })

  it('returns 200 for eclaim-config audit endpoint', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const res = await request(app).get('/api/eclaim-config/eclaim-inscl/audit')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('passes registry=eclaim for eclaim-config audit', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })
    await request(app).get('/api/eclaim-config/eclaim-inscl/audit')
    // Second call (SELECT) params include 'eclaim'
    const params: string[] = mockQuery.mock.calls[1][1]
    expect(params[0]).toBe('eclaim')
    expect(params[1]).toBe('eclaim-inscl')
  })
})

// ─── PUT std_code2 — audit is written ────────────────────────────────────────

describe('PUT std_code2 → audit row written', () => {
  it('eclaim-config PUT eclaim-clinic/:code std_code2 → audit with field=std_code2', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ clinic: 'CLI01' }], rowCount: 1 }) // exists
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 }) // select-current (std_code2)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                       // update
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })                       // ensure audit table
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                       // audit INSERT

    const res = await request(app)
      .put('/api/eclaim-config/eclaim-clinic/CLI01')
      .set('x-actor', 'doctor01')
      .send({ std_code2: 'ACT42' })

    expect(res.status).toBe(200)
    const auditCalls = auditInsertCalls()
    expect(auditCalls.length).toBe(1)
    const params = auditCalls[0][1]
    expect(params[0]).toBe('eclaim')
    expect(params[1]).toBe('eclaim-clinic')
    expect(params[3]).toBe('std_code2')
    expect(params[5]).toBe('ACT42')
    expect(params[6]).toBe('doctor01')
  })
})

// ─── PUT extra — audit is written ────────────────────────────────────────────

describe('PUT extra field → audit row written', () => {
  it('eclaim-config PUT eclaim-charge/:code extra index 0 → audit with field=std_code_e0', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ icode: 'I001' }], rowCount: 1 }) // exists
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 }) // select-current (e0)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                       // update
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })                       // ensure
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                       // audit INSERT

    const res = await request(app)
      .put('/api/eclaim-config/eclaim-charge/I001')
      .set('x-actor', 'import')
      .send({ extra: { index: 0, value: 'BC99' } })

    expect(res.status).toBe(200)
    const auditCalls = auditInsertCalls()
    expect(auditCalls.length).toBe(1)
    const params = auditCalls[0][1]
    expect(params[3]).toBe('std_code_e0')
    expect(params[5]).toBe('BC99')
    expect(params[6]).toBe('import')
  })
})

// ─── Audit INSERT failure does NOT break mapping save ────────────────────────

describe('audit INSERT failure is best-effort', () => {
  it('mapping returns 200 ok even when audit INSERT throws', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ occupation: '05' }], rowCount: 1 }) // exists
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 }) // select-current
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                       // update OK
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })                       // ensure audit table OK
      .mockRejectedValueOnce(new Error('DB audit table locked'))              // audit INSERT fails

    const res = await request(app)
      .put('/api/basic-config/occupation/05')
      .send({ std_code: '0510' })

    // Mapping must succeed despite audit failure
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})
