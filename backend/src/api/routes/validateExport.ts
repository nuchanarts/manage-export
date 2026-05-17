import { Router, Request, Response, NextFunction } from 'express'
import ExcelJS from 'exceljs'
import { z } from 'zod'
import { buildErrorExportRows } from '../../services/validateExport'

const router = Router()

const ReportBodySchema = z.object({
  files: z.array(z.any()),
})

// POST /api/validate-export/errors
// Accepts the full validation report JSON, returns an .xlsx with per-file error summary.
router.post('/errors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ReportBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง: ต้องการ object ที่มี files array' })
      return
    }

    const { summaryRows, detailRows, truncated } = buildErrorExportRows(parsed.data)

    const workbook = new ExcelJS.Workbook()

    // ── Sheet 1: สรุปรายแฟ้ม ──────────────────────────────────────────────
    const summarySheet = workbook.addWorksheet('สรุปรายแฟ้ม')
    summarySheet.columns = [
      { header: 'FileName',        key: 'fileName',       width: 20 },
      { header: 'ลักษณะแฟ้ม',      key: 'fileType',       width: 22 },
      { header: 'Record',           key: 'totalRows',      width: 10 },
      { header: 'ผ่าน',             key: 'passPersons',    width: 10 },
      { header: 'ไม่ผ่าน',          key: 'failPersons',    width: 10 },
      { header: 'ร้อยละ',           key: 'passPercent',    width: 10 },
      { header: 'คอลัมน์ขาด',       key: 'missingColumns', width: 30 },
      { header: 'ปัญหาหลัก',        key: 'mainProblems',   width: 40 },
    ]

    // Style header row
    const sumHeaderRow = summarySheet.getRow(1)
    sumHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sumHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
    sumHeaderRow.commit()

    for (const row of summaryRows) {
      summarySheet.addRow(row)
    }

    // ── Sheet 2: รายละเอียด Error ─────────────────────────────────────────
    const detailSheet = workbook.addWorksheet('รายละเอียด Error')
    detailSheet.columns = [
      { header: 'FileName',     key: 'fileName',  width: 20 },
      { header: 'แถว/row',      key: 'row',       width: 10 },
      { header: 'PID',          key: 'pid',        width: 16 },
      { header: 'CID',          key: 'cid',        width: 16 },
      { header: 'ฟิลด์/field',  key: 'field',     width: 18 },
      { header: 'ประเภท/error', key: 'errorType', width: 22 },
      { header: 'ข้อความ',      key: 'message',   width: 40 },
    ]

    const detHeaderRow = detailSheet.getRow(1)
    detHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    detHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } }
    detHeaderRow.commit()

    for (const row of detailRows) {
      detailSheet.addRow(row)
    }

    if (truncated) {
      detailSheet.addRow({
        fileName: '*** ข้อมูลถูกตัดที่ 50,000 แถว ***',
        row: '',
        pid: '',
        cid: '',
        field: '',
        errorType: '',
        message: '',
      })
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="validation_errors.xlsx"')

    await workbook.xlsx.write(res)
    res.end()
  } catch (err) {
    next(err)
  }
})

export default router
