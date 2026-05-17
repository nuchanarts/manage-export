import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { query } from '../../db'
import { AppError } from '../../middleware/errorHandler'
import {
  CategoryDef,
  CategoryListItem,
  buildListSql, buildStdOptionsSql, buildUpdateSql, buildExistsSql,
  buildStdOptionsSql2, buildUpdateSql2,
} from '../../services/categoryRegistry'

// Backward-compatible body schema: at least one of std_code or std_code2 must be present
const bodySchema = z.object({
  std_code:  z.string().max(20).optional(),
  std_code2: z.string().max(20).optional(),
}).refine(d => d.std_code !== undefined || d.std_code2 !== undefined, {
  message: 'ต้องระบุ std_code หรือ std_code2',
})

export interface ConfigRegistryFns {
  get: (key: string) => CategoryDef | undefined
  list: () => CategoryListItem[]
}

/**
 * Factory that creates the five standard config routes:
 *   GET  /                        → list categories
 *   GET  /:category               → list rows for category
 *   GET  /:category/std-options   → list standard options (primary)
 *   GET  /:category/std-options2  → list standard options (secondary; dual only)
 *   PUT  /:category/:code         → update primary (std_code) or secondary (std_code2) mapping
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

  router.get('/:category/std-options2', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = String(req.params.category)
      const c = get(category)
      if (!c) throw new AppError(404, 'NOT_FOUND', `ไม่พบหมวด: ${category}`)
      if (!c.mapCol2) throw new AppError(404, 'NOT_DUAL', `หมวด ${category} ไม่มีการจับคู่รองสอง`)
      const { rows } = await query(buildStdOptionsSql2(c))
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
      if (!parsed.success) throw new AppError(400, 'INVALID_BODY', 'ต้องระบุ std_code หรือ std_code2')
      const code = String(req.params.code)

      // std_code2 path: secondary field update
      if (parsed.data.std_code2 !== undefined) {
        if (!c.mapCol2) throw new AppError(400, 'NOT_DUAL', `หมวด ${category} ไม่รองรับ std_code2`)
        const exists = await query(buildExistsSql(c), [code])
        if (exists.rowCount === 0) throw new AppError(404, 'NOT_FOUND', `ไม่พบรหัส: ${code}`)
        const { sql, params } = buildUpdateSql2(c, code, parsed.data.std_code2)
        await query(sql, params)
        res.json({ ok: true })
        return
      }

      // std_code path: primary field update (existing behaviour)
      const exists = await query(buildExistsSql(c), [code])
      if (exists.rowCount === 0) throw new AppError(404, 'NOT_FOUND', `ไม่พบรหัส: ${code}`)
      const { sql, params } = buildUpdateSql(c, code, parsed.data.std_code!)
      await query(sql, params)
      res.json({ ok: true })
    } catch (err) { next(err) }
  })

  return router
}
