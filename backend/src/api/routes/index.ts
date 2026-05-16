import { Router, Request, Response } from 'express'
import recordsRouter from './records'
import validateRouter from './validate'

const router = Router()

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

router.use('/records', recordsRouter)
router.use('/validate', validateRouter)

export default router
