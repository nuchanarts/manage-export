// backend/tests/integration/eclaimConfig.test.ts
import request from 'supertest'

const mockQuery = jest.fn()
jest.mock('../../src/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

import app from '../../src/index'

describe('eclaim-config routes', () => {
  beforeEach(() => mockQuery.mockReset())

  it('GET /api/eclaim-config lists categories', async () => {
    const res = await request(app).get('/api/eclaim-config')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.find((c: { key: string }) => c.key === 'eclaim-inscl')).toBeTruthy()
    expect(res.body.find((c: { key: string }) => c.key === 'eclaim-charge')).toBeTruthy()
  })

  it('GET /api/eclaim-config lists all 6 required keys', async () => {
    const res = await request(app).get('/api/eclaim-config')
    expect(res.status).toBe(200)
    const keys: string[] = res.body.map((c: { key: string }) => c.key)
    expect(keys).toContain('eclaim-inscl')
    expect(keys).toContain('eclaim-marriage')
    expect(keys).toContain('eclaim-clinic')
    expect(keys).toContain('eclaim-drug-ned')
    expect(keys).toContain('eclaim-drug-list')
    expect(keys).toContain('eclaim-charge')
  })

  it('GET /api/eclaim-config/:category returns rows', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ code: 'OFC', name: 'ข้าราชการ', std_code: 'OFC', std_name: 'ข้าราชการ', mapped: 1 }],
      rowCount: 1,
    })
    const res = await request(app).get('/api/eclaim-config/eclaim-inscl')
    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({ code: 'OFC', mapped: true })
  })

  it('GET /api/eclaim-config unknown category → 404', async () => {
    const res = await request(app).get('/api/eclaim-config/nope')
    expect(res.status).toBe(404)
  })

  it('PUT to unknown eclaim category → 404 (pending-guard active; eclaim-drug-ned is now pending:true — read-only national NED list)', async () => {
    // eclaim-drug-ned is pending:true (read-only by design, owner decision 2026-05-17).
    // The pending-guard in configRouterFactory fires 400 PENDING_CATEGORY for pending keys.
    // An unknown key still produces 404 NOT_FOUND (guard fires after registry lookup for known keys).
    const res = await request(app)
      .put('/api/eclaim-config/totally-unknown-eclaim-key/EA')
      .send({ std_code: 'EA' })
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('NOT_FOUND')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('eclaim-clinic is now non-pending (aligned with 43-file clinic): GET returns rows', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ code: 'CLI01', name: 'คลินิกเบาหวาน', std_code: 'E11', std_name: null, mapped: 0 }],
      rowCount: 1,
    })
    const res = await request(app).get('/api/eclaim-config/eclaim-clinic')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('PUT valid eclaim category (mock existence + update) → {ok:true}', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ icode: '3000003' }], rowCount: 1 }) // existence check
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 }) // select-current (audit)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                       // update
      .mockResolvedValue({ rows: [], rowCount: 0 })                           // ensure + audit INSERT
    const res = await request(app)
      .put('/api/eclaim-config/eclaim-charge/3000003')
      .send({ std_code: '72999' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    // Verify the UPDATE targets the correct table and column
    // calls[0]=exists, calls[1]=select-current, calls[2]=UPDATE
    const updateCall = mockQuery.mock.calls[2]
    expect(updateCall[0]).toContain('UPDATE `nondrugitems` SET `nhso_adp_code` = ?')
    expect(updateCall[1]).toEqual(['72999', '3000003'])
  })

  it('PUT invalid body → 400', async () => {
    const res = await request(app)
      .put('/api/eclaim-config/eclaim-inscl/01')
      .send({})
    expect(res.status).toBe(400)
  })

  it('PUT to unknown eclaim category → 404', async () => {
    const res = await request(app)
      .put('/api/eclaim-config/no-such-key/01')
      .send({ std_code: '01' })
    expect(res.status).toBe(404)
  })

  // ── extraFields: eclaim-charge exposes 7 editable columns ─────────────────

  it('GET /api/eclaim-config/eclaim-charge returns rows with std_code_e* keys', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        code: 'I001', name: 'ค่าตรวจ',
        std_code: null, std_name: null, mapped: 0,
        std_code_e0: null, std_code_e1: null, std_code_e2: null,
        std_code_e3: null, std_code_e4: null, std_code_e5: null,
      }],
      rowCount: 1,
    })
    const res = await request(app).get('/api/eclaim-config/eclaim-charge')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    // The query was built (mocked) — check that the builder includes extra aliases in the SQL
    const sqlCalled: string = mockQuery.mock.calls[0][0]
    expect(sqlCalled).toContain('std_code_e0')
    expect(sqlCalled).toContain('std_code_e5')
    // No extra subqueries for free-value fields
    expect(sqlCalled).not.toContain('std_name_e')
  })

  it('PUT /api/eclaim-config/eclaim-charge/:code with {extra:{index:0,value:"X"}} updates correct column', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ icode: 'I001' }], rowCount: 1 })   // existence check
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 }) // select-current (audit)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                       // update
      .mockResolvedValue({ rows: [], rowCount: 0 })                           // ensure + audit INSERT
    const res = await request(app)
      .put('/api/eclaim-config/eclaim-charge/I001')
      .send({ extra: { index: 0, value: 'X' } })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    // calls[0]=exists, calls[1]=select-current, calls[2]=UPDATE
    const updateCall = mockQuery.mock.calls[2]
    // index 0 = first extraField; primary mapCol is nhso_adp_code (keep it for std_code)
    // Extra fields: billcode(0), nhso_adp_type_id(1), sks_coverage_price(2), enable_sks_opd(3), enable_sks_ipd(4), sks_claim_category_type_id(5)
    expect(updateCall[0]).toContain('UPDATE `nondrugitems` SET')
    expect(updateCall[0]).toContain('= ?')
    expect(updateCall[1][0]).toBe('X')
    expect(updateCall[1][1]).toBe('I001')
  })

  it('PUT /api/eclaim-config/eclaim-charge/:code with {extra:{index:0,value:""}} stores null', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ icode: 'I001' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ current_val: 'OLD' }], rowCount: 1 }) // select-current
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValue({ rows: [], rowCount: 0 })                            // ensure + audit INSERT
    const res = await request(app)
      .put('/api/eclaim-config/eclaim-charge/I001')
      .send({ extra: { index: 0, value: '' } })
    expect(res.status).toBe(200)
    // calls[2] is the UPDATE
    const updateCall = mockQuery.mock.calls[2]
    expect(updateCall[1][0]).toBeNull()
  })

  it('GET /api/eclaim-config/eclaim-charge/std-options-extra/0 returns 200 (array; free-value → [])', async () => {
    const res = await request(app).get('/api/eclaim-config/eclaim-charge/std-options-extra/0')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('GET std-options-extra with out-of-range index → 404', async () => {
    const res = await request(app).get('/api/eclaim-config/eclaim-charge/std-options-extra/99')
    expect(res.status).toBe(404)
  })

  it('GET std-options-extra on a category with no extraFields → 404', async () => {
    const res = await request(app).get('/api/eclaim-config/eclaim-inscl/std-options-extra/0')
    expect(res.status).toBe(404)
  })

  it('PUT with {extra} to non-existent code → 404', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }) // existence check returns nothing
    const res = await request(app)
      .put('/api/eclaim-config/eclaim-charge/NOTEXIST')
      .send({ extra: { index: 0, value: 'X' } })
    expect(res.status).toBe(404)
  })

  it('PUT with {extra:{index:99}} → 400 (out-of-range)', async () => {
    const res = await request(app)
      .put('/api/eclaim-config/eclaim-charge/I001')
      .send({ extra: { index: 99, value: 'X' } })
    expect(res.status).toBe(400)
  })

  // ── Dual-field eclaim-clinic tests ────────────────────────────────────────

  it('GET /api/eclaim-config/eclaim-clinic/std-options2 returns rows', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ code: '001', name: 'กิจกรรมหนึ่ง' }],
      rowCount: 1,
    })
    const res = await request(app).get('/api/eclaim-config/eclaim-clinic/std-options2')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('PUT /api/eclaim-config/eclaim-clinic/:code with {std_code2} updates oapp_activity_id', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ clinic: 'CLI01' }], rowCount: 1 })   // existence check
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 }) // select-current (audit)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                       // update
      .mockResolvedValue({ rows: [], rowCount: 0 })                           // ensure + audit INSERT
    const res = await request(app)
      .put('/api/eclaim-config/eclaim-clinic/CLI01')
      .send({ std_code2: 'ACT42' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    // calls[0]=exists, calls[1]=select-current, calls[2]=UPDATE
    const updateCall = mockQuery.mock.calls[2]
    expect(updateCall[0]).toContain('UPDATE `clinic` SET `oapp_activity_id` = ?')
    expect(updateCall[1]).toEqual(['ACT42', 'CLI01'])
  })

  it('PUT /api/eclaim-config/eclaim-clinic/:code with {std_code2:""} clears to null', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ clinic: 'CLI01' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ current_val: 'OLD' }], rowCount: 1 }) // select-current
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValue({ rows: [], rowCount: 0 })                            // ensure + audit INSERT
    const res = await request(app)
      .put('/api/eclaim-config/eclaim-clinic/CLI01')
      .send({ std_code2: '' })
    expect(res.status).toBe(200)
    // calls[2] is the UPDATE
    const updateCall = mockQuery.mock.calls[2]
    expect(updateCall[0]).toContain('UPDATE `clinic` SET `oapp_activity_id` = ?')
    expect(updateCall[1][0]).toBeNull()
    expect(updateCall[1][1]).toBe('CLI01')
  })

  // ── eclaim-drug-ned read-only guard tests ────────────────────────────────────
  // eclaim-drug-ned is pending:true (fixed national NED reference list, read-only by design, owner decision 2026-05-17).
  // All writes must be rejected with 400 PENDING_CATEGORY; no DB calls must be made.

  it('PUT /api/eclaim-config/eclaim-drug-ned/:code is rejected 400 PENDING_CATEGORY (read-only national NED list)', async () => {
    const doctorReason = encodeURIComponent('ไม่มียาในบัญชียา')
    const res = await request(app)
      .put(`/api/eclaim-config/eclaim-drug-ned/${doctorReason}`)
      .send({ std_code: 'EZ' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('PENDING_CATEGORY')
    // pending-guard fires before any DB call
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('listEclaimCategories exposes hideCodeCol:true for eclaim-drug-ned', async () => {
    const res = await request(app).get('/api/eclaim-config')
    expect(res.status).toBe(200)
    const drugNed = res.body.find((c: { key: string }) => c.key === 'eclaim-drug-ned')
    expect(drugNed).toBeDefined()
    expect(drugNed.hideCodeCol).toBe(true)
  })

  it('listEclaimCategories does NOT expose hideCodeCol for eclaim-inscl (other category unchanged)', async () => {
    const res = await request(app).get('/api/eclaim-config')
    expect(res.status).toBe(200)
    const inscl = res.body.find((c: { key: string }) => c.key === 'eclaim-inscl')
    expect(inscl).toBeDefined()
    expect(inscl.hideCodeCol).toBeFalsy()
  })
})
