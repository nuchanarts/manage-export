// backend/tests/integration/auth.test.ts
// F9 integration tests — auth routes and requireEditor middleware.
//
// Pattern: all tests that need AUTH enabled set process.env.AUTH_SECRET
// and process.env.AUTH_USERS inside beforeEach/afterEach, then import app
// AFTER setting them (or rely on the middleware reading env at request time).
//
// Because authConfig() reads process.env on every call, setting the env vars
// before the request is sufficient without re-requiring the module.

import request from 'supertest'

const mockQuery = jest.fn()
jest.mock('../../src/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

// Import audit reset helper (used by some routes internally)
import { _resetEnsureForTest } from '../../src/services/auditService'

import app from '../../src/index'
import { signToken } from '../../src/services/auth'

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const TEST_SECRET = 'integration-test-secret-xyz'
const TEST_USERS = JSON.stringify([
  { u: 'editor1', p: 'edpass', role: 'editor' },
  { u: 'viewer1', p: 'viewpass', role: 'viewer' },
])

function editorToken(): string {
  return signToken(
    { u: 'editor1', role: 'editor', exp: Date.now() + 60_000 },
    TEST_SECRET,
  )
}

function viewerToken(): string {
  return signToken(
    { u: 'viewer1', role: 'viewer', exp: Date.now() + 60_000 },
    TEST_SECRET,
  )
}

// ─── Env save/restore ─────────────────────────────────────────────────────────

const savedSecret = process.env['AUTH_SECRET']
const savedUsers = process.env['AUTH_USERS']

function enableAuth() {
  process.env['AUTH_SECRET'] = TEST_SECRET
  process.env['AUTH_USERS'] = TEST_USERS
}

function disableAuth() {
  delete process.env['AUTH_SECRET']
  delete process.env['AUTH_USERS']
}

beforeEach(() => {
  mockQuery.mockReset()
  _resetEnsureForTest()
  disableAuth() // default: auth disabled
})

afterAll(() => {
  // Restore original env
  if (savedSecret === undefined) delete process.env['AUTH_SECRET']
  else process.env['AUTH_SECRET'] = savedSecret

  if (savedUsers === undefined) delete process.env['AUTH_USERS']
  else process.env['AUTH_USERS'] = savedUsers
})

// ─── GET /auth/status ─────────────────────────────────────────────────────────

describe('GET /api/auth/status', () => {
  it('returns { enabled: false } when auth is disabled', async () => {
    disableAuth()
    const res = await request(app).get('/api/auth/status')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ enabled: false })
  })

  it('returns { enabled: true } when auth is enabled', async () => {
    enableAuth()
    const res = await request(app).get('/api/auth/status')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ enabled: true })
  })
})

// ─── POST /auth/login ─────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 400 AUTH_DISABLED when auth is not configured', async () => {
    disableAuth()
    const res = await request(app).post('/api/auth/login').send({ u: 'editor1', p: 'edpass' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('AUTH_DISABLED')
  })

  it('returns 401 INVALID_CREDENTIALS on wrong password', async () => {
    enableAuth()
    const res = await request(app).post('/api/auth/login').send({ u: 'editor1', p: 'wrongpass' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('INVALID_CREDENTIALS')
  })

  it('returns 401 INVALID_CREDENTIALS on unknown user', async () => {
    enableAuth()
    const res = await request(app).post('/api/auth/login').send({ u: 'nobody', p: 'edpass' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('INVALID_CREDENTIALS')
  })

  it('returns { token, u, role } for valid editor credentials', async () => {
    enableAuth()
    const res = await request(app).post('/api/auth/login').send({ u: 'editor1', p: 'edpass' })
    expect(res.status).toBe(200)
    expect(res.body.u).toBe('editor1')
    expect(res.body.role).toBe('editor')
    expect(typeof res.body.token).toBe('string')
    expect(res.body.token.includes('.')).toBe(true)
  })

  it('returns { token, u, role } for valid viewer credentials', async () => {
    enableAuth()
    const res = await request(app).post('/api/auth/login').send({ u: 'viewer1', p: 'viewpass' })
    expect(res.status).toBe(200)
    expect(res.body.u).toBe('viewer1')
    expect(res.body.role).toBe('viewer')
    expect(typeof res.body.token).toBe('string')
  })

  it('returns 400 INVALID_BODY when u/p not provided', async () => {
    enableAuth()
    const res = await request(app).post('/api/auth/login').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('INVALID_BODY')
  })
})

// ─── Auth DISABLED: writes still work (existing tests sanity) ────────────────

describe('Write endpoints with AUTH DISABLED', () => {
  it('PUT /api/basic-config/occupation/:code succeeds without any token (auth disabled)', async () => {
    disableAuth()
    mockQuery
      .mockResolvedValueOnce({ rows: [{ code: '05' }], rowCount: 1 }) // exists
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 }) // select-current (audit)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
      .mockResolvedValue({ rows: [], rowCount: 0 }) // ensure + audit INSERT (best-effort)

    const res = await request(app)
      .put('/api/basic-config/occupation/05')
      .send({ std_code: '0510' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})

// ─── Auth ENABLED: access control on write endpoints ─────────────────────────

describe('Write endpoints with AUTH ENABLED', () => {
  beforeEach(() => {
    enableAuth()
  })

  it('PUT without token → 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .put('/api/basic-config/occupation/05')
      .send({ std_code: '0510' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('UNAUTHORIZED')
  })

  it('PUT with invalid token → 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .put('/api/basic-config/occupation/05')
      .set('Authorization', 'Bearer invalidtoken.badsig')
      .send({ std_code: '0510' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('UNAUTHORIZED')
  })

  it('PUT with viewer token → 403 FORBIDDEN', async () => {
    const res = await request(app)
      .put('/api/basic-config/occupation/05')
      .set('Authorization', `Bearer ${viewerToken()}`)
      .send({ std_code: '0510' })
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('FORBIDDEN')
  })

  it('PUT with editor token → 200 and audit actor = username', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ code: '05' }], rowCount: 1 }) // exists
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 }) // select-current
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
      .mockResolvedValue({ rows: [], rowCount: 0 }) // ensure + audit INSERT

    const res = await request(app)
      .put('/api/basic-config/occupation/05')
      .set('Authorization', `Bearer ${editorToken()}`)
      .send({ std_code: '0510' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })

    // The audit INSERT should contain 'editor1' as the actor
    const auditCall = mockQuery.mock.calls.find(
      ([sql]: [string]) => typeof sql === 'string' && sql.includes('INSERT INTO `bgs_mapping_audit`')
    )
    expect(auditCall).toBeDefined()
    // actor is the 5th param in the INSERT: (registry, category, code, field, old_value, new_value, actor)
    const params = auditCall![1] as unknown[]
    expect(params).toContain('editor1')
  })

  it('POST /_auto-match-all without token → 401', async () => {
    const res = await request(app)
      .post('/api/basic-config/_auto-match-all')
      .send({})
    expect(res.status).toBe(401)
  })

  it('POST /_snapshots without token → 401', async () => {
    const res = await request(app)
      .post('/api/basic-config/_snapshots')
      .send({ label: 'test' })
    expect(res.status).toBe(401)
  })

  it('POST /:category/undo without token → 401', async () => {
    const res = await request(app)
      .post('/api/basic-config/occupation/undo')
      .send({})
    expect(res.status).toBe(401)
  })

  it('GET read-only endpoints remain open (no token required)', async () => {
    // GET /api/basic-config should be accessible without token
    const res = await request(app).get('/api/basic-config')
    expect(res.status).toBe(200)
  })

  it('GET /api/auth/status remains open (no token required)', async () => {
    const res = await request(app).get('/api/auth/status')
    expect(res.status).toBe(200)
    expect(res.body.enabled).toBe(true)
  })

  it('x-auth-token header also accepted', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ code: '05' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValue({ rows: [], rowCount: 0 })

    const res = await request(app)
      .put('/api/basic-config/occupation/05')
      .set('x-auth-token', editorToken())
      .send({ std_code: '0510' })

    expect(res.status).toBe(200)
  })
})
