/**
 * F9 — Auth routes mounted at /auth.
 *
 *   GET  /auth/status  → { enabled: boolean }
 *   POST /auth/login   → { token, u, role }  or errors
 */

import { Router, Request, Response, NextFunction } from 'express'
import { authConfig, checkLogin, signToken } from '../../services/auth'
import { AppError } from '../../middleware/errorHandler'

const router = Router()

/** GET /auth/status — let the frontend know if auth is required. */
router.get('/status', (_req: Request, res: Response) => {
  const { enabled } = authConfig()
  res.json({ enabled })
})

/** POST /auth/login — issue a signed token. */
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  try {
    const cfg = authConfig()

    if (!cfg.enabled) {
      throw new AppError(400, 'AUTH_DISABLED', 'Auth is not configured on this server')
    }

    const body = req.body as { u?: unknown; p?: unknown }
    const u = typeof body.u === 'string' ? body.u.trim() : ''
    const p = typeof body.p === 'string' ? body.p : ''

    if (!u || !p) {
      throw new AppError(400, 'INVALID_BODY', 'กรุณาระบุ u (username) และ p (password)')
    }

    const result = checkLogin(cfg.users, u, p)
    if (!result) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
    }

    // Token expires in 12 hours
    const exp = Date.now() + 12 * 60 * 60 * 1000
    const token = signToken({ u: result.u, role: result.role, exp }, cfg.secret)

    res.json({ token, u: result.u, role: result.role })
  } catch (err) { next(err) }
})

export default router
