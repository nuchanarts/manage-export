import { Router, Request, Response } from 'express'
import recordsRouter from './records'
import validateRouter from './validate'
import basicConfigRouter from './basicConfig'
import eclaimConfigRouter from './eclaimConfig'
import presenceRouter from './presence'

const router = Router()

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

router.use('/records', recordsRouter)
router.use('/validate', validateRouter)
router.use('/basic-config', basicConfigRouter)
router.use('/eclaim-config', eclaimConfigRouter)
router.use('/presence', presenceRouter)

export default router
