// backend/tests/unit/auth.test.ts
// TDD: RED→GREEN for auth service pure functions.

import { signToken, verifyToken, authConfig, checkLogin, TokenPayload } from '../../src/services/auth'

// ─── helpers ─────────────────────────────────────────────────────────────────

function futureExp(ms = 60_000): number {
  return Date.now() + ms
}

const SECRET = 'test-secret-abc123'

// ─── signToken / verifyToken round-trip ──────────────────────────────────────

describe('signToken / verifyToken', () => {
  it('round-trip: sign then verify returns the original payload', () => {
    const payload: TokenPayload = { u: 'alice', role: 'editor', exp: futureExp() }
    const token = signToken(payload, SECRET)
    const result = verifyToken(token, SECRET)
    expect(result).not.toBeNull()
    expect(result!.u).toBe('alice')
    expect(result!.role).toBe('editor')
  })

  it('token is a string with exactly one dot separator', () => {
    const token = signToken({ u: 'bob', role: 'viewer', exp: futureExp() }, SECRET)
    expect(typeof token).toBe('string')
    const parts = token.split('.')
    expect(parts).toHaveLength(2)
    expect(parts[0]!.length).toBeGreaterThan(0)
    expect(parts[1]!.length).toBeGreaterThan(0)
  })

  it('tampered payload (different user) → verifyToken returns null', () => {
    const payload: TokenPayload = { u: 'alice', role: 'editor', exp: futureExp() }
    const token = signToken(payload, SECRET)
    // Tamper the header part by replacing the encoded payload
    const [, sig] = token.split('.')
    const tamperedHeader = Buffer.from(JSON.stringify({ u: 'mallory', role: 'editor', exp: futureExp() })).toString('base64url')
    const tamperedToken = `${tamperedHeader}.${sig}`
    expect(verifyToken(tamperedToken, SECRET)).toBeNull()
  })

  it('tampered signature → verifyToken returns null', () => {
    const payload: TokenPayload = { u: 'alice', role: 'editor', exp: futureExp() }
    const token = signToken(payload, SECRET)
    const [header] = token.split('.')
    const badToken = `${header}.badsignaturexxxxxxxxx`
    expect(verifyToken(badToken, SECRET)).toBeNull()
  })

  it('expired token → verifyToken returns null', () => {
    const payload: TokenPayload = { u: 'alice', role: 'editor', exp: Date.now() - 1000 }
    const token = signToken(payload, SECRET)
    expect(verifyToken(token, SECRET)).toBeNull()
  })

  it('wrong secret → verifyToken returns null', () => {
    const payload: TokenPayload = { u: 'alice', role: 'editor', exp: futureExp() }
    const token = signToken(payload, SECRET)
    expect(verifyToken(token, 'wrong-secret')).toBeNull()
  })

  it('empty string → verifyToken returns null', () => {
    expect(verifyToken('', SECRET)).toBeNull()
  })

  it('garbage string → verifyToken returns null', () => {
    expect(verifyToken('notavalidtoken', SECRET)).toBeNull()
  })

  it('malformed token (no dot) → verifyToken returns null', () => {
    expect(verifyToken('abcdef', SECRET)).toBeNull()
  })
})

// ─── checkLogin ───────────────────────────────────────────────────────────────

describe('checkLogin', () => {
  const users = [
    { u: 'admin', p: 'pass123', role: 'editor' },
    { u: 'viewer1', p: 'viewpass', role: 'viewer' },
  ]

  it('correct credentials → returns { u, role }', () => {
    const result = checkLogin(users, 'admin', 'pass123')
    expect(result).toEqual({ u: 'admin', role: 'editor' })
  })

  it('wrong password → returns null', () => {
    expect(checkLogin(users, 'admin', 'wrongpass')).toBeNull()
  })

  it('unknown user → returns null', () => {
    expect(checkLogin(users, 'nobody', 'pass123')).toBeNull()
  })

  it('viewer correct credentials → returns { u, role: viewer }', () => {
    const result = checkLogin(users, 'viewer1', 'viewpass')
    expect(result).toEqual({ u: 'viewer1', role: 'viewer' })
  })

  it('empty users list → always null', () => {
    expect(checkLogin([], 'admin', 'pass123')).toBeNull()
  })

  it('empty username → null', () => {
    expect(checkLogin(users, '', 'pass123')).toBeNull()
  })
})

// ─── authConfig ───────────────────────────────────────────────────────────────

describe('authConfig', () => {
  const originalSecret = process.env['AUTH_SECRET']
  const originalUsers = process.env['AUTH_USERS']

  afterEach(() => {
    // Restore env after each test
    if (originalSecret === undefined) {
      delete process.env['AUTH_SECRET']
    } else {
      process.env['AUTH_SECRET'] = originalSecret
    }
    if (originalUsers === undefined) {
      delete process.env['AUTH_USERS']
    } else {
      process.env['AUTH_USERS'] = originalUsers
    }
  })

  it('returns disabled when AUTH_SECRET is not set', () => {
    delete process.env['AUTH_SECRET']
    delete process.env['AUTH_USERS']
    const cfg = authConfig()
    expect(cfg.enabled).toBe(false)
  })

  it('returns disabled when AUTH_SECRET is empty string', () => {
    process.env['AUTH_SECRET'] = ''
    process.env['AUTH_USERS'] = JSON.stringify([{ u: 'a', p: 'b', role: 'editor' }])
    const cfg = authConfig()
    expect(cfg.enabled).toBe(false)
  })

  it('returns disabled when AUTH_USERS is not set', () => {
    process.env['AUTH_SECRET'] = 'some-secret'
    delete process.env['AUTH_USERS']
    const cfg = authConfig()
    expect(cfg.enabled).toBe(false)
  })

  it('returns disabled when AUTH_USERS is an empty array', () => {
    process.env['AUTH_SECRET'] = 'some-secret'
    process.env['AUTH_USERS'] = '[]'
    const cfg = authConfig()
    expect(cfg.enabled).toBe(false)
  })

  it('returns disabled when AUTH_USERS is invalid JSON', () => {
    process.env['AUTH_SECRET'] = 'some-secret'
    process.env['AUTH_USERS'] = 'not-valid-json'
    const cfg = authConfig()
    expect(cfg.enabled).toBe(false)
  })

  it('returns enabled with correct values when both env vars are valid', () => {
    const usersJson = JSON.stringify([{ u: 'admin', p: 'pass', role: 'editor' }])
    process.env['AUTH_SECRET'] = 'my-secret'
    process.env['AUTH_USERS'] = usersJson
    const cfg = authConfig()
    expect(cfg.enabled).toBe(true)
    expect(cfg.secret).toBe('my-secret')
    expect(cfg.users).toHaveLength(1)
    expect(cfg.users[0]).toEqual({ u: 'admin', p: 'pass', role: 'editor' })
  })
})
