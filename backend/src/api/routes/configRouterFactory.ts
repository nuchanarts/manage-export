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
  buildSelectCurrentSql,
  validateStdValue,
} from '../../services/categoryRegistry'
import { mapHeaderRowToFields, normalizeCellValue } from '../../services/excelMappingIO'
import { recordMappingChange, getAudit, getLastChange, resolveAuditField } from '../../services/auditService'
import { autoMatchSuggestions } from '../../services/autoMatch'
import type { AmRow, AmOption } from '../../services/autoMatch'

// Backward-compatible body schema: at least one of std_code, std_code2, or extra must be present
// max(50) accommodates 24-char TMT drug codes and other longer standard codes.
const bodySchema = z.object({
  std_code:  z.string().max(50).optional(),
  std_code2: z.string().max(50).optional(),
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
 * Factory that creates the standard config routes for a given registry.
 *
 *   GET  /                           → list categories
 *   GET  /:category                  → list rows for category
 *   GET  /:category/std-options      → list standard options (primary)
 *   GET  /:category/std-options2     → list standard options (secondary; dual only)
 *   GET  /:category/audit            → recent audit rows for category (F1)
 *   PUT  /:category/:code            → update primary / secondary / extra mapping
 *
 * The optional `registryName` ('basic' | 'eclaim') enables audit logging (F1).
 * Omitting it or passing undefined disables audit for that router instance
 * (backward-compatible for any future test factories that don't set it).
 */
export function makeConfigRouter(
  { get, list }: ConfigRegistryFns,
  registryName?: 'basic' | 'eclaim',
): Router {
  const router = Router()

  router.get('/', (_req: Request, res: Response) => {
    res.json(list())
  })

  // ── POST /_auto-match-all — bulk auto-match across ALL non-pending categories (F5) ──
  // Registered BEFORE /:category to avoid the literal path being swallowed as a param.
  router.post('/_auto-match-all', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = req.header('x-actor') || 'auto-match'
      const reg = registryName ?? 'basic'
      const categories = list()

      let totalMatched = 0
      const results: {
        category: string
        label: string
        matched: number
        unmatched: number
        skippedPending?: boolean
      }[] = []
      const errors: { category: string; error: string }[] = []

      for (const cat of categories) {
        // Skip pending categories entirely — never read or write
        if (cat.pending) {
          results.push({ category: cat.key, label: cat.label, matched: 0, unmatched: 0, skippedPending: true })
          continue
        }

        const c = get(cat.key)
        if (!c) continue  // shouldn't happen; guard anyway

        try {
          // Fetch rows and primary std options
          const { rows: rawRows } = await query(buildListSql(c))
          const { rows: rawOpts } = await query(buildStdOptionsSql(c))

          // Cast to AmRow/AmOption shapes
          const rows: AmRow[] = (rawRows as { code: string; name: string; std_code: string | null; mapped: number | boolean }[])
            .map(r => ({
              code: String(r.code),
              name: String(r.name ?? ''),
              std_code: (r.std_code as string | null) ?? null,
              mapped: !!r.mapped && r.std_code != null && r.std_code !== '',
            }))
          const options: AmOption[] = (rawOpts as { code: string; name: string }[])
            .map(o => ({ code: String(o.code), name: String(o.name ?? '') }))

          const suggestions = autoMatchSuggestions(rows, options)

          let matched = 0
          for (const suggestion of suggestions) {
            try {
              // Read current value for audit (best-effort)
              let oldValue: string | null = null
              try {
                const { sql: selSql } = buildSelectCurrentSql(c, 'std_code')
                const { rows: selRows } = await query(selSql, [suggestion.code])
                oldValue = ((selRows as { current_val: string | null }[])[0]?.current_val) ?? null
              } catch { /* best-effort */ }

              // Skip no-op (old === new)
              const normOld = oldValue === '' ? null : oldValue
              const normNew = suggestion.std_code === '' ? null : suggestion.std_code
              if (normOld === normNew) continue

              // Apply the update
              const { sql: updSql, params: updParams } = buildUpdateSql(c, suggestion.code, suggestion.std_code)
              await query(updSql, updParams)
              matched++
              totalMatched++

              // Best-effort audit
              try {
                await recordMappingChange({
                  registry: reg,
                  category: cat.key,
                  code: suggestion.code,
                  field: 'std_code',
                  oldValue,
                  newValue: suggestion.std_code === '' ? null : suggestion.std_code,
                  actor,
                })
              } catch { /* best-effort */ }

            } catch (suggErr) {
              // Individual suggestion failure → collect and continue
              errors.push({
                category: cat.key,
                error: `รหัส ${suggestion.code}: ${suggErr instanceof Error ? suggErr.message : String(suggErr)}`,
              })
            }
          }

          // Count still-unmapped after applying suggestions
          const appliedCodes = new Set(suggestions.map(s => s.code))
          const unmatched = rows.filter(r => {
            const wasUnmapped = !r.mapped || r.std_code == null || r.std_code === ''
            if (!wasUnmapped) return false
            // If it was suggested, it's now mapped (best-effort count)
            return !appliedCodes.has(r.code)
          }).length

          results.push({ category: cat.key, label: cat.label, matched, unmatched })

        } catch (catErr) {
          // Category-level failure → log + continue; mark in errors
          const errMsg = catErr instanceof Error ? catErr.message : String(catErr)
          console.error(`[auto-match-all] category ${cat.key} failed:`, errMsg)
          errors.push({ category: cat.key, error: errMsg })
          results.push({ category: cat.key, label: cat.label, matched: 0, unmatched: 0 })
        }
      }

      const nonPendingCount = categories.filter(c => !c.pending).length
      res.json({
        totalCategories: nonPendingCount,
        totalMatched,
        results,
        errors,
      })
    } catch (err) { next(err) }
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

  // ── GET /:category/audit — recent audit rows for this category (F1) ─────────
  router.get('/:category/audit', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = String(req.params.category)
      const c = get(category)
      if (!c) throw new AppError(404, 'NOT_FOUND', `ไม่พบหมวด: ${category}`)
      const limitRaw = req.query.limit
      const limit = limitRaw !== undefined ? parseInt(String(limitRaw), 10) : 100
      const reg = registryName ?? 'basic'
      const rows = await getAudit(reg, category, isNaN(limit) ? 100 : limit)
      res.json(rows)
    } catch (err) { next(err) }
  })

  // ── POST /:category/undo — revert the most recent mapping change (F2) ───────
  router.post('/:category/undo', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = String(req.params.category)
      const c = get(category)
      if (!c) throw new AppError(404, 'NOT_FOUND', `ไม่พบหมวด: ${category}`)
      // Pending guard: undo is a write operation; pending categories cannot be edited
      if (c.pending) throw new AppError(400, 'PENDING_CATEGORY', `หมวด ${category} ยังไม่พร้อมใช้งาน (ยังไม่ได้ยืนยันการจับคู่)`)

      const reg = registryName ?? 'basic'
      const last = await getLastChange(reg, category)
      if (!last) {
        throw new AppError(400, 'NO_HISTORY', 'ไม่มีประวัติให้ย้อน')
      }

      // Verify the code still exists in the master table
      const existsResult = await query(buildExistsSql(c), [last.code])
      if (existsResult.rowCount === 0) {
        throw new AppError(400, 'CODE_GONE', `รหัส ${last.code} ไม่พบในตาราง (อาจถูกลบแล้ว)`)
      }

      // Determine the revert value: old_value of the last change
      const revertTo = last.old_value  // null or string

      // Select the correct SQL builder based on which field was last changed
      const resolution = resolveAuditField(last.field)
      let updateSql: string
      let updateParams: (string | null)[]

      if (resolution.kind === 'primary') {
        const built = buildUpdateSql(c, last.code, revertTo ?? '')
        updateSql = built.sql
        updateParams = built.params
      } else if (resolution.kind === 'secondary') {
        if (!c.mapCol2) throw new AppError(400, 'INVALID_FIELD', `หมวด ${category} ไม่มี std_code2`)
        const built = buildUpdateSql2(c, last.code, revertTo ?? '')
        updateSql = built.sql
        updateParams = built.params
      } else {
        // extra field
        const idx = resolution.index!
        if (!c.extraFields || idx < 0 || idx >= c.extraFields.length) {
          throw new AppError(400, 'INVALID_FIELD', `หมวด ${category} ไม่มี extraField index ${idx}`)
        }
        const built = buildUpdateSqlExtra(c, idx, last.code, revertTo ?? '')
        updateSql = built.sql
        updateParams = built.params
      }

      // Apply the revert
      await query(updateSql, updateParams)

      // Record the undo itself as an audit row (enables walk-back / redo).
      // Best-effort: never break the revert if audit insert fails.
      const actor = req.header('x-actor') || 'undo'
      await recordMappingChange({
        registry: reg,
        category,
        code: last.code,
        field: last.field,
        oldValue: last.new_value,    // what it was before this undo
        newValue: last.old_value,    // what it is now (the reverted value)
        actor,
      })

      res.json({
        ok: true,
        reverted: {
          code: last.code,
          field: last.field,
          from: last.new_value,   // the value that was undone
          to: last.old_value,     // the value restored
        },
      })
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

      const actor = req.header('x-actor') || 'import'
      const reg = registryName ?? 'basic'

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
              // F6: validate primary std_code value (empty = clear = always allowed)
              const vr = validateStdValue(c.stdRule, value)
              if (!vr.ok) {
                skipped++
                if (errors.length < MAX_ERRORS) {
                  errors.push(`แถว ${rowNumber}, รหัส ${code}: ${vr.message}`)
                }
                continue
              }
              // Read current value for audit
              let oldValue: string | null = null
              if (registryName) {
                try {
                  const { sql: selSql } = buildSelectCurrentSql(c, 'std_code')
                  const { rows: selRows } = await query(selSql, [code])
                  oldValue = (selRows[0]?.current_val as string | null | undefined) ?? null
                } catch { /* best-effort */ }
              }
              const { sql, params } = buildUpdateSql(c, code, value)
              await query(sql, params)
              updated++
              if (registryName) {
                await recordMappingChange({
                  registry: reg, category, code, field: 'std_code',
                  oldValue, newValue: value === '' ? null : value, actor,
                })
              }
            } else if (m.target.kind === 'std_code2') {
              if (!c.mapCol2) continue // shouldn't happen given header mapping, but guard
              let oldValue: string | null = null
              if (registryName) {
                try {
                  const { sql: selSql } = buildSelectCurrentSql(c, 'std_code2')
                  const { rows: selRows } = await query(selSql, [code])
                  oldValue = (selRows[0]?.current_val as string | null | undefined) ?? null
                } catch { /* best-effort */ }
              }
              const { sql, params } = buildUpdateSql2(c, code, value)
              await query(sql, params)
              updated++
              if (registryName) {
                await recordMappingChange({
                  registry: reg, category, code, field: 'std_code2',
                  oldValue, newValue: value === '' ? null : value, actor,
                })
              }
            } else if (m.target.kind === 'extra') {
              const { index } = m.target
              if (!c.extraFields || index >= c.extraFields.length) continue
              // F6: validate extra field value (empty = clear = always allowed)
              const extraRule = c.extraFields[index]?.rule
              const evr = validateStdValue(extraRule, value)
              if (!evr.ok) {
                skipped++
                if (errors.length < MAX_ERRORS) {
                  errors.push(`แถว ${rowNumber}, รหัส ${code}: ${evr.message}`)
                }
                continue
              }
              const fieldKey = `std_code_e${index}` as `std_code_e${number}`
              let oldValue: string | null = null
              if (registryName) {
                try {
                  const { sql: selSql } = buildSelectCurrentSql(c, fieldKey)
                  const { rows: selRows } = await query(selSql, [code])
                  oldValue = (selRows[0]?.current_val as string | null | undefined) ?? null
                } catch { /* best-effort */ }
              }
              const { sql, params } = buildUpdateSqlExtra(c, index, code, value)
              await query(sql, params)
              updated++
              if (registryName) {
                await recordMappingChange({
                  registry: reg, category, code, field: fieldKey,
                  oldValue, newValue: value === '' ? null : value, actor,
                })
              }
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
      const actor = req.header('x-actor') || 'unknown'
      const reg = registryName ?? 'basic'

      // extra path: N-field extra column update
      if (parsed.data.extra !== undefined) {
        const { index, value } = parsed.data.extra
        if (!c.extraFields || index < 0 || index >= c.extraFields.length) {
          throw new AppError(400, 'INVALID_EXTRA_INDEX', `ไม่พบ extraField index ${index} สำหรับหมวด ${category}`)
        }
        // F6: validate extra field value against its rule (if any)
        const extraRule = c.extraFields[index]?.rule
        const extraValidation = validateStdValue(extraRule, value)
        if (!extraValidation.ok) {
          throw new AppError(400, 'INVALID_CODE', extraValidation.message!)
        }
        const exists = await query(buildExistsSql(c), [code])
        if (exists.rowCount === 0) throw new AppError(404, 'NOT_FOUND', `ไม่พบรหัส: ${code}`)

        // Read current value for audit
        let oldValue: string | null = null
        if (registryName) {
          const fieldKey = `std_code_e${index}` as `std_code_e${number}`
          try {
            const { sql: selSql } = buildSelectCurrentSql(c, fieldKey)
            const { rows: selRows } = await query(selSql, [code])
            oldValue = (selRows[0]?.current_val as string | null | undefined) ?? null
          } catch { /* best-effort */ }
        }

        const { sql, params } = buildUpdateSqlExtra(c, index, code, value)
        await query(sql, params)

        if (registryName) {
          await recordMappingChange({
            registry: reg, category, code,
            field: `std_code_e${index}`,
            oldValue, newValue: value === '' ? null : value, actor,
          })
        }

        res.json({ ok: true })
        return
      }

      // std_code2 path: secondary field update
      if (parsed.data.std_code2 !== undefined) {
        if (!c.mapCol2) throw new AppError(400, 'NOT_DUAL', `หมวด ${category} ไม่รองรับ std_code2`)
        const exists = await query(buildExistsSql(c), [code])
        if (exists.rowCount === 0) throw new AppError(404, 'NOT_FOUND', `ไม่พบรหัส: ${code}`)

        let oldValue: string | null = null
        if (registryName) {
          try {
            const { sql: selSql } = buildSelectCurrentSql(c, 'std_code2')
            const { rows: selRows } = await query(selSql, [code])
            oldValue = (selRows[0]?.current_val as string | null | undefined) ?? null
          } catch { /* best-effort */ }
        }

        const { sql, params } = buildUpdateSql2(c, code, parsed.data.std_code2)
        await query(sql, params)

        if (registryName) {
          await recordMappingChange({
            registry: reg, category, code, field: 'std_code2',
            oldValue, newValue: parsed.data.std_code2 === '' ? null : parsed.data.std_code2, actor,
          })
        }

        res.json({ ok: true })
        return
      }

      // std_code path: primary field update (existing behaviour)
      // F6: validate primary std_code value against stdRule (if any)
      const primaryValidation = validateStdValue(c.stdRule, parsed.data.std_code!)
      if (!primaryValidation.ok) {
        throw new AppError(400, 'INVALID_CODE', primaryValidation.message!)
      }
      const exists = await query(buildExistsSql(c), [code])
      if (exists.rowCount === 0) throw new AppError(404, 'NOT_FOUND', `ไม่พบรหัส: ${code}`)

      let oldValue: string | null = null
      if (registryName) {
        try {
          const { sql: selSql } = buildSelectCurrentSql(c, 'std_code')
          const { rows: selRows } = await query(selSql, [code])
          oldValue = (selRows[0]?.current_val as string | null | undefined) ?? null
        } catch { /* best-effort */ }
      }

      const { sql, params } = buildUpdateSql(c, code, parsed.data.std_code!)
      await query(sql, params)

      if (registryName) {
        await recordMappingChange({
          registry: reg, category, code, field: 'std_code',
          oldValue, newValue: parsed.data.std_code === '' ? null : parsed.data.std_code!, actor,
        })
      }

      res.json({ ok: true })
    } catch (err) { next(err) }
  })

  return router
}
