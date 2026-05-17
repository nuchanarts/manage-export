/**
 * F9 — Lightweight opt-in auth service (pure, no side effects).
 *
 * Auth is DISABLED when AUTH_SECRET is not set or AUTH_USERS is empty/unset.
 * When disabled every function behaves as a no-op / open-pass so existing tests
 * and no-auth deployments keep working with zero changes.
 *
 * Token format: base64url(json) + '.' + hmac-sha256-hex(base64url(json), secret)
 * No new npm deps — uses Node built-in `crypto`.
 */

import { createHmac, timingSafeEqual } from 'crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenPayload {
  u: string
  role: string
  exp: number
}

export interface UserEntry {
  u: string
  p: string
  role: string
}

export interface AuthConfig {
  enabled: boolean
  secret: string
  users: UserEntry[]
}

// ─── Token helpers ────────────────────────────────────────────────────────────

function toBase64Url(s: string): string {
  return Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function hmacHex(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex')
}

/**
 * Sign a payload and return a token string.
 * Format: `<base64url(json)>.<hmac-sha256-hex>`
 */
export function signToken(payload: TokenPayload, secret: string): string {
  const header = toBase64Url(JSON.stringify(payload))
  const sig = hmacHex(header, secret)
  return `${header}.${sig}`
}

/**
 * Verify a token string.
 * Returns the parsed payload when valid and not expired, null otherwise.
 * Uses a timing-safe comparison to resist timing attacks.
 */
export function verifyToken(token: string, secret: string): TokenPayload | null {
  try {
    const dot = token.indexOf('.')
    if (dot < 1) return null

    const header = token.slice(0, dot)
    const sigProvided = token.slice(dot + 1)

    const sigExpected = hmacHex(header, secret)

    // Constant-time comparison — pad to equal length if needed
    const a = Buffer.from(sigExpected, 'utf8')
    const b = Buffer.from(sigProvided.padEnd(sigExpected.length, ' '), 'utf8')
    if (a.length !== b.length) return null
    if (!timingSafeEqual(a, b)) return null

    const json = Buffer.from(header, 'base64').toString('utf8')
    const payload = JSON.parse(json) as TokenPayload

    if (typeof payload.u !== 'string' || typeof payload.role !== 'string' || typeof payload.exp !== 'number') {
      return null
    }

    if (Date.now() > payload.exp) return null

    return payload
  } catch {
    return null
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

/**
 * Read auth configuration from environment variables.
 * enabled = true only when both AUTH_SECRET is a non-empty string AND
 * AUTH_USERS parses to a non-empty array.
 * Never throws — returns { enabled:false } on any parse error.
 */
export function authConfig(): AuthConfig {
  const secret = process.env['AUTH_SECRET'] ?? ''
  const rawUsers = process.env['AUTH_USERS'] ?? ''

  if (!secret || !rawUsers) {
    return { enabled: false, secret: '', users: [] }
  }

  try {
    const users = JSON.parse(rawUsers) as UserEntry[]
    if (!Array.isArray(users) || users.length === 0) {
      return { enabled: false, secret: '', users: [] }
    }
    return { enabled: true, secret, users }
  } catch {
    return { enabled: false, secret: '', users: [] }
  }
}

// ─── Login check ──────────────────────────────────────────────────────────────

/**
 * Check credentials against the users list.
 * Returns { u, role } on success, null on failure.
 * Plain-text password comparison (LAN-grade; sufficient for this tool).
 */
export function checkLogin(users: UserEntry[], u: string, p: string): { u: string; role: string } | null {
  const found = users.find(entry => entry.u === u && entry.p === p)
  if (!found) return null
  return { u: found.u, role: found.role }
}
