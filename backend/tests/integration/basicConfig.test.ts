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
      .mockResolvedValueOnce({ rows: [{ code: '05' }], rowCount: 1 }) // existence check
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })               // update
    const res = await request(app).put('/api/basic-config/occupation/05').send({ std_code: '0510' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    const updateCall = mockQuery.mock.calls[1]
    expect(updateCall[0]).toContain('UPDATE `occupation` SET `nhso_code` = ?')
    expect(updateCall[1]).toEqual(['0510', '05'])
  })

  it('PUT invalid body → 400', async () => {
    const res = await request(app).put('/api/basic-config/occupation/05').send({})
    expect(res.status).toBe(400)
  })
})
