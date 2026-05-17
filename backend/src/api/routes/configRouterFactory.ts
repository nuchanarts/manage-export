import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
// @ts-expect-error — no @types/multer; pre-existing pattern from validate.ts
import multer from 'multer'
import ExcelJS from 'exceljs'
import { query } from '../../db'
import { AppError } from '../../middleware/errorHandler'
import {
  CategoryDef,
  CategoryListItem,
  buildListSql, buildStdOptionsSql, buildUpdateSql, buildExistsSql,
  buildStdOptionsSql2, buildUpdateSql2,
  buildStdOptionsSqlExtra, buildUpdateSqlExtra,
} from '../../services/categoryRegistry'
import { mapHeaderRowToFields, normalizeCellValue } from '../../services/excelMappingIO'

// Backward-compatible body schema: at least one of std_code, std_code2, or extra must be present
const bodySchema = z.object({
  std_code:  z.string().max(20).optional(),
  std_code2: z.string().max(20).optional(),
  extra: z.object({
    index: z.number().int().min(0),
    value: z.string().max(50),
  }).optional(),
}).refine(d => d.std_code !== undefined || d.std_code2 !== undefined || d.extra !== undefined, {
  message: 'ต้องระบุ std_code, std_code2 หรือ extra',
})

export interface ConfigRegistryFns {
  get: (key: string) => CategoryDef | undefined
  list: () => CategoryListItem[]
}

// ─── Multer setup for import (shared across all config routes) ────────────────
const uploadImport = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
})

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

  router.get('/:category/std-options-extra/:index', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = String(req.params.category)
      const c = get(category)
      if (!c) throw new AppError(404, 'NOT_FOUND', `ไม่พบหมวด: ${category}`)
      const index = parseInt(String(req.params.index), 10)
      if (isNaN(index) || !c.extraFields || index < 0 || index >= c.extraFields.length) {
        throw new AppError(404, 'NOT_FOUND', `ไม่พบ extraField index ${index} สำหรับหมวด ${category}`)
      }
      const sql = buildStdOptionsSqlExtra(c, index)
      if (sql === null) {
        // free-value: no options table — return empty array gracefully
        res.json([])
        return
      }
      const { rows } = await query(sql)
      res.json(rows)
    } catch (err) { next(err) }
  })

  // ── GET /:category/export — stream the mapping table as .xlsx ───────────────
  // Export is always allowed, including for pending categories (read-only).
  router.get('/:category/export', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = String(req.params.category)
      const c = get(category)
      if (!c) throw new AppError(404, 'NOT_FOUND', `ไม่พบหมวด: ${category}`)

      const { rows } = await query(buildListSql(c))

      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet(category)

      // Build column definitions
      const primaryLabel = c.field1Label ?? 'รหัสมาตรฐาน'
      const colDefs: { header: string; key: string }[] = [
        { header: 'รหัส (HIS)',  key: 'code' },
        { header: 'ชื่อ (HIS)',  key: 'name' },
        { header: primaryLabel,  key: 'std_code' },
      ]
      if (c.mapCol2 && c.field2Label) {
        colDefs.push({ header: c.field2Label, key: 'std_code2' })
      }
      if (c.extraFields) {
        for (let i = 0; i < c.extraFields.length; i++) {
          colDefs.push({ header: c.extraFields[i]!.label, key: `std_code_e${i}` })
        }
      }

      sheet.columns = colDefs.map(d => ({ header: d.header, key: d.key, width: 20 }))

      for (const row of rows) {
        const dataRow: Record<string, unknown> = {
          code:     row.code     ?? '',
          name:     row.name     ?? '',
          std_code: row.std_code ?? '',
        }
        if (c.mapCol2 && c.field2Label) {
          dataRow.std_code2 = row.std_code2 ?? ''
        }
        if (c.extraFields) {
          for (let i = 0; i < c.extraFields.length; i++) {
            dataRow[`std_code_e${i}`] = row[`std_code_e${i}`] ?? ''
          }
        }
        sheet.addRow(dataRow)
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="${category}.xlsx"`)
      await workbook.xlsx.write(res)
      res.end()
    } catch (err) { next(err) }
  })

  // ── POST /:category/import — accept an xlsx and apply mappings ────────────
  router.post('/:category/import', uploadImport.single('file'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = String(req.params.category)
      const c = get(category)
      if (!c) throw new AppError(404, 'NOT_FOUND', `ไม่พบหมวด: ${category}`)
      if (c.pending) throw new AppError(400, 'PENDING_CATEGORY', `หมวด ${category} ยังไม่พร้อมใช้งาน (ยังไม่ได้ยืนยันการจับคู่)`)

      // req.file is added by multer; cast needed because @types/multer is absent
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const file = (req as any).file as { buffer: Buffer } | undefined
      if (!file) throw new AppError(400, 'MISSING_FILE', 'กรุณาแนบไฟล์ .xlsx (field: file)')

      const workbook = new ExcelJS.Workbook()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await workbook.xlsx.load(file.buffer as any)
      const sheet = workbook.worksheets[0]
      if (!sheet) throw new AppError(400, 'EMPTY_FILE', 'ไม่พบ worksheet ในไฟล์')

      // Read header row (row 1)
      const headerRow = sheet.getRow(1)
      const headerCells: (string | null)[] = []
      headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headerCells[colNumber - 1] = normalizeCellValue(cell.value)
      })
      const mappings = mapHeaderRowToFields(headerCells, c)

      const codeMapping = mappings.find(m => m.target.kind === 'code')

      let updated = 0
      let skipped = 0
      const errors: string[] = []
      const MAX_ERRORS = 50

      for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
        const row = sheet.getRow(rowNumber)
        // Extract code
        let code: string | null = null
        if (codeMapping !== undefined) {
          code = normalizeCellValue(row.getCell(codeMapping.colIndex + 1).value)
        }
        if (!code) continue // skip rows with no code

        // Verify code exists in DB
        const exists = await query(buildExistsSql(c), [code])
        if (exists.rowCount === 0) {
          skipped++
          if (errors.length < MAX_ERRORS) {
            errors.push(`ไม่พบรหัส: ${code}`)
          }
          continue
        }

        // Apply each column mapping (except 'code' itself which is read-only)
        for (const m of mappings) {
          if (m.target.kind === 'code') continue
          const rawVal = row.getCell(m.colIndex + 1).value
          const value = normalizeCellValue(rawVal) ?? ''

          try {
            if (m.target.kind === 'std_code') {
              const { sql, params } = buildUpdateSql(c, code, value)
              await query(sql, params)
              updated++
            } else if (m.target.kind === 'std_code2') {
              if (!c.mapCol2) continue // shouldn't happen given header mapping, but guard
              const { sql, params } = buildUpdateSql2(c, code, value)
              await query(sql, params)
              updated++
            } else if (m.target.kind === 'extra') {
              const { index } = m.target
              if (!c.extraFields || index >= c.extraFields.length) continue
              const { sql, params } = buildUpdateSqlExtra(c, index, code, value)
              await query(sql, params)
              updated++
            }
          } catch (err) {
            if (errors.length < MAX_ERRORS) {
              errors.push(`แถว ${rowNumber}, รหัส ${code}: ${err instanceof Error ? err.message : String(err)}`)
            }
          }
        }
      }

      res.json({ updated, skipped, errors })
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

      // extra path: N-field extra column update
      if (parsed.data.extra !== undefined) {
        const { index, value } = parsed.data.extra
        if (!c.extraFields || index < 0 || index >= c.extraFields.length) {
          throw new AppError(400, 'INVALID_EXTRA_INDEX', `ไม่พบ extraField index ${index} สำหรับหมวด ${category}`)
        }
        const exists = await query(buildExistsSql(c), [code])
        if (exists.rowCount === 0) throw new AppError(404, 'NOT_FOUND', `ไม่พบรหัส: ${code}`)
        const { sql, params } = buildUpdateSqlExtra(c, index, code, value)
        await query(sql, params)
        res.json({ ok: true })
        return
      }

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
