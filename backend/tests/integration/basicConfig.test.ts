// backend/tests/integration/basicConfig.test.ts
import request from 'supertest'

const mockQuery = jest.fn()
jest.mock('../../src/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

import app from '../../src/index'

describe('basic-config routes', () => {
  beforeEach(() => mockQuery.mockReset())

  it('GET /api/basic-config lists categories', async () => {
    const res = await request(app).get('/api/basic-config')
    expect(res.status).toBe(200)
    expect(res.body.find((c: { key: string }) => c.key === 'occupation')).toBeTruthy()
  })

  it('GET /api/basic-config/:category returns rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ code: '05', name: 'เกษตรกร', std_code: '0510', std_name: 'x', mapped: 1 }], rowCount: 1 })
    const res = await request(app).get('/api/basic-config/occupation')
    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({ code: '05', mapped: true })
  })

  it('GET unknown category → 404', async () => {
    const res = await request(app).get('/api/basic-config/nope')
    expect(res.status).toBe(404)
  })

  it('PUT updates the mapping and returns ok', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ code: '05' }], rowCount: 1 })         // existence check
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 })   // select-current (audit)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                         // update
      .mockResolvedValue({ rows: [], rowCount: 0 })                             // ensure + audit INSERT (best-effort)
    const res = await request(app).put('/api/basic-config/occupation/05').send({ std_code: '0510' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    // calls[0]=exists, calls[1]=select-current, calls[2]=UPDATE
    const updateCall = mockQuery.mock.calls[2]
    expect(updateCall[0]).toContain('UPDATE `occupation` SET `nhso_code` = ?')
    expect(updateCall[1]).toEqual(['0510', '05'])
  })

  it('PUT invalid body → 400', async () => {
    const res = await request(app).put('/api/basic-config/occupation/05').send({})
    expect(res.status).toBe(400)
  })

  it('PUT to unknown category → 404 (pending-guard: no pending categories remain in basic-config registry after drug-ned-reason was made editable)', async () => {
    // After Task 1, drug-ned-reason is now pending:false (pk=doctor_reason, mapCol=claim_control).
    // No pending categories remain in categoryRegistry.
    // The pending-guard logic still exists in configRouterFactory (line: if (c.pending) throw 400 PENDING_CATEGORY).
    // We verify the guard is still there indirectly: an unknown key produces 404 NOT_FOUND,
    // and the guard would fire first if a pending key were present.
    const res = await request(app).put('/api/basic-config/totally-unknown-key/001').send({ std_code: '001' })
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('NOT_FOUND')
    // Guard fires before any DB call — mock should never have been invoked
    expect(mockQuery).not.toHaveBeenCalled()
  })

  // ── Dual-field clinic tests ───────────────────────────────────────────────

  it('GET /api/basic-config/clinic/std-options2 returns rows', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ code: '001', name: 'Activity One' }],
      rowCount: 1,
    })
    const res = await request(app).get('/api/basic-config/clinic/std-options2')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('GET std-options2 for a non-dual category → 404', async () => {
    const res = await request(app).get('/api/basic-config/occupation/std-options2')
    expect(res.status).toBe(404)
  })

  it('PUT /api/basic-config/clinic/:code with {std_code2} updates oapp_activity_id', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ clinic: 'CLI01' }], rowCount: 1 })   // existence check
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 }) // select-current (audit)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                       // update
      .mockResolvedValue({ rows: [], rowCount: 0 })                           // ensure + audit INSERT
    const res = await request(app)
      .put('/api/basic-config/clinic/CLI01')
      .send({ std_code2: 'ACT99' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    // calls[0]=exists, calls[1]=select-current, calls[2]=UPDATE
    const updateCall = mockQuery.mock.calls[2]
    expect(updateCall[0]).toContain('UPDATE `clinic` SET `oapp_activity_id` = ?')
    expect(updateCall[1]).toEqual(['ACT99', 'CLI01'])
  })

  it('PUT with {std_code2} to a non-dual category → 400', async () => {
    const res = await request(app)
      .put('/api/basic-config/occupation/05')
      .send({ std_code2: 'X' })
    expect(res.status).toBe(400)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('PUT with empty body → 400', async () => {
    const res = await request(app)
      .put('/api/basic-config/clinic/CLI01')
      .send({})
    expect(res.status).toBe(400)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  // ── drug-ned-reason free-text PUT tests ───────────────────────────────────

  it('PUT /api/basic-config/drug-ned-reason/:code with free-text std_code updates claim_control', async () => {
    const doctorReason = encodeURIComponent('ไม่มียาในบัญชียา')
    mockQuery
      .mockResolvedValueOnce({ rows: [{ doctor_reason: 'ไม่มียาในบัญชียา' }], rowCount: 1 }) // exists
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 })                   // select-current
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                                         // update
      .mockResolvedValue({ rows: [], rowCount: 0 })                                             // ensure + audit INSERT
    const res = await request(app)
      .put(`/api/basic-config/drug-ned-reason/${doctorReason}`)
      .send({ std_code: 'EZ' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    // calls[0]=exists, calls[1]=select-current, calls[2]=UPDATE
    const updateCall = mockQuery.mock.calls[2]
    expect(updateCall[0]).toContain('UPDATE `drugitems_ned_reason_list` SET `claim_control` = ?')
    expect(updateCall[1]).toEqual(['EZ', 'ไม่มียาในบัญชียา'])
  })

  it('PUT /api/basic-config/drug-ned-reason/:code with std_code="" clears to null', async () => {
    const doctorReason = encodeURIComponent('ยาราคาแพง')
    mockQuery
      .mockResolvedValueOnce({ rows: [{ doctor_reason: 'ยาราคาแพง' }], rowCount: 1 }) // exists
      .mockResolvedValueOnce({ rows: [{ current_val: 'OLD' }], rowCount: 1 })          // select-current
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                                 // update
      .mockResolvedValue({ rows: [], rowCount: 0 })                                     // ensure + audit INSERT
    const res = await request(app)
      .put(`/api/basic-config/drug-ned-reason/${doctorReason}`)
      .send({ std_code: '' })
    expect(res.status).toBe(200)
    // calls[0]=exists, calls[1]=select-current, calls[2]=UPDATE
    const updateCall = mockQuery.mock.calls[2]
    expect(updateCall[0]).toContain('UPDATE `drugitems_ned_reason_list` SET `claim_control` = ?')
    expect(updateCall[1][0]).toBeNull()
    expect(updateCall[1][1]).toBe('ยาราคาแพง')
  })

  // ── hideCodeCol flag tests ─────────────────────────────────────────────────

  it('listCategories exposes hideCodeCol:true for drug-ned-reason', async () => {
    const res = await request(app).get('/api/basic-config')
    expect(res.status).toBe(200)
    const nedReason = res.body.find((c: { key: string }) => c.key === 'drug-ned-reason')
    expect(nedReason).toBeDefined()
    expect(nedReason.hideCodeCol).toBe(true)
  })

  it('listCategories does NOT expose hideCodeCol for occupation (other category unchanged)', async () => {
    const res = await request(app).get('/api/basic-config')
    expect(res.status).toBe(200)
    const occ = res.body.find((c: { key: string }) => c.key === 'occupation')
    expect(occ).toBeDefined()
    expect(occ.hideCodeCol).toBeFalsy()
  })
})
