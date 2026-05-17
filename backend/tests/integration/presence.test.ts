// backend/tests/integration/presence.test.ts
import request from 'supertest'

const mockQuery = jest.fn()
jest.mock('../../src/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

import app from '../../src/index'

describe('presence routes', () => {
  it('POST /api/presence/ping returns { ok: true }', async () => {
    const res = await request(app)
      .post('/api/presence/ping')
      .send({ id: 'test-client-001' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('GET /api/presence/count returns count >= 1 after a ping', async () => {
    // Ping with a unique id to ensure at least one active entry
    await request(app)
      .post('/api/presence/ping')
      .send({ id: 'test-client-count-check' })

    const res = await request(app).get('/api/presence/count')
    expect(res.status).toBe(200)
    expect(typeof res.body.count).toBe('number')
    expect(res.body.count).toBeGreaterThanOrEqual(1)
  })

  it('POST /api/presence/ping with missing id → 400', async () => {
    const res = await request(app)
      .post('/api/presence/ping')
      .send({})
    expect(res.status).toBe(400)
  })

  it('POST /api/presence/ping with empty id → 400', async () => {
    const res = await request(app)
      .post('/api/presence/ping')
      .send({ id: '' })
    expect(res.status).toBe(400)
  })

  it('POST /api/presence/ping with id > 64 chars → 400', async () => {
    const longId = 'a'.repeat(65)
    const res = await request(app)
      .post('/api/presence/ping')
      .send({ id: longId })
    expect(res.status).toBe(400)
  })
})
