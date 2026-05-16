import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { query } from '../../db'
import { AppError } from '../../middleware/errorHandler'
import {
  getCategory, listCategories,
  buildListSql, buildStdOptionsSql, buildUpdateSql,
} from '../../services/categoryRegistry'

const router = Router()
const bodySchema = z.object({ std_code: z.string().max(20) })

router.get('/', (_req: Request, res: Response) => {
  res.json(listCategories())
})

router.get('/:category', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const c = getCategory(req.params.category)
    if (!c) throw new AppError(404, 'NOT_FOUND', `ไม่พบหมวด: ${req.params.category}`)
    const { rows } = await query(buildListSql(c))
    res.json(rows.map(r => ({ ...r, mapped: !!r.mapped && r.std_code != null && r.std_code !== '' })))
  } catch (err) { next(err) }
})

router.get('/:category/std-options', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const c = getCategory(req.params.category)
    if (!c) throw new AppError(404, 'NOT_FOUND', `ไม่พบหมวด: ${req.params.category}`)
    const { rows } = await query(buildStdOptionsSql(c))
    res.json(rows)
  } catch (err) { next(err) }
})

router.put('/:category/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const c = getCategory(req.params.category)
    if (!c) throw new AppError(404, 'NOT_FOUND', `ไม่พบหมวด: ${req.params.category}`)
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) throw new AppError(400, 'INVALID_BODY', 'ต้องระบุ std_code')
    const code = req.params.code

    const exists = await query(
      `SELECT 1 FROM \`${c.table}\` WHERE \`${c.pk}\` = ? LIMIT 1`, [code])
    if (exists.rowCount === 0) throw new AppError(404, 'NOT_FOUND', `ไม่พบรหัส: ${code}`)

    const { sql, params } = buildUpdateSql(c, code, parsed.data.std_code)
    await query(sql, params)
    console.log(`[basic-config] ${c.key} ${code} -> ${parsed.data.std_code || 'NULL'}`)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
