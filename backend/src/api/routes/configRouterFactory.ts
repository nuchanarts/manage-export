import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { query } from '../../db'
import { AppError } from '../../middleware/errorHandler'
import {
  CategoryDef,
  buildListSql, buildStdOptionsSql, buildUpdateSql, buildExistsSql,
} from '../../services/categoryRegistry'

const bodySchema = z.object({ std_code: z.string().max(20) })

export interface ConfigRegistryFns {
  get: (key: string) => CategoryDef | undefined
  list: () => Pick<CategoryDef, 'key' | 'label' | 'pending'>[]
}

/**
 * Factory that creates the four standard config routes:
 *   GET  /                       → list categories
 *   GET  /:category              → list rows for category
 *   GET  /:category/std-options  → list standard options
 *   PUT  /:category/:code        → update mapping
 *
 * Both basic-config and eclaim-config use this factory; behaviour is identical.
 */
export function makeConfigRouter({ get, list }: ConfigRegistryFns): Router {
  const router = Router()

  router.get('/', (_req: Request, res: Response) => {
    res.json(list())
  })

  router.get('/:category', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = String(req.params.category)
      const c = get(category)
      if (!c) throw new AppError(404, 'NOT_FOUND', `ไม่พบหมวด: ${category}`)
      const { rows } = await query(buildListSql(c))
      res.json(rows.map(r => ({ ...r, mapped: !!r.mapped && r.std_code != null && r.std_code !== '' })))
    } catch (err) { next(err) }
  })

  router.get('/:category/std-options', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = String(req.params.category)
      const c = get(category)
      if (!c) throw new AppError(404, 'NOT_FOUND', `ไม่พบหมวด: ${category}`)
      const { rows } = await query(buildStdOptionsSql(c))
      res.json(rows)
    } catch (err) { next(err) }
  })

  router.put('/:category/:code', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = String(req.params.category)
      const c = get(category)
      if (!c) throw new AppError(404, 'NOT_FOUND', `ไม่พบหมวด: ${category}`)
      if (c.pending) throw new AppError(400, 'PENDING_CATEGORY', `หมวด ${category} ยังไม่พร้อมใช้งาน (ยังไม่ได้ยืนยันการจับคู่)`)
      const parsed = bodySchema.safeParse(req.body)
      if (!parsed.success) throw new AppError(400, 'INVALID_BODY', 'ต้องระบุ std_code')
      const code = String(req.params.code)

      const exists = await query(buildExistsSql(c), [code])
      if (exists.rowCount === 0) throw new AppError(404, 'NOT_FOUND', `ไม่พบรหัส: ${code}`)

      const { sql, params } = buildUpdateSql(c, code, parsed.data.std_code)
      await query(sql, params)
      res.json({ ok: true })
    } catch (err) { next(err) }
  })

  return router
}
