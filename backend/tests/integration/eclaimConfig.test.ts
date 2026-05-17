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

  it('PUT to a pending eclaim category → 400 PENDING_CATEGORY (no DB call)', async () => {
    // eclaim-clinic is pending:true
    const res = await request(app)
      .put('/api/eclaim-config/eclaim-clinic/001')
      .send({ std_code: '01' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('PENDING_CATEGORY')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('PUT to another pending eclaim category → 400 PENDING_CATEGORY', async () => {
    // eclaim-drug-ned is pending:true
    const res = await request(app)
      .put('/api/eclaim-config/eclaim-drug-ned/EA')
      .send({ std_code: 'EA' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('PENDING_CATEGORY')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('PUT valid eclaim category (mock existence + update) → {ok:true}', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ icode: '3000003' }], rowCount: 1 }) // existence check
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                      // update
    const res = await request(app)
      .put('/api/eclaim-config/eclaim-charge/3000003')
      .send({ std_code: '72999' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    // Verify the UPDATE targets the correct table and column
    const updateCall = mockQuery.mock.calls[1]
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
})
