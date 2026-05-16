import fs from 'fs'
import path from 'path'

export interface FieldDef {
  name: string
  caption: string
  description: string
  pk: boolean
  type: 'C' | 'N' | 'D' | 'DT'
  width: number
  notNull: boolean
}

export interface FileSchemaDef {
  fileName: string
  fileNumber: number
  description: string
  fileType: string
  units: string
  definition: string        // นิยามข้อมูล
  scope: string[]           // ขอบเขตข้อมูล
  period: string[]          // เวลา/รอบที่ทำการบันทึก
  notes: string[]           // หมายเหตุ
  related: string[]         // นิยามที่เกี่ยวข้อง
  fields: FieldDef[]
}

// Name aliases: zip file name → constitution.md section name (std43+ renamed some files)
const FILE_NAME_ALIASES: Record<string, string> = {
  LABFU:           'LAB',         // 21-LAB in std43+ v3.1.1
  DIAGNOSIS_OPD:   'DIAGNOSIS',   // 54-DIAGNOSIS (merged OPD+IPD)
  DIAGNOSIS_IPD:   'DIAGNOSIS',
  DRUG_OPD:        'DRUG',        // 55-DRUG (merged OPD+IPD)
  DRUG_IPD:        'DRUG',
  PROCEDURE_OPD:   'PROCED',      // 56-PROCED (merged OPD+IPD, renamed in v3.1.1)
  PROCEDURE_IPD:   'PROCED',
  PROCEDURE_REFER: 'PROCED_REFER',// 48-PROCED_REFER (renamed in v3.1.1)
  CHARGE_OPD:      'CHARGE',      // 57-CHARGE (merged OPD+IPD)
  CHARGE_IPD:      'CHARGE',
}

// Fallback ลักษณะแฟ้ม for files not in constitution.md at all
const FILE_TYPE_FALLBACK: Record<string, string> = {
  CHRONICFU:    'แฟ้มบริการ',     // ไม่มีใน std43+ v3.1.1
  DATA_CORRECT: 'แฟ้มแก้ไขข้อมูล',
  POLICY:       'แฟ้มตามนโยบาย',
}

let _cache: Map<string, FileSchemaDef> | null = null

function findConstitutionPath(): string {
  const candidates = [
    path.resolve(process.cwd(), '.specify/memory/constitution.md'),
    path.resolve(__dirname, '../../../.specify/memory/constitution.md'),
    path.resolve(__dirname, '../../../../.specify/memory/constitution.md'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  throw new Error('constitution.md not found')
}

function parseWidth(raw: string): number {
  const n = parseInt(raw.trim())
  return isNaN(n) ? 255 : n
}

function parseType(raw: string): 'C' | 'N' | 'D' | 'DT' {
  const t = raw.trim().toUpperCase()
  if (t === 'DT') return 'DT'
  if (t === 'N') return 'N'
  if (t === 'D') return 'D'
  return 'C'
}

export function clearConstitutionCache(): void { _cache = null }

export function parseConstitution(): Map<string, FileSchemaDef> {
  if (_cache) return _cache

  const content = fs.readFileSync(findConstitutionPath(), 'utf-8')
  const lines = content.split('\n')
  const schemas = new Map<string, FileSchemaDef>()

  let currentFile: FileSchemaDef | null = null
  let inTable = false
  let headerParsed = false
  let hasDescCol = false
  let currentMeta: 'scope' | 'period' | 'notes' | 'related' | null = null

  for (const line of lines) {
    // Section header: ### (N) FILENAME — description
    const sectionMatch = line.match(/^###\s+\((\d+)\)\s+([A-Z_]+)\s*[—–-](.*)$/)
    if (sectionMatch) {
      if (currentFile) schemas.set(currentFile.fileName, currentFile)
      currentFile = {
        fileName: sectionMatch[2]!.trim(),
        fileNumber: parseInt(sectionMatch[1]!),
        description: sectionMatch[3]!.trim(),
        fileType: '', units: '',
        definition: '', scope: [], period: [], notes: [], related: [],
        fields: [],
      }
      inTable = false
      headerParsed = false
      hasDescCol = false
      currentMeta = null
      continue
    }

    if (!currentFile) continue

    // ลักษณะแฟ้ม — new format: **ลักษณะแฟ้ม:** or old: **ลักษณะ:**
    const typeMatch = line.match(/\*\*ลักษณะ(?:แฟ้ม)?:\*\*\s*([^|]+)/)
    if (typeMatch) {
      currentFile.fileType = typeMatch[1]!.trim()
        .replace(/\s*\(เปลี่ยนจาก[^)]*\)/g, '').trim()
      const unitMatch = line.match(/\*\*หน่วย:\*\*\s*(.+)$/)
      if (unitMatch) currentFile.units = unitMatch[1]!.trim()
      currentMeta = null
      continue
    }
    const unitOnlyMatch = line.match(/\*\*หน่วย:\*\*\s*(.+)$/)
    if (unitOnlyMatch && !currentFile.units) {
      currentFile.units = unitOnlyMatch[1]!.trim()
      continue
    }

    // Meta sections
    const metaSectionMatch = line.match(/^\*\*(นิยามข้อมูล|ขอบเขตข้อมูล|เวลา\/รอบที่บันทึก|หมายเหตุ|นิยามที่เกี่ยวข้อง):\*\*(.*)$/)
    if (metaSectionMatch) {
      const key = metaSectionMatch[1]!
      const val = metaSectionMatch[2]!.trim()
      if (key === 'นิยามข้อมูล') { currentFile.definition = val; currentMeta = null }
      else if (key === 'ขอบเขตข้อมูล') { if (val) currentFile.scope.push(val); currentMeta = 'scope' }
      else if (key === 'เวลา/รอบที่บันทึก') { if (val) currentFile.period.push(val); currentMeta = 'period' }
      else if (key === 'หมายเหตุ') { if (val) currentFile.notes.push(val); currentMeta = 'notes' }
      else if (key === 'นิยามที่เกี่ยวข้อง') { if (val) currentFile.related.push(val); currentMeta = 'related' }
      continue
    }
    // Continuation lines for meta sections (lines starting with number or dash)
    if (currentMeta && !line.startsWith('|') && !line.startsWith('#') && !line.startsWith('*')) {
      const trimmed = line.trim()
      if (trimmed) {
        const arr = currentMeta === 'scope' ? currentFile.scope
          : currentMeta === 'period' ? currentFile.period
          : currentMeta === 'notes' ? currentFile.notes
          : currentMeta === 'related' ? currentFile.related : null
        if (arr) arr.push(trimmed)
      }
      if (!trimmed) currentMeta = null
      continue
    }

    // Table rows
    if (line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1)
      if (cells.length < 5) continue

      // Header row detection
      if (cells[0] === 'No' || cells[0] === '----') {
        inTable = true
        headerParsed = true
        // Detect if DESCRIPTION column is present (new format has 8+ cols)
        hasDescCol = cells.includes('DESCRIPTION') || cells.length >= 8
        continue
      }

      if (!inTable || !headerParsed) continue

      // Column layout:
      // Old: No | CAPTION | NAME | PK | TYPE | WIDTH | NOT NULL
      // New: No | CAPTION | DESCRIPTION | NAME | PK | TYPE | WIDTH | NOT NULL
      let caption: string, descText: string, nameCell: string, pk: boolean, type: string, width: string, notNull: boolean

      if (hasDescCol && cells.length >= 7) {
        caption   = cells[1] ?? ''
        descText  = cells[2] ?? ''
        nameCell  = cells[3] ?? ''
        pk        = (cells[4] ?? '').toUpperCase() === 'Y'
        type      = cells[5] ?? 'C'
        width     = cells[6] ?? '255'
        notNull   = (cells[7] ?? '').toUpperCase() === 'Y'
      } else {
        caption   = cells[1] ?? ''
        descText  = ''
        nameCell  = cells[2] ?? ''
        pk        = (cells[3] ?? '').toUpperCase() === 'Y'
        type      = cells[4] ?? 'C'
        width     = cells[5] ?? '255'
        notNull   = (cells[6] ?? '').toUpperCase() === 'Y'
      }

      const names = nameCell.split('/').map(n => n.trim()).filter(Boolean)
      for (const name of names) {
        if (!name || name.length > 60) continue
        currentFile.fields.push({
          name, caption, description: descText,
          pk, type: parseType(type),
          width: parseWidth(width), notNull,
        })
      }
    } else if (inTable && line.trim() === '') {
      inTable = false
    }
  }

  if (currentFile) schemas.set(currentFile.fileName, currentFile)

  // Create alias entries so zip file names resolve to constitution schema
  for (const [zipName, schemaName] of Object.entries(FILE_NAME_ALIASES)) {
    const source = schemas.get(schemaName)
    if (source && !schemas.has(zipName)) {
      schemas.set(zipName, { ...source, fileName: zipName })
    }
  }

  // Apply fallback fileType for files completely missing from constitution
  for (const [name, def] of schemas) {
    if (!def.fileType && FILE_TYPE_FALLBACK[name]) {
      def.fileType = FILE_TYPE_FALLBACK[name]!
    }
  }
  // Also add fallback entries for files not in constitution at all
  for (const [name, fileType] of Object.entries(FILE_TYPE_FALLBACK)) {
    if (!schemas.has(name)) {
      schemas.set(name, {
        fileName: name, fileNumber: 0, description: '', fileType, units: '',
        definition: '', scope: [], period: [], notes: [], related: [], fields: [],
      })
    }
  }

  _cache = schemas
  return schemas
}
