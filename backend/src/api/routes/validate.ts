import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import ExcelJS from 'exceljs'
import { validateEntries, extractZip, extractRar, FileEntry, PersonError } from '../../services/validationService'
import { AppError } from '../../middleware/errorHandler'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
})

// Detect file type by extension
function getFileExt(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

// POST /api/validate — accepts:
//   field "file"  : single .zip or .rar
//   field "files" : multiple .txt files (from folder selection)
router.post('/', upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'files', maxCount: 200 },
]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as { [f: string]: Express.Multer.File[] } | undefined
    let entries: FileEntry[] = []

    const singleFile = files?.['file']?.[0]
    const multiFiles = files?.['files']

    if (singleFile) {
      const ext = getFileExt(singleFile.originalname)
      if (ext === 'zip') {
        entries = extractZip(singleFile.buffer)
      } else if (ext === 'rar') {
        entries = await extractRar(singleFile.buffer)
      } else {
        throw new AppError(400, 'INVALID_FILE', 'รองรับเฉพาะไฟล์ .zip และ .rar')
      }
    } else if (multiFiles && multiFiles.length > 0) {
      // Folder upload — filter .txt only
      entries = multiFiles
        .filter(f => getFileExt(f.originalname) === 'txt')
        .map(f => ({ name: f.originalname.split(/[\\/]/).pop() ?? f.originalname, data: f.buffer }))
    } else {
      throw new AppError(400, 'MISSING_FILE', 'กรุณาเลือกไฟล์ .zip, .rar หรือโฟลเดอร์')
    }

    if (entries.length === 0) {
      throw new AppError(400, 'NO_TXT', 'ไม่พบไฟล์ .txt ในแหล่งข้อมูลที่เลือก')
    }

    const report = await validateEntries(entries)
    res.json(report)
  } catch (err) {
    console.error('[VALIDATE ERROR]', err)
    next(err)
  }
})

// POST /api/validate/export-errors — export error list as Excel
router.post('/export-errors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileName, description, hospcode, personErrors, missingColumns } = req.body as {
      fileName: string
      description: string
      hospcode: string
      personErrors: PersonError[]
      missingColumns: string[]
    }

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('รายการไม่ผ่าน')

    sheet.addRow(['ไฟล์:', fileName, 'รายละเอียด:', description])
    sheet.addRow(['HOSPCODE:', hospcode, 'จำนวนไม่ผ่าน:', personErrors.length])
    if (missingColumns.length > 0) {
      sheet.addRow(['คอลัมน์ที่ขาด:', missingColumns.join(', ')])
    }
    sheet.addRow([])

    const headerRow = sheet.addRow(['#', 'HN', 'ชื่อ-นามสกุล', 'CID', 'PID', 'ฟิลด์ที่ผิดพลาด', 'รายละเอียด'])
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } }
    sheet.columns = [{ width: 6 }, { width: 14 }, { width: 28 }, { width: 16 }, { width: 18 }, { width: 30 }, { width: 60 }]

    personErrors.forEach((p, i) => {
      const fields = [...new Set(p.errors.map(e => e.field))].join(', ')
      const details = p.errors.map(e => `${e.field}(${e.caption}): ${e.type === 'NULL_REQUIRED' ? 'ค่าว่าง' : e.value ?? ''}`).join(' | ')
      const row = sheet.addRow([i + 1, p.hn || '', p.name || '', p.cid || '', p.pid, fields, details])
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFFFFFFF' : 'FFFFF5F5' } }
    })

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const safeName = fileName.replace(/[^a-zA-Z0-9_]/g, '')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="errors-${safeName}-${date}.xlsx"`)
    await workbook.xlsx.write(res)
    res.end()
  } catch (err) {
    next(err)
  }
})

export default router
