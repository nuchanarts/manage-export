import { Router, Request, Response, NextFunction } from 'express'
import { searchSchema } from '../validators/searchValidator'
import * as recordService from '../../services/recordService'
import { streamExcel } from '../../services/excelService'
import { AppError } from '../../middleware/errorHandler'

const router = Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = searchSchema.safeParse(req.query)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      throw new AppError(400, 'VALIDATION_ERROR', issue.message, issue.path[0] as string)
    }

    const filter = { ...parsed.data }
    const result = await recordService.search(filter)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.get('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = searchSchema.safeParse(req.query)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      throw new AppError(400, 'VALIDATION_ERROR', issue.message, issue.path[0] as string)
    }

    const filter = { ...parsed.data, page: 1, pageSize: 999999 }
    const records = await recordService.exportAll(filter)

    if (records.length === 0) {
      throw new AppError(404, 'NO_DATA', 'ไม่มีข้อมูลสำหรับ Export')
    }

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    await streamExcel(records, res, `bgs-check-export-${date}.xlsx`)
  } catch (err) {
    next(err)
  }
})

router.get('/:pid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await recordService.getByPid(req.params['pid']!)
    if (!record) {
      throw new AppError(404, 'NOT_FOUND', 'ไม่พบข้อมูลที่ระบุ')
    }
    res.json(record)
  } catch (err) {
    next(err)
  }
})

export default router
