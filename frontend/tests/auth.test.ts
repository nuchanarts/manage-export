// frontend/tests/auth.test.ts
// TDD: pure storage helpers for auth (no browser globals needed).

import {
  getAuth,
  setAuth,
  clearAuth,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  AUTH_ROLE_KEY,
} from '../src/data/auth'

// ─── Mock storage (mirrors clientId.test.ts pattern) ─────────────────────────

function makeStorage(
  initial: Record<string, string> = {},
): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const store: Record<string, string> = { ...initial }
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
  }
}

// ─── Mock axios so setting headers doesn't blow up ───────────────────────────
// jest.mock is hoisted before variable declarations, so we must define the
// defaults object inside the factory with no external references.
// The module mock must expose both a default export and the defaults property
// to satisfy `import axios from 'axios'` (esModuleInterop default import).

jest.mock('axios', () => {
  const mockModule = {
    defaults: {
      headers: {
        common: {} as Record<string, string | undefined>,
      },
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(mockModule as any).__esModule = true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(mockModule as any).default = mockModule
  return mockModule
})

// ─── getAuth ─────────────────────────────────────────────────────────────────

describe('getAuth', () => {
  it('returns null when storage is empty', () => {
    const storage = makeStorage()
    expect(getAuth(storage)).toBeNull()
  })

  it('returns null when token is missing', () => {
    const storage = makeStorage({ [AUTH_USER_KEY]: 'alice', [AUTH_ROLE_KEY]: 'editor' })
    expect(getAuth(storage)).toBeNull()
  })

  it('returns null when user is missing', () => {
    const storage = makeStorage({ [AUTH_TOKEN_KEY]: 'tok', [AUTH_ROLE_KEY]: 'editor' })
    expect(getAuth(storage)).toBeNull()
  })

  it('returns null when role is missing', () => {
    const storage = makeStorage({ [AUTH_TOKEN_KEY]: 'tok', [AUTH_USER_KEY]: 'alice' })
    expect(getAuth(storage)).toBeNull()
  })

  it('returns AuthState when all keys are present', () => {
    const storage = makeStorage({
      [AUTH_TOKEN_KEY]: 'mytoken',
      [AUTH_USER_KEY]: 'alice',
      [AUTH_ROLE_KEY]: 'editor',
    })
    expect(getAuth(storage)).toEqual({ token: 'mytoken', u: 'alice', role: 'editor' })
  })
})

// ─── setAuth ─────────────────────────────────────────────────────────────────

describe('setAuth', () => {
  it('persists all three keys to storage', () => {
    const storage = makeStorage()
    setAuth({ token: 'tok123', u: 'bob', role: 'viewer' }, storage)
    expect(storage.getItem(AUTH_TOKEN_KEY)).toBe('tok123')
    expect(storage.getItem(AUTH_USER_KEY)).toBe('bob')
    expect(storage.getItem(AUTH_ROLE_KEY)).toBe('viewer')
  })

  it('subsequent getAuth returns the same state', () => {
    const storage = makeStorage()
    const state = { token: 'tok123', u: 'carol', role: 'editor' }
    setAuth(state, storage)
    expect(getAuth(storage)).toEqual(state)
  })

  it('overwrites existing stored auth', () => {
    const storage = makeStorage({
      [AUTH_TOKEN_KEY]: 'oldtok',
      [AUTH_USER_KEY]: 'olduser',
      [AUTH_ROLE_KEY]: 'editor',
    })
    setAuth({ token: 'newtok', u: 'newuser', role: 'viewer' }, storage)
    expect(getAuth(storage)).toEqual({ token: 'newtok', u: 'newuser', role: 'viewer' })
  })
})

// ─── clearAuth ───────────────────────────────────────────────────────────────

describe('clearAuth', () => {
  it('removes all three keys from storage', () => {
    const storage = makeStorage({
      [AUTH_TOKEN_KEY]: 'tok',
      [AUTH_USER_KEY]: 'alice',
      [AUTH_ROLE_KEY]: 'editor',
    })
    clearAuth(storage)
    expect(getAuth(storage)).toBeNull()
    expect(storage.getItem(AUTH_TOKEN_KEY)).toBeNull()
    expect(storage.getItem(AUTH_USER_KEY)).toBeNull()
    expect(storage.getItem(AUTH_ROLE_KEY)).toBeNull()
  })

  it('is idempotent on empty storage', () => {
    const storage = makeStorage()
    expect(() => clearAuth(storage)).not.toThrow()
    expect(getAuth(storage)).toBeNull()
  })
})
