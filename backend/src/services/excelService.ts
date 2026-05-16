import ExcelJS from 'exceljs'
import { Response } from 'express'
import { HealthRecord } from '../models/types'

const COLUMNS: { header: string; key: keyof HealthRecord; width: number }[] = [
  { header: 'รหัสหน่วยบริการ', key: 'HOSPCODE', width: 16 },
  { header: 'ทะเบียนบุคคล', key: 'PID', width: 18 },
  { header: 'เลขบัตรประชาชน', key: 'CID', width: 16 },
  { header: 'เลขผู้ป่วยนอก (HN)', key: 'HN', width: 18 },
  { header: 'ลำดับบริการ', key: 'SEQ', width: 18 },
  { header: 'วันที่รับบริการ', key: 'DATE_SERV', width: 14 },
  { header: 'คำนำหน้า', key: 'PRENAME', width: 10 },
  { header: 'ชื่อ', key: 'NAME', width: 20 },
  { header: 'นามสกุล', key: 'LNAME', width: 22 },
  { header: 'เพศ', key: 'SEX', width: 8 },
  { header: 'วันเกิด', key: 'BIRTH', width: 12 },
  { header: 'สถานะบุคคล', key: 'TYPEAREA', width: 14 },
  { header: 'รหัสพื้นที่', key: 'AREACODE', width: 12 },
]

export async function streamExcel(records: HealthRecord[], res: Response, filename: string): Promise<void> {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res })
  const sheet = workbook.addWorksheet('ข้อมูล')

  sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }))

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.commit()

  for (const record of records) {
    const row = sheet.addRow(COLUMNS.map((c) => record[c.key]))
    row.commit()
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

  await workbook.commit()
}
