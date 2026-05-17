// backend/tests/unit/excelMappingIO.test.ts
import { mapHeaderRowToFields, normalizeCellValue, buildImportSummary, ColumnMapping } from '../../src/services/excelMappingIO'
import type { CategoryDef } from '../../src/services/categoryRegistry'

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const single: CategoryDef = {
  key: 'occupation', label: 'อาชีพ',
  table: 'occupation', pk: 'occupation', nameCol: 'name', mapCol: 'nhso_code',
  stdTable: 'provis_occupa', stdCodeCol: 'code', stdNameCol: 'name',
  pending: false,
}

const dual: CategoryDef = {
  key: 'clinic', label: 'คลินิก',
  table: 'clinic', pk: 'clinic', nameCol: 'name', mapCol: 'icd10',
  stdTable: 'icd101', stdCodeCol: 'code', stdNameCol: 'name',
  mapCol2: 'oapp_activity_id', stdTable2: 'oapp_activity',
  stdCodeCol2: 'oapp_activity_id', stdNameCol2: 'oapp_activity_name',
  field1Label: 'ประเภทโรค', field2Label: 'ประเภทกิจกรรม',
  pending: false,
}

const withExtra: CategoryDef = {
  key: 'eclaim-charge', label: 'รายการค่ารักษา',
  table: 'nondrugitems', pk: 'icode', nameCol: 'name', mapCol: 'nhso_adp_code',
  stdTable: 'nhso_adp_code', stdCodeCol: 'nhso_adp_code', stdNameCol: 'nhso_adp_code_name',
  pending: false,
  extraFields: [
    { mapCol: 'billcode',         label: 'Bill code' },
    { mapCol: 'nhso_adp_type_id', label: 'ADP type' },
  ],
}

const hideCode: CategoryDef = {
  key: 'drug-ned-reason', label: 'เหตุผลการสั่งยา NED',
  table: 'drugitems_ned_reason_list', pk: 'doctor_reason', nameCol: 'doctor_reason', mapCol: 'claim_control',
  stdTable: 'drugitems_ned_reason_list', stdCodeCol: 'claim_control', stdNameCol: 'doctor_reason',
  pending: false, hideCodeCol: true,
}

// ─── mapHeaderRowToFields ────────────────────────────────────────────────────

describe('mapHeaderRowToFields — single category', () => {
  it('maps code column', () => {
    const m = mapHeaderRowToFields(['รหัส (HIS)', 'ชื่อ (HIS)', 'รหัสมาตรฐาน'], single)
    const codeCol = m.find(x => x.target.kind === 'code')
    expect(codeCol).toBeDefined()
    expect(codeCol!.colIndex).toBe(0)
  })

  it('maps std_code to "รหัสมาตรฐาน" (default label)', () => {
    const m = mapHeaderRowToFields(['รหัส (HIS)', 'ชื่อ (HIS)', 'รหัสมาตรฐาน'], single)
    const stdCol = m.find(x => x.target.kind === 'std_code')
    expect(stdCol).toBeDefined()
    expect(stdCol!.colIndex).toBe(2)
  })

  it('ignores "ชื่อ (HIS)" column', () => {
    const m = mapHeaderRowToFields(['รหัส (HIS)', 'ชื่อ (HIS)', 'รหัสมาตรฐาน'], single)
    expect(m.find(x => (x.target as { kind: string }).kind === 'name')).toBeUndefined()
    // Only code and std_code should be present
    expect(m.filter(x => x.target.kind === 'code' || x.target.kind === 'std_code')).toHaveLength(2)
  })

  it('ignores unknown headers silently', () => {
    const m = mapHeaderRowToFields(['รหัส (HIS)', 'UNKNOWN_HEADER', 'รหัสมาตรฐาน'], single)
    expect(m.map(x => x.colIndex)).not.toContain(1)
  })

  it('returns empty array for all-unknown headers', () => {
    const m = mapHeaderRowToFields(['FOO', 'BAR', 'BAZ'], single)
    expect(m).toHaveLength(0)
  })

  it('handles null / undefined cells', () => {
    const m = mapHeaderRowToFields([null, undefined, 'รหัสมาตรฐาน'], single)
    const stdCol = m.find(x => x.target.kind === 'std_code')
    expect(stdCol).toBeDefined()
    expect(stdCol!.colIndex).toBe(2)
  })
})

describe('mapHeaderRowToFields — dual category', () => {
  it('maps std_code to field1Label', () => {
    const headers = ['รหัส (HIS)', 'ชื่อ (HIS)', 'ประเภทโรค', 'ประเภทกิจกรรม']
    const m = mapHeaderRowToFields(headers, dual)
    const stdCol = m.find(x => x.target.kind === 'std_code')
    expect(stdCol).toBeDefined()
    expect(stdCol!.colIndex).toBe(2)
  })

  it('maps std_code2 to field2Label', () => {
    const headers = ['รหัส (HIS)', 'ชื่อ (HIS)', 'ประเภทโรค', 'ประเภทกิจกรรม']
    const m = mapHeaderRowToFields(headers, dual)
    const std2Col = m.find(x => x.target.kind === 'std_code2')
    expect(std2Col).toBeDefined()
    expect(std2Col!.colIndex).toBe(3)
  })

  it('does not map std_code2 for single categories', () => {
    const headers = ['รหัส (HIS)', 'ชื่อ (HIS)', 'รหัสมาตรฐาน', 'ประเภทกิจกรรม']
    const m = mapHeaderRowToFields(headers, single)
    expect(m.find(x => x.target.kind === 'std_code2')).toBeUndefined()
  })
})

describe('mapHeaderRowToFields — extra fields', () => {
  it('maps extra field 0 by label', () => {
    const headers = ['รหัส (HIS)', 'ชื่อ (HIS)', 'รหัสมาตรฐาน', 'Bill code', 'ADP type']
    const m = mapHeaderRowToFields(headers, withExtra)
    const e0 = m.find(x => x.target.kind === 'extra' && (x.target as { kind: string; index: number }).index === 0)
    expect(e0).toBeDefined()
    expect(e0!.colIndex).toBe(3)
  })

  it('maps extra field 1 by label', () => {
    const headers = ['รหัส (HIS)', 'ชื่อ (HIS)', 'รหัสมาตรฐาน', 'Bill code', 'ADP type']
    const m = mapHeaderRowToFields(headers, withExtra)
    const e1 = m.find(x => x.target.kind === 'extra' && (x.target as { kind: string; index: number }).index === 1)
    expect(e1).toBeDefined()
    expect(e1!.colIndex).toBe(4)
  })

  it('ignores extra field labels not present in headers', () => {
    const headers = ['รหัส (HIS)', 'ชื่อ (HIS)', 'รหัสมาตรฐาน']
    const m = mapHeaderRowToFields(headers, withExtra)
    expect(m.find(x => x.target.kind === 'extra')).toBeUndefined()
  })
})

describe('mapHeaderRowToFields — hideCodeCol category', () => {
  it('still maps code column if present in header (hideCodeCol is a UI flag only)', () => {
    const headers = ['รหัส (HIS)', 'ชื่อ (HIS)', 'รหัสมาตรฐาน']
    const m = mapHeaderRowToFields(headers, hideCode)
    expect(m.find(x => x.target.kind === 'code')).toBeDefined()
  })
})

// ─── normalizeCellValue ───────────────────────────────────────────────────────

describe('normalizeCellValue', () => {
  it('null → null', () => expect(normalizeCellValue(null)).toBeNull())
  it('undefined → null', () => expect(normalizeCellValue(undefined)).toBeNull())
  it('"" → null', () => expect(normalizeCellValue('')).toBeNull())
  it('"   " (spaces) → null', () => expect(normalizeCellValue('   ')).toBeNull())
  it('"0510" → "0510"', () => expect(normalizeCellValue('0510')).toBe('0510'))
  it('"  0510  " (with spaces) → "0510"', () => expect(normalizeCellValue('  0510  ')).toBe('0510'))
  it('number 42 → "42"', () => expect(normalizeCellValue(42)).toBe('42'))
  it('number 0 → "0" (not null — zero is a valid code)', () => expect(normalizeCellValue(0)).toBe('0'))
  it('Thai string preserved', () => expect(normalizeCellValue('ยาราคาแพง')).toBe('ยาราคาแพง'))
})

// ─── buildImportSummary ───────────────────────────────────────────────────────

describe('buildImportSummary', () => {
  it('formats correctly', () => {
    expect(buildImportSummary(5, 2, 0)).toBe('อัปเดต 5 · ข้าม 2 · ผิดพลาด 0')
  })
  it('handles zeros', () => {
    expect(buildImportSummary(0, 0, 0)).toBe('อัปเดต 0 · ข้าม 0 · ผิดพลาด 0')
  })
  it('handles errors', () => {
    expect(buildImportSummary(3, 1, 7)).toBe('อัปเดต 3 · ข้าม 1 · ผิดพลาด 7')
  })
})
