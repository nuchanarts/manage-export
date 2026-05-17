// backend/tests/integration/undo.test.ts
// Integration tests for F2: POST /:category/undo
//   - undo with history reverts via correct builder + records reverse audit
//   - undo with NO history → 400 NO_HISTORY
//   - undo on pending category → 400 PENDING_CATEGORY (no DB write)
//   - undo of std_code2 uses buildUpdateSql2
//   - undo of std_code_e{i} uses buildUpdateSqlExtra
//   - unknown category → 404
//   - code gone (deleted after audit) → 400 CODE_GONE
//   - undo is itself audited (new INSERT with swapped old/new)
//   - audit INSERT failure does NOT break the revert (best-effort)

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

/** All INSERT INTO bgs_mapping_audit calls */
function auditInsertCalls() {
  return mockQuery.mock.calls.filter(
    ([sql]: [string]) => typeof sql === 'string' && sql.includes('INSERT INTO `bgs_mapping_audit`')
  )
}

/** All calls whose SQL contains 'SELECT' and '`id`' and 'bgs_mapping_audit' (the getLastChange query) */
function lastChangeCalls() {
  return mockQuery.mock.calls.filter(
    ([sql]: [string]) =>
      typeof sql === 'string' &&
      sql.includes('bgs_mapping_audit') &&
      sql.includes('ORDER BY `id` DESC') &&
      sql.includes('LIMIT 1')
  )
}

/** All UPDATE calls */
function updateCalls() {
  return mockQuery.mock.calls.filter(
    ([sql]: [string]) => typeof sql === 'string' && sql.trim().startsWith('UPDATE')
  )
}

// ─── POST /:category/undo — unknown category → 404 ───────────────────────────

describe('POST undo — unknown category → 404', () => {
  it('returns 404 for an unknown category', async () => {
    const res = await request(app).post('/api/basic-config/no-such-category/undo')
    expect(res.status).toBe(404)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown eclaim category', async () => {
    const res = await request(app).post('/api/eclaim-config/no-such-eclaim/undo')
    expect(res.status).toBe(404)
    expect(mockQuery).not.toHaveBeenCalled()
  })
})

// ─── POST undo — NO_HISTORY (no audit rows) → 400 ────────────────────────────

describe('POST undo — NO_HISTORY → 400', () => {
  it('returns 400 NO_HISTORY when no audit rows exist for that category', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // ensure audit table
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // getLastChange → empty

    const res = await request(app).post('/api/basic-config/occupation/undo')

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('NO_HISTORY')
    expect(updateCalls().length).toBe(0)
    expect(auditInsertCalls().length).toBe(0)
  })
})

// ─── POST undo — CODE_GONE → 400 ─────────────────────────────────────────────

describe('POST undo — CODE_GONE → 400', () => {
  it('returns 400 CODE_GONE when the code no longer exists in master table', async () => {
    const lastRow = {
      id: 10, ts: '2026-05-17T09:00:00', code: '05', field: 'std_code',
      old_value: null, new_value: '0510', actor: 'nurse01',
    }
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })         // ensure audit table
      .mockResolvedValueOnce({ rows: [lastRow], rowCount: 1 })  // getLastChange
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })         // buildExistsSql → not found

    const res = await request(app).post('/api/basic-config/occupation/undo')

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('CODE_GONE')
    expect(updateCalls().length).toBe(0)
  })
})

// ─── POST undo — std_code primary field ──────────────────────────────────────

describe('POST undo — std_code primary field reverts correctly', () => {
  it('occupation std_code: reverts via buildUpdateSql and records reverse audit', async () => {
    const lastRow = {
      id: 7, ts: '2026-05-17T09:00:00', code: '05', field: 'std_code',
      old_value: null, new_value: '0510', actor: 'nurse01',
    }
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })          // ensure audit table
      .mockResolvedValueOnce({ rows: [lastRow], rowCount: 1 })   // getLastChange
      .mockResolvedValueOnce({ rows: [{ occupation: '05' }], rowCount: 1 }) // buildExistsSql
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })           // UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })           // ensure (for audit insert)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })           // audit INSERT (reverse)

    const res = await request(app)
      .post('/api/basic-config/occupation/undo')
      .set('x-actor', 'admin')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      ok: true,
      reverted: { code: '05', field: 'std_code', from: '0510', to: null },
    })

    // UPDATE must use buildUpdateSql (occupation table, nhso_code col)
    const ups = updateCalls()
    expect(ups.length).toBe(1)
    expect(ups[0][0]).toContain('UPDATE `occupation` SET `nhso_code` = ?')
    // old_value was null → revert to null
    expect(ups[0][1][0]).toBeNull()
    expect(ups[0][1][1]).toBe('05')

    // Reverse audit INSERT: old=new_value(0510), new=old_value(null)
    const ins = auditInsertCalls()
    expect(ins.length).toBe(1)
    const p = ins[0][1]
    expect(p[0]).toBe('basic')
    expect(p[1]).toBe('occupation')
    expect(p[2]).toBe('05')
    expect(p[3]).toBe('std_code')
    expect(p[4]).toBe('0510')    // old of the undo row = new of the original
    expect(p[5]).toBeNull()      // new of the undo row = old of the original
    expect(p[6]).toBe('admin')   // actor from x-actor header
  })

  it('uses "undo" as actor when x-actor header is absent', async () => {
    const lastRow = {
      id: 8, ts: '2026-05-17T09:00:00', code: '05', field: 'std_code',
      old_value: '0100', new_value: '0510', actor: 'nurse01',
    }
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [lastRow], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ occupation: '05' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValue({ rows: [], rowCount: 0 })

    const res = await request(app).post('/api/basic-config/occupation/undo')

    expect(res.status).toBe(200)
    const ins = auditInsertCalls()
    expect(ins.length).toBe(1)
    expect(ins[0][1][6]).toBe('undo')
  })

  it('getLastChange query uses registry=basic and category=occupation', async () => {
    const lastRow = {
      id: 9, ts: '2026-05-17T09:00:00', code: '05', field: 'std_code',
      old_value: null, new_value: '0510', actor: 'x',
    }
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [lastRow], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ occupation: '05' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValue({ rows: [], rowCount: 0 })

    await request(app).post('/api/basic-config/occupation/undo')

    const lc = lastChangeCalls()
    expect(lc.length).toBe(1)
    expect(lc[0][1]).toEqual(['basic', 'occupation'])
  })
})

// ─── POST undo — std_code2 secondary field ────────────────────────────────────

describe('POST undo — std_code2 secondary field uses buildUpdateSql2', () => {
  it('eclaim-clinic std_code2: reverts via buildUpdateSql2', async () => {
    const lastRow = {
      id: 20, ts: '2026-05-17T10:00:00', code: 'CLI01', field: 'std_code2',
      old_value: null, new_value: 'ACT42', actor: 'doctor01',
    }
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })           // ensure
      .mockResolvedValueOnce({ rows: [lastRow], rowCount: 1 })    // getLastChange
      .mockResolvedValueOnce({ rows: [{ clinic: 'CLI01' }], rowCount: 1 }) // exists
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })            // UPDATE
      .mockResolvedValue({ rows: [], rowCount: 0 })                // ensure + audit INSERT

    const res = await request(app)
      .post('/api/eclaim-config/eclaim-clinic/undo')
      .set('x-actor', 'admin')

    expect(res.status).toBe(200)
    expect(res.body.reverted).toMatchObject({ code: 'CLI01', field: 'std_code2', from: 'ACT42', to: null })

    const ups = updateCalls()
    expect(ups.length).toBe(1)
    // buildUpdateSql2: UPDATE `clinic` SET `oapp_activity_id` = ? WHERE `clinic` = ?
    expect(ups[0][0]).toContain('SET `oapp_activity_id` = ?')
    expect(ups[0][1][0]).toBeNull()    // revert to old_value=null
    expect(ups[0][1][1]).toBe('CLI01')

    const ins = auditInsertCalls()
    expect(ins.length).toBe(1)
    expect(ins[0][1][3]).toBe('std_code2')
    expect(ins[0][1][4]).toBe('ACT42')  // old (was new)
    expect(ins[0][1][5]).toBeNull()     // new (was old)
  })
})

// ─── POST undo — std_code_e{i} extra field ───────────────────────────────────

describe('POST undo — std_code_e{i} extra field uses buildUpdateSqlExtra', () => {
  it('eclaim-charge std_code_e0: reverts via buildUpdateSqlExtra(c, 0, ...)', async () => {
    const lastRow = {
      id: 30, ts: '2026-05-17T11:00:00', code: 'I001', field: 'std_code_e0',
      old_value: null, new_value: 'BC99', actor: 'import',
    }
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })           // ensure
      .mockResolvedValueOnce({ rows: [lastRow], rowCount: 1 })    // getLastChange
      .mockResolvedValueOnce({ rows: [{ icode: 'I001' }], rowCount: 1 }) // exists
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })            // UPDATE
      .mockResolvedValue({ rows: [], rowCount: 0 })                // ensure + audit INSERT

    const res = await request(app)
      .post('/api/eclaim-config/eclaim-charge/undo')
      .set('x-actor', 'nurse')

    expect(res.status).toBe(200)
    expect(res.body.reverted).toMatchObject({ code: 'I001', field: 'std_code_e0', from: 'BC99', to: null })

    const ups = updateCalls()
    expect(ups.length).toBe(1)
    // eclaim-charge has extraFields[0].mapCol — the SQL should be an UPDATE with that col
    expect(ups[0][0]).toContain('UPDATE')
    expect(ups[0][0]).toContain('SET')
    expect(ups[0][0]).toContain('= ?')
    expect(ups[0][1][0]).toBeNull()    // revert to old_value=null
    expect(ups[0][1][1]).toBe('I001')

    const ins = auditInsertCalls()
    expect(ins.length).toBe(1)
    expect(ins[0][1][3]).toBe('std_code_e0')
  })
})

// ─── POST undo — eclaim registry uses registry=eclaim ────────────────────────

describe('POST undo — eclaim registry wires correct registry name', () => {
  it('eclaim-config undo uses registry=eclaim in getLastChange params', async () => {
    const lastRow = {
      id: 50, ts: '2026-05-17T12:00:00', code: 'OFC', field: 'std_code',
      old_value: null, new_value: 'OFC', actor: 'admin',
    }
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [lastRow], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ pttype: 'OFC' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValue({ rows: [], rowCount: 0 })

    await request(app).post('/api/eclaim-config/eclaim-inscl/undo')

    const lc = lastChangeCalls()
    expect(lc.length).toBe(1)
    expect(lc[0][1][0]).toBe('eclaim')
    expect(lc[0][1][1]).toBe('eclaim-inscl')
  })
})

// ─── POST undo — audit INSERT failure does NOT break the revert ───────────────

describe('POST undo — audit best-effort (INSERT failure does not break revert)', () => {
  it('returns 200 ok even when the reverse audit INSERT fails', async () => {
    const lastRow = {
      id: 60, ts: '2026-05-17T10:00:00', code: '05', field: 'std_code',
      old_value: null, new_value: '0510', actor: 'nurse01',
    }
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })           // ensure (undo path)
      .mockResolvedValueOnce({ rows: [lastRow], rowCount: 1 })    // getLastChange
      .mockResolvedValueOnce({ rows: [{ occupation: '05' }], rowCount: 1 }) // exists
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })            // UPDATE succeeds
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })            // ensure (audit path)
      .mockRejectedValueOnce(new Error('DB audit table locked'))  // audit INSERT fails

    const res = await request(app).post('/api/basic-config/occupation/undo')

    // Revert must succeed even though audit failed
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(updateCalls().length).toBe(1)
  })
})

// ─── POST undo — response shape ──────────────────────────────────────────────

describe('POST undo — response shape', () => {
  it('response body includes ok:true and reverted object', async () => {
    const lastRow = {
      id: 70, ts: '2026-05-17T10:00:00', code: '05', field: 'std_code',
      old_value: '0100', new_value: '0510', actor: 'nurse01',
    }
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [lastRow], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ occupation: '05' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValue({ rows: [], rowCount: 0 })

    const res = await request(app).post('/api/basic-config/occupation/undo')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      ok: true,
      reverted: {
        code: '05',
        field: 'std_code',
        from: '0510',    // what was (new_value of last change)
        to: '0100',      // reverted to (old_value of last change)
      },
    })
  })
})
