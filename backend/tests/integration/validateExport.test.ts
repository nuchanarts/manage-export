// backend/tests/integration/validateExport.test.ts
// Integration tests for POST /api/validate-export/errors

import request from 'supertest'
import ExcelJS from 'exceljs'

const mockQuery = jest.fn()
jest.mock('../../src/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

import app from '../../src/index'

function makeReport(overrides: object = {}) {
  return {
    hospcode: 'HOSP001',
    generatedAt: new Date().toISOString(),
    totalFiles: 1,
    passCount: 0,
    failCount: 1,
    warnCount: 0,
    totalPersonsAll: 10,
    passPersonsAll: 8,
    failPersonsAll: 2,
    passPercentAll: 80,
    errorGroupSummary: [
      {
        fileName: 'PERSON.txt',
        description: 'ข้อมูลบุคคล',
        totalPersons: 10,
        failPersons: 2,
        passPercent: 80,
        topErrors: [{ field: 'BIRTH', caption: 'วันเกิด', count: 2 }],
      },
    ],
    missingFiles: [],
    unknownFiles: [],
    files: [
      {
        fileName: 'PERSON.txt',
        description: 'ข้อมูลบุคคล',
        status: 'FAIL',
        totalRows: 10,
        totalPersons: 10,
        passPersons: 8,
        failPersons: 2,
        passPercent: 80,
        errorCount: 2,
        warnCount: 0,
        errors: [
          {
            row: 3,
            field: 'BIRTH',
            caption: 'วันเกิด',
            description: 'วันที่ต้องไม่ว่าง',
            type: 'NULL_REQUIRED',
            value: '',
            message: 'ค่าว่าง',
            pid: 'P001',
            cid: '1234567890123',
          },
        ],
        personErrors: [
          {
            pid: 'P001',
            cid: '1234567890123',
            hn: 'HN001',
            name: 'นาย Test',
            errors: [
              { field: 'BIRTH', caption: 'วันเกิด', type: 'NULL_REQUIRED', value: '' },
            ],
          },
        ],
        personPass: [],
        missingColumns: [],
        extraColumns: [],
        schemaFields: [],
        fileMeta: {
          fileNumber: 1,
          fileType: 'สะสม',
          units: '',
          definition: '',
          scope: [],
          period: [],
          notes: [],
          related: [],
          hisGuide: null,
        },
      },
    ],
    ...overrides,
  }
}

describe('POST /api/validate-export/errors', () => {
  beforeEach(() => mockQuery.mockReset())

  it('returns 200 with xlsx content-type for valid report', async () => {
    const res = await request(app)
      .post('/api/validate-export/errors')
      .send(makeReport())
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  })

  it('returns Content-Disposition with validation_errors.xlsx filename', async () => {
    const res = await request(app)
      .post('/api/validate-export/errors')
      .send(makeReport())
      .set('Content-Type', 'application/json')

    expect(res.headers['content-disposition']).toContain('validation_errors.xlsx')
  })

  it('returns parseable workbook with two sheets', async () => {
    const res = await request(app)
      .post('/api/validate-export/errors')
      .send(makeReport())
      .set('Content-Type', 'application/json')
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => callback(null, Buffer.concat(chunks)))
      })

    expect(res.status).toBe(200)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(res.body as Buffer)
    expect(wb.worksheets).toHaveLength(2)
    expect(wb.worksheets[0]!.name).toBe('สรุปรายแฟ้ม')
    expect(wb.worksheets[1]!.name).toBe('รายละเอียด Error')
  })

  it('sheet 1 has correct header row', async () => {
    const res = await request(app)
      .post('/api/validate-export/errors')
      .send(makeReport())
      .set('Content-Type', 'application/json')
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => callback(null, Buffer.concat(chunks)))
      })

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(res.body as Buffer)
    const ws = wb.worksheets[0]!
    const headerRow = ws.getRow(1).values as (string | undefined)[]
    expect(headerRow).toContain('FileName')
    expect(headerRow).toContain('ลักษณะแฟ้ม')
    expect(headerRow).toContain('Record')
    expect(headerRow).toContain('ผ่าน')
    expect(headerRow).toContain('ไม่ผ่าน')
    expect(headerRow).toContain('ร้อยละ')
    expect(headerRow).toContain('คอลัมน์ขาด')
    expect(headerRow).toContain('ปัญหาหลัก')
  })

  it('sheet 1 data row has correct file data', async () => {
    const res = await request(app)
      .post('/api/validate-export/errors')
      .send(makeReport())
      .set('Content-Type', 'application/json')
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => callback(null, Buffer.concat(chunks)))
      })

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(res.body as Buffer)
    const ws = wb.worksheets[0]!
    // Row 2 is the first data row (row 1 is header)
    const dataRow = ws.getRow(2).values as unknown[]
    // Column 1 = FileName
    expect(String(dataRow[1])).toBe('PERSON.txt')
    // Column 2 = ลักษณะแฟ้ม
    expect(String(dataRow[2])).toBe('สะสม')
  })

  it('sheet 2 has correct header row', async () => {
    const res = await request(app)
      .post('/api/validate-export/errors')
      .send(makeReport())
      .set('Content-Type', 'application/json')
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => callback(null, Buffer.concat(chunks)))
      })

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(res.body as Buffer)
    const ws = wb.worksheets[1]!
    const headerRow = ws.getRow(1).values as (string | undefined)[]
    expect(headerRow).toContain('FileName')
    expect(headerRow).toContain('แถว/row')
    expect(headerRow).toContain('PID')
    expect(headerRow).toContain('CID')
    expect(headerRow).toContain('ฟิลด์/field')
    expect(headerRow).toContain('ประเภท/error')
    expect(headerRow).toContain('ข้อความ')
  })

  it('returns 400 for body without files array', async () => {
    const res = await request(app)
      .post('/api/validate-export/errors')
      .send({ notFiles: true })
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('message')
  })

  it('returns 400 for empty body', async () => {
    const res = await request(app)
      .post('/api/validate-export/errors')
      .send({})
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(400)
  })

  it('handles report with no files gracefully (200 with empty sheets)', async () => {
    const res = await request(app)
      .post('/api/validate-export/errors')
      .send({ files: [] })
      .set('Content-Type', 'application/json')
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => callback(null, Buffer.concat(chunks)))
      })

    expect(res.status).toBe(200)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(res.body as Buffer)
    // Only header row in each sheet
    expect(wb.worksheets[0]!.rowCount).toBe(1)
    expect(wb.worksheets[1]!.rowCount).toBe(1)
  })
})
