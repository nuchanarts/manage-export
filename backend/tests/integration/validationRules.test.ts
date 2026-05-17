// backend/tests/integration/validationRules.test.ts
// Integration tests for F6 per-category std-code validation rules (PUT + import)

import request from 'supertest'
import ExcelJS from 'exceljs'

const mockQuery = jest.fn()
jest.mock('../../src/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

import app from '../../src/index'

// ─── Helper: build xlsx buffer ───────────────────────────────────────────────
async function makeXlsx(headers: string[], rows: (string | null)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Sheet1')
  ws.addRow(headers)
  for (const row of rows) ws.addRow(row)
  return wb.xlsx.writeBuffer() as Promise<Buffer>
}

describe('F6 — PUT validation rules', () => {
  beforeEach(() => mockQuery.mockReset())

  // ── drug-list: valid 24-char code ────────────────────────────────────────
  it('PUT drug-list with valid 24-char code → 200 ok (update+audit called)', async () => {
    const validCode = 'A'.repeat(24)  // 24 alphanumeric chars
    mockQuery
      .mockResolvedValueOnce({ rows: [{ icode: 'DRUG01' }], rowCount: 1 }) // exists
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 }) // select-current
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                       // UPDATE
      .mockResolvedValue({ rows: [], rowCount: 0 })                           // audit
    const res = await request(app)
      .put('/api/basic-config/drug-list/DRUG01')
      .send({ std_code: validCode })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    // Verify UPDATE was called (call index 2)
    const updateCall = mockQuery.mock.calls[2]
    expect(updateCall[0]).toContain('UPDATE `drugitems` SET `did` = ?')
    expect(updateCall[1]).toEqual([validCode, 'DRUG01'])
  })

  // ── drug-list: invalid 5-char code → 400 INVALID_CODE (no DB write) ─────
  it('PUT drug-list with 5-char code → 400 INVALID_CODE, no DB calls', async () => {
    const res = await request(app)
      .put('/api/basic-config/drug-list/DRUG01')
      .send({ std_code: 'ABCDE' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('INVALID_CODE')
    expect(res.body.message).toContain('24')
    // No DB calls at all (validation fires before existence check)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  // ── drug-list: empty string (clear) → bypasses validation → 200 ──────────
  it('PUT drug-list with empty std_code (clear) → 200 (rule bypassed)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ icode: 'DRUG01' }], rowCount: 1 }) // exists
      .mockResolvedValueOnce({ rows: [{ current_val: 'OLD24CHARCODE000000000001' }], rowCount: 1 }) // select-current
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                       // UPDATE
      .mockResolvedValue({ rows: [], rowCount: 0 })                           // audit
    const res = await request(app)
      .put('/api/basic-config/drug-list/DRUG01')
      .send({ std_code: '' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    // UPDATE called with null (empty = clear)
    const updateCall = mockQuery.mock.calls[2]
    expect(updateCall[1][0]).toBeNull()
  })

  // ── chronic-disease: valid ICD-10 E11 → 200 ──────────────────────────────
  it('PUT chronic-disease with valid ICD-10 E11 → 200', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ clinic: 'CLI1' }], rowCount: 1 }) // exists
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValue({ rows: [], rowCount: 0 })
    const res = await request(app)
      .put('/api/basic-config/chronic-disease/CLI1')
      .send({ std_code: 'E11' })
    expect(res.status).toBe(200)
  })

  // ── chronic-disease: all-digits code → 400 ───────────────────────────────
  it('PUT chronic-disease with all-digits code → 400 INVALID_CODE, no DB calls', async () => {
    const res = await request(app)
      .put('/api/basic-config/chronic-disease/CLI1')
      .send({ std_code: '123' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('INVALID_CODE')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  // ── procedure: valid ICD-9-CM 93.01 → 200 ────────────────────────────────
  it('PUT procedure with valid ICD-9-CM 93.01 → 200', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ er_oper_code: 'OP1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValue({ rows: [], rowCount: 0 })
    const res = await request(app)
      .put('/api/basic-config/procedure/OP1')
      .send({ std_code: '93.01' })
    expect(res.status).toBe(200)
  })

  // ── procedure: single-char code → 400 (fails minLen:2) ───────────────────
  it('PUT procedure with single-char code → 400 INVALID_CODE, no DB calls', async () => {
    const res = await request(app)
      .put('/api/basic-config/procedure/OP1')
      .send({ std_code: '9' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('INVALID_CODE')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  // ── procedure: letters-only → 400 (fails pattern) ────────────────────────
  it('PUT procedure with letters-only ABC → 400 INVALID_CODE', async () => {
    const res = await request(app)
      .put('/api/basic-config/procedure/OP1')
      .send({ std_code: 'ABC' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('INVALID_CODE')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  // ── occupation (no rule): any value accepted ─────────────────────────────
  it('PUT occupation (no rule) with unusual value → 200 (rule-less category unaffected)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ occupation: '05' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValue({ rows: [], rowCount: 0 })
    const res = await request(app)
      .put('/api/basic-config/occupation/05')
      .send({ std_code: 'ANYTHING_GOES' })
    expect(res.status).toBe(200)
  })

  // ── chronic-disease: empty → bypasses validation → 200 ───────────────────
  it('PUT chronic-disease with empty std_code (clear) → 200 (rule bypassed)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ clinic: 'CLI1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ current_val: 'E11' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValue({ rows: [], rowCount: 0 })
    const res = await request(app)
      .put('/api/basic-config/chronic-disease/CLI1')
      .send({ std_code: '' })
    expect(res.status).toBe(200)
  })
})

describe('F6 — import path validation (batch continues on rule failure)', () => {
  beforeEach(() => mockQuery.mockReset())

  it('import drug-list with 5-char code → skipped, error message, batch continues', async () => {
    const xlsxBuf = await makeXlsx(
      ['รหัส (HIS)', 'ชื่อ (HIS)', 'รหัสมาตรฐาน'],
      [
        ['DRUG01', 'ยาA', 'BADCODE'],                  // 7 chars → fails rule
        ['DRUG02', 'ยาB', 'A'.repeat(24)],             // 24 chars → valid
      ],
    )
    // DRUG01 exists check, DRUG02 exists check, DRUG02 select-current, DRUG02 UPDATE, audit
    mockQuery
      .mockResolvedValueOnce({ rows: [{ icode: 'DRUG01' }], rowCount: 1 }) // DRUG01 exists
      .mockResolvedValueOnce({ rows: [{ icode: 'DRUG02' }], rowCount: 1 }) // DRUG02 exists
      .mockResolvedValueOnce({ rows: [{ current_val: null }], rowCount: 1 }) // select-current DRUG02
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                       // UPDATE DRUG02
      .mockResolvedValue({ rows: [], rowCount: 0 })                           // audit
    const res = await request(app)
      .post('/api/basic-config/drug-list/import')
      .attach('file', xlsxBuf, { filename: 'drug-list.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    expect(res.status).toBe(200)
    // DRUG02 updated, DRUG01 skipped
    expect(res.body.updated).toBe(1)
    expect(res.body.skipped).toBe(1)
    // Error message mentions DRUG01 and the rule message
    expect(res.body.errors.length).toBeGreaterThanOrEqual(1)
    expect(res.body.errors[0]).toContain('DRUG01')
  })

  it('import drug-list with empty code (clear) → succeeds for that row (bypass)', async () => {
    const xlsxBuf = await makeXlsx(
      ['รหัส (HIS)', 'ชื่อ (HIS)', 'รหัสมาตรฐาน'],
      [
        ['DRUG01', 'ยาA', ''],  // empty → clear → bypass rule
      ],
    )
    mockQuery
      .mockResolvedValueOnce({ rows: [{ icode: 'DRUG01' }], rowCount: 1 }) // exists
      .mockResolvedValueOnce({ rows: [{ current_val: 'OLD24CHARCODE000000000001' }], rowCount: 1 }) // select-current
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })                       // UPDATE
      .mockResolvedValue({ rows: [], rowCount: 0 })                           // audit
    const res = await request(app)
      .post('/api/basic-config/drug-list/import')
      .attach('file', xlsxBuf, { filename: 'drug-list.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    expect(res.status).toBe(200)
    expect(res.body.updated).toBe(1)
    expect(res.body.skipped).toBe(0)
    expect(res.body.errors.length).toBe(0)
  })
})
