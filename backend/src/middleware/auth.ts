/**
 * F9 — requireEditor middleware.
 *
 * When AUTH is DISABLED (no AUTH_SECRET / AUTH_USERS env): next() immediately.
 * When AUTH is ENABLED:
 *   - Reads `Authorization: Bearer <token>` or `x-auth-token` header.
 *   - Verifies token with the configured secret.
 *   - role === 'editor' → sets req.authUser and calls next().
 *   - role === 'viewer' → 403 FORBIDDEN.
 *   - missing / invalid token → 401 UNAUTHORIZED.
 */

import { Request, Response, NextFunction } from 'express'
import { authConfig, verifyToken } from '../services/auth'
import { AppError } from './errorHandler'

// Augment Express Request to carry the authenticated username when present.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: string
    }
  }
}

export function requireEditor(req: Request, _res: Response, next: NextFunction): void {
  const cfg = authConfig()

  if (!cfg.enabled) {
    // Auth disabled — open pass, no token needed.
    next()
    return
  }

  // Extract token from Authorization header or x-auth-token header.
  let token: string | undefined
  const authHeader = req.header('Authorization') ?? req.header('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  } else {
    const alt = req.header('x-auth-token')
    if (alt) token = alt
  }

  if (!token) {
    throw new AppError(401, 'UNAUTHORIZED', 'กรุณาเข้าสู่ระบบก่อนดำเนินการ')
  }

  const payload = verifyToken(token, cfg.secret)
  if (!payload) {
    throw new AppError(401, 'UNAUTHORIZED', 'Token ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่')
  }

  if (payload.role !== 'editor') {
    throw new AppError(403, 'FORBIDDEN', 'สิทธิ์ไม่เพียงพอ ต้องการสิทธิ์ editor')
  }

  req.authUser = payload.u
  next()
}
