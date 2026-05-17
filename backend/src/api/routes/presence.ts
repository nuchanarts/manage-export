import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { presence } from '../../services/presence'
import { AppError } from '../../middleware/errorHandler'

const router = Router()

const PingBody = z.object({
  id: z.string().min(1).max(64),
})

/** POST /api/presence/ping — record a heartbeat for the given client id. */
router.post('/ping', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = PingBody.safeParse(req.body)
    if (!result.success) {
      throw new AppError(400, 'INVALID_BODY', 'id must be a non-empty string (max 64 chars)')
    }
    presence.ping(result.data.id)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

/** GET /api/presence/count — return the number of active online users. */
router.get('/count', (_req: Request, res: Response) => {
  res.json({ count: presence.count() })
})

export default router
