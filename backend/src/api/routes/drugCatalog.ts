import { Router, Request, Response, NextFunction } from 'express'
import ExcelJS from 'exceljs'
import { query } from '../../db'
import { DRUG_CATALOG_SQL, DRUG_CATALOG_COLUMNS } from '../../services/drugCatalog'
import { AppError } from '../../middleware/errorHandler'

const router = Router()

// GET /api/drug-catalog — run the fixed SQL and return all rows as JSON
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(DRUG_CATALOG_SQL)
    res.json(rows)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    next(new AppError(500, 'DB_ERROR', message))
  }
})

// GET /api/drug-catalog/export — run the fixed SQL and stream as .xlsx
router.get('/export', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(DRUG_CATALOG_SQL)

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Drug Catalog')

    // Header row
    sheet.addRow(DRUG_CATALOG_COLUMNS.map(c => c.header))
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }

    // Set column widths
    sheet.columns = DRUG_CATALOG_COLUMNS.map(() => ({ width: 18 }))

    // Data rows
    rows.forEach((row, i) => {
      const values = DRUG_CATALOG_COLUMNS.map(c => {
        const v = (row as Record<string, unknown>)[c.key]
        return v == null ? '' : v
      })
      const dataRow = sheet.addRow(values)
      if (i % 2 === 1) {
        dataRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } }
      }
    })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="drug_catalog.xlsx"')
    await workbook.xlsx.write(res)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    next(new AppError(500, 'DB_ERROR', message))
  }
})

export default router
