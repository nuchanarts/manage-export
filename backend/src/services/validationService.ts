import AdmZip from 'adm-zip'
import { parseConstitution, FileSchemaDef } from './constitutionParser'
import { getHisGuide, HisGuide } from './hisGuide'

export interface FileEntry {
  name: string    // เช่น PERSON.txt
  data: Buffer
}

export interface FieldError {
  row: number
  field: string
  caption: string
  description: string   // คำอธิบายฟิลด์ + ค่าที่ถูกต้อง (จาก constitution.md)
  type: 'MISSING_COLUMN' | 'NULL_REQUIRED' | 'EXCEEDS_WIDTH' | 'INVALID_DATE' | 'INVALID_NUMBER'
  value?: string
  message: string
  pid?: string
  cid?: string
}

export interface PersonError {
  pid: string
  cid: string
  hn: string
  name: string
  errors: { field: string; caption: string; type: string; value?: string }[]
}

export interface SchemaFieldSummary {
  name: string
  caption: string
  type: string
  width: number
  notNull: boolean
  pk: boolean
}

export interface FileMeta {
  fileNumber: number
  fileType: string
  units: string
  definition: string
  scope: string[]
  period: string[]
  notes: string[]
  related: string[]
  hisGuide: HisGuide | null
}

export interface FileResult {
  fileName: string
  description: string
  status: 'PASS' | 'FAIL' | 'WARN' | 'UNKNOWN'
  totalRows: number
  totalPersons: number
  passPersons: number
  failPersons: number
  passPercent: number
  errorCount: number
  warnCount: number
  errors: FieldError[]
  personErrors: PersonError[]
  personPass: PersonError[]
  missingColumns: string[]
  extraColumns: string[]
  schemaFields: SchemaFieldSummary[]
  fileMeta: FileMeta
}

export interface ErrorGroupSummary {
  fileName: string
  description: string
  totalPersons: number
  failPersons: number
  passPercent: number
  topErrors: { field: string; caption: string; count: number }[]
}

export interface ValidationReport {
  hospcode: string
  totalFiles: number
  passCount: number
  failCount: number
  warnCount: number
  totalPersonsAll: number
  passPersonsAll: number
  failPersonsAll: number
  passPercentAll: number
  errorGroupSummary: ErrorGroupSummary[]
  missingFiles: string[]
  unknownFiles: string[]
  files: FileResult[]
  generatedAt: string
}

const DATE_RE = /^\d{8}$/
const DATETIME_RE = /^\d{14}$/

function isValidDate(v: string): boolean {
  if (!DATE_RE.test(v)) return false
  const y = parseInt(v.slice(0, 4))
  const m = parseInt(v.slice(4, 6))
  const d = parseInt(v.slice(6, 8))
  return y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31
}

type PersonLookupMap = Map<string, { cid: string; hn: string; name: string }>

function validateFile(fileName: string, content: string, schema: FileSchemaDef | undefined, personLookup: PersonLookupMap): FileResult {
  const lines = content.split('\n').filter(l => l.trim().length > 0)
  const result: FileResult = {
    fileName,
    description: schema?.description ?? '',
    status: 'PASS',
    totalRows: 0,
    totalPersons: 0,
    passPersons: 0,
    failPersons: 0,
    passPercent: 0,
    errorCount: 0,
    warnCount: 0,
    errors: [],
    personErrors: [],
    personPass: [],
    missingColumns: [],
    extraColumns: [],
    schemaFields: schema?.fields.map(f => ({
      name: f.name, caption: f.caption, type: f.type,
      width: f.width, notNull: f.notNull, pk: f.pk,
    })) ?? [],
    fileMeta: {
      fileNumber: schema?.fileNumber ?? 0,
      fileType: schema?.fileType ?? '',
      units: schema?.units ?? '',
      definition: schema?.definition ?? '',
      scope: schema?.scope ?? [],
      period: schema?.period ?? [],
      notes: schema?.notes ?? [],
      related: schema?.related ?? [],
      hisGuide: getHisGuide(fileName),
    },
  }

  if (lines.length === 0) {
    result.status = 'PASS'
    return result
  }

  const headers = lines[0]!.split('|').map(h => h.trim())
  result.totalRows = lines.length - 1

  // ถ้าไม่มีข้อมูล (0 rows) ไม่รายงาน error ใด ๆ
  if (result.totalRows === 0) {
    result.status = 'PASS'
    return result
  }

  // Level 1 + 2: Column structure check
  if (schema) {
    const schemaNames = schema.fields.map(f => f.name)
    result.missingColumns = schemaNames.filter(n => !headers.includes(n))
    result.extraColumns = headers.filter(h => h && !schemaNames.includes(h))

    if (result.missingColumns.length > 0) {
      result.status = 'FAIL'
      result.errorCount += result.missingColumns.length
    }
  }

  if (!schema) {
    result.status = 'UNKNOWN'
    return result
  }

  const MAX_ERRORS_PER_FILE = 500
  const pidIdx = headers.indexOf('PID')
  const cidIdx = headers.indexOf('CID')
  const hnIdx = headers.indexOf('HN')
  const nameIdx = headers.indexOf('NAME')
  const lnameIdx = headers.indexOf('LNAME')
  const prenameIdx = headers.indexOf('PRENAME')

  // Find which missing columns are NOT NULL — these make every person fail
  const missingRequiredCols = schema
    ? result.missingColumns.filter(colName => schema.fields.find(f => f.name === colName)?.notNull)
    : []

  const personMap = new Map<string, PersonError>()
  const failPidSet = new Set<string>()

  // Level 3: Row-by-row validation
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i]!.split('|')
    const rowNum = i + 1
    const pid = pidIdx >= 0 ? (row[pidIdx] ?? '').trim() : `row_${rowNum}`

    // Try to get person info from this file's columns first, fall back to PERSON.txt lookup
    const rowCid = cidIdx >= 0 ? (row[cidIdx] ?? '').trim() : ''
    const rowHn = hnIdx >= 0 ? (row[hnIdx] ?? '').trim() : ''
    const rowPrename = prenameIdx >= 0 ? (row[prenameIdx] ?? '').trim() : ''
    const rowName = nameIdx >= 0 ? (row[nameIdx] ?? '').trim() : ''
    const rowLname = lnameIdx >= 0 ? (row[lnameIdx] ?? '').trim() : ''
    const rowFullName = [rowName, rowLname].filter(Boolean).join(' ')

    // Fall back to PERSON.txt if this file lacks name/cid info
    const personInfo = personLookup.get(pid)
    const cid = rowCid || personInfo?.cid || ''
    const hn = rowHn || personInfo?.hn || ''
    const fullName = rowFullName || personInfo?.name || ''

    if (!personMap.has(pid)) {
      personMap.set(pid, { pid, cid, hn, name: fullName, errors: [] })
    }

    const rowHasError = { flag: false }

    // If any missing NOT NULL column exists, every person in this file fails
    if (missingRequiredCols.length > 0) {
      for (const colName of missingRequiredCols) {
        const fieldDef = schema!.fields.find(f => f.name === colName)
        personMap.get(pid)?.errors.push({
          field: colName,
          caption: fieldDef?.caption ?? colName,
          type: 'NULL_REQUIRED',
          value: '(คอลัมน์ไม่มีในไฟล์)',
        })
      }
      rowHasError.flag = true
    }

    if (result.errors.length >= MAX_ERRORS_PER_FILE) continue

    for (const field of schema.fields) {
      const colIdx = headers.indexOf(field.name)
      if (colIdx === -1) continue // already reported as missing column

      const value = (row[colIdx] ?? '').trim()

      const fieldDesc = field.description || ''

      // NOT NULL check
      if (field.notNull && value === '') {
        result.errors.push({
          row: rowNum, field: field.name, caption: field.caption, description: fieldDesc,
          type: 'NULL_REQUIRED', value, pid, cid,
          message: `ฟิลด์ ${field.name} (${field.caption}) ห้ามเป็นค่าว่าง`,
        })
        personMap.get(pid)?.errors.push({ field: field.name, caption: field.caption, type: 'NULL_REQUIRED', value })
        rowHasError.flag = true
        result.errorCount++
        if (result.status === 'PASS') result.status = 'FAIL'
        continue
      }

      if (value === '') continue

      // Width check
      if (value.length > field.width) {
        result.errors.push({
          row: rowNum, field: field.name, caption: field.caption, description: fieldDesc,
          type: 'EXCEEDS_WIDTH', value: value.slice(0, 30), pid, cid,
          message: `ฟิลด์ ${field.name} ยาว ${value.length} ตัว (สูงสุด ${field.width})`,
        })
        personMap.get(pid)?.errors.push({ field: field.name, caption: field.caption, type: 'EXCEEDS_WIDTH', value: value.slice(0, 30) })
        rowHasError.flag = true
        result.warnCount++
        if (result.status === 'PASS') result.status = 'WARN'
        continue
      }

      if (field.type === 'D' && !isValidDate(value)) {
        result.errors.push({
          row: rowNum, field: field.name, caption: field.caption, description: 'รูปแบบ: YYYYMMDD (8 หลัก) เช่น 25660101',
          type: 'INVALID_DATE', value, pid, cid,
          message: `ฟิลด์ ${field.name} รูปแบบวันที่ไม่ถูกต้อง: "${value}"`,
        })
        personMap.get(pid)?.errors.push({ field: field.name, caption: field.caption, type: 'INVALID_DATE', value })
        rowHasError.flag = true
        result.warnCount++
        if (result.status === 'PASS') result.status = 'WARN'
      }

      if (field.type === 'DT' && value !== '' && !DATETIME_RE.test(value)) {
        result.errors.push({
          row: rowNum, field: field.name, caption: field.caption, description: 'รูปแบบ: YYYYMMDDHHMMSS (14 หลัก) เช่น 25660101143000',
          type: 'INVALID_DATE', value, pid, cid,
          message: `ฟิลด์ ${field.name} DateTime ไม่ถูกต้อง: "${value}"`,
        })
        personMap.get(pid)?.errors.push({ field: field.name, caption: field.caption, type: 'INVALID_DATE', value })
        rowHasError.flag = true
        result.warnCount++
        if (result.status === 'PASS') result.status = 'WARN'
      }

      if (field.type === 'N' && value !== '' && isNaN(Number(value))) {
        result.errors.push({
          row: rowNum, field: field.name, caption: field.caption, description: fieldDesc,
          type: 'INVALID_NUMBER', value, pid, cid,
          message: `ฟิลด์ ${field.name} ต้องเป็นตัวเลข: "${value}"`,
        })
        personMap.get(pid)?.errors.push({ field: field.name, caption: field.caption, type: 'INVALID_NUMBER', value })
        rowHasError.flag = true
        result.warnCount++
        if (result.status === 'PASS') result.status = 'WARN'
      }
    }

    if (rowHasError.flag) failPidSet.add(pid)
  }

  // Person-level stats
  result.totalPersons = personMap.size
  result.failPersons = failPidSet.size
  result.passPersons = result.totalPersons - result.failPersons
  result.passPercent = result.totalPersons > 0
    ? Math.round((result.passPersons / result.totalPersons) * 10000) / 100
    : 100

  // Collect personErrors (fail) and personPass (pass) — each limited to 500
  let failCount = 0
  let passCount = 0
  for (const [pid, pe] of personMap) {
    if (failPidSet.has(pid)) {
      if (failCount < 500) { result.personErrors.push(pe); failCount++ }
    } else {
      if (passCount < 500) { result.personPass.push({ ...pe, errors: [] }); passCount++ }
    }
  }

  return result
}


// Extract .txt entries from ZIP buffer
export function extractZip(buffer: Buffer): FileEntry[] {
  const zip = new AdmZip(buffer)
  return zip.getEntries()
    .filter(e => !e.isDirectory && /\.txt$/i.test(e.name))
    .map(e => ({ name: e.entryName.split('/').pop() ?? e.name, data: e.getData() }))
}

// Extract .txt entries from RAR buffer using node-unrar-js
export async function extractRar(buffer: Buffer): Promise<FileEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createExtractorFromData } = require('node-unrar-js')
  const extractor = await createExtractorFromData({ data: buffer })
  const { files } = extractor.extract()
  const entries: FileEntry[] = []
  for (const file of files) {
    if (!file.fileHeader.name.match(/\.txt$/i)) continue
    if (file.fileHeader.flags.directory) continue
    const name = file.fileHeader.name.split(/[\\/]/).pop() ?? file.fileHeader.name
    if (file.extraction) {
      entries.push({ name, data: Buffer.from(file.extraction) })
    }
  }
  return entries
}

// Build person lookup from FileEntry list
function buildPersonLookupFromEntries(entries: FileEntry[]): Map<string, { cid: string; hn: string; name: string }> {
  const map = new Map<string, { cid: string; hn: string; name: string }>()
  const personEntry = entries.find(e => e.name.toUpperCase() === 'PERSON.TXT')
  if (!personEntry) return map
  const lines = personEntry.data.toString('utf-8').split('\n').filter(l => l.trim())
  if (lines.length < 2) return map
  const headers = lines[0]!.split('|').map(h => h.trim())
  const pidIdx = headers.indexOf('PID')
  const cidIdx = headers.indexOf('CID')
  const hnIdx = headers.indexOf('HN')
  const prenameIdx = headers.indexOf('PRENAME')
  const nameIdx = headers.indexOf('NAME')
  const lnameIdx = headers.indexOf('LNAME')
  if (pidIdx === -1) return map
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i]!.split('|')
    const pid = (row[pidIdx] ?? '').trim()
    if (!pid) continue
    const name = nameIdx >= 0 ? (row[nameIdx] ?? '').trim() : ''
    const lname = lnameIdx >= 0 ? (row[lnameIdx] ?? '').trim() : ''
    map.set(pid, {
      cid: cidIdx >= 0 ? (row[cidIdx] ?? '').trim() : '',
      hn: hnIdx >= 0 ? (row[hnIdx] ?? '').trim() : '',
      name: [name, lname].filter(Boolean).join(' '),
    })
  }
  return map
}

// Main validation function — works with any FileEntry list
export async function validateEntries(entries: FileEntry[]): Promise<ValidationReport> {
  const schemas = parseConstitution()
  const personLookup = buildPersonLookupFromEntries(entries)

  const report: ValidationReport = {
    hospcode: '',
    totalFiles: entries.length,
    passCount: 0,
    failCount: 0,
    warnCount: 0,
    totalPersonsAll: 0,
    passPersonsAll: 0,
    failPersonsAll: 0,
    passPercentAll: 0,
    errorGroupSummary: [],
    missingFiles: [],
    unknownFiles: [],
    files: [],
    generatedAt: new Date().toISOString(),
  }

  const processedFileNames = new Set<string>()

  for (const entry of entries) {
    const baseName = entry.name.replace(/\.txt$/i, '').toUpperCase()
    processedFileNames.add(baseName)

    let content: string
    try {
      content = entry.data.toString('utf-8')
    } catch {
      content = ''
    }

    const schema = schemas.get(baseName)
    const fileResult = validateFile(entry.name, content, schema, personLookup)

    // Extract HOSPCODE from first data row if not yet known
    if (!report.hospcode && content) {
      const firstDataLine = content.split('\n')[1]
      if (firstDataLine) {
        report.hospcode = firstDataLine.split('|')[0]?.trim() ?? ''
      }
    }

    if (schema === undefined) {
      report.unknownFiles.push(entry.name)
    }

    switch (fileResult.status) {
      case 'PASS': report.passCount++; break
      case 'FAIL': report.failCount++; break
      case 'WARN': report.warnCount++; break
    }

    report.files.push(fileResult)
  }

  // Check for files in schema but missing from zip
  for (const [name] of schemas) {
    if (!processedFileNames.has(name)) {
      report.missingFiles.push(`${name}.txt`)
    }
  }

  // Build error group summary (only files with errors)
  for (const f of report.files) {
    if (f.failPersons === 0 || f.totalPersons === 0) continue
    const fieldCount = new Map<string, { caption: string; count: number }>()
    for (const e of f.errors) {
      const existing = fieldCount.get(e.field)
      if (existing) existing.count++
      else fieldCount.set(e.field, { caption: e.caption, count: 1 })
    }
    for (const col of f.missingColumns) {
      const schema = f.schemaFields.find(s => s.name === col)
      if (schema?.notNull) {
        fieldCount.set(col, { caption: schema.caption, count: f.totalRows })
      }
    }
    const topErrors = [...fieldCount.entries()]
      .map(([field, v]) => ({ field, caption: v.caption, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    report.errorGroupSummary.push({
      fileName: f.fileName,
      description: f.description,
      totalPersons: f.totalPersons,
      failPersons: f.failPersons,
      passPercent: f.passPercent,
      topErrors,
    })
  }

  // Compute overall person totals (only files that have person data)
  for (const f of report.files) {
    if (f.totalPersons > 0) {
      report.totalPersonsAll += f.totalPersons
      report.passPersonsAll += f.passPersons
      report.failPersonsAll += f.failPersons
    }
  }
  report.passPercentAll = report.totalPersonsAll > 0
    ? Math.round((report.passPersonsAll / report.totalPersonsAll) * 10000) / 100
    : 0

  report.files.sort((a, b) => {
    const na = a.fileMeta.fileNumber || 999
    const nb = b.fileMeta.fileNumber || 999
    return na - nb
  })

  return report
}
