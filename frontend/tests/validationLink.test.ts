import { mapValidationToCategory } from '../src/data/validationLink'

describe('mapValidationToCategory', () => {
  // ── Known fields → specific basic-config categories ──────────────────────

  it('maps OCCUPA field to occupation category', () => {
    const result = mapValidationToCategory({ field: 'OCCUPA' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'occupation' })
  })

  it('maps NATION field to race category', () => {
    const result = mapValidationToCategory({ field: 'NATION' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'race' })
  })

  it('maps RELIGION field to religion category', () => {
    const result = mapValidationToCategory({ field: 'RELIGION' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'religion' })
  })

  it('maps MARRIAGE field to marriage category', () => {
    const result = mapValidationToCategory({ field: 'MARRIAGE' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'marriage' })
  })

  it('maps EDUCATE field to education category', () => {
    const result = mapValidationToCategory({ field: 'EDUCATE' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'education' })
  })

  it('maps TYPEAREA field to person-kind category', () => {
    const result = mapValidationToCategory({ field: 'TYPEAREA' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'person-kind' })
  })

  it('maps PTTYPE field to insurance category (no file context)', () => {
    const result = mapValidationToCategory({ field: 'PTTYPE' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'insurance' })
  })

  it('maps SPCLTY field to department category', () => {
    const result = mapValidationToCategory({ field: 'SPCLTY' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'department' })
  })

  it('maps CLINIC field to clinic category', () => {
    const result = mapValidationToCategory({ field: 'CLINIC' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'clinic' })
  })

  it('maps DIAGTYPE field to diagnosis-type category', () => {
    const result = mapValidationToCategory({ field: 'DIAGTYPE' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'diagnosis-type' })
  })

  it('maps OPER field to procedure category', () => {
    const result = mapValidationToCategory({ field: 'OPER' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'procedure' })
  })

  it('maps FPTYPE field to fp-method category', () => {
    const result = mapValidationToCategory({ field: 'FPTYPE' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'fp-method' })
  })

  it('maps VACCINE field to vaccine-all category', () => {
    const result = mapValidationToCategory({ field: 'VACCINE' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'vaccine-all' })
  })

  it('maps URGENCY field to urgency-level category', () => {
    const result = mapValidationToCategory({ field: 'URGENCY' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'urgency-level' })
  })

  it('maps OVSTIST field to service-entry category', () => {
    const result = mapValidationToCategory({ field: 'OVSTIST' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'service-entry' })
  })

  it('maps DRUGNAME field to drug-list category', () => {
    const result = mapValidationToCategory({ field: 'DRUGNAME' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'drug-list' })
  })

  it('maps NED field to drug-ned-reason category', () => {
    const result = mapValidationToCategory({ field: 'NED' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'drug-ned-reason' })
  })

  it('maps LABCODE field to lab-value-map category', () => {
    const result = mapValidationToCategory({ field: 'LABCODE' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'lab-value-map' })
  })

  it('maps REHABCODE field to rehab-code category', () => {
    const result = mapValidationToCategory({ field: 'REHABCODE' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'rehab-code' })
  })

  it('maps TYPEDIS field to chronic-status category', () => {
    const result = mapValidationToCategory({ field: 'TYPEDIS' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'chronic-status' })
  })

  it('maps INCOME field to charge-list category', () => {
    const result = mapValidationToCategory({ field: 'INCOME' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'charge-list' })
  })

  it('maps INJTYPE field to injury-type category', () => {
    const result = mapValidationToCategory({ field: 'INJTYPE' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'injury-type' })
  })

  it('maps VEHTYPE field to vehicle-type category', () => {
    const result = mapValidationToCategory({ field: 'VEHTYPE' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'vehicle-type' })
  })

  // ── Case-insensitive input ────────────────────────────────────────────────

  it('is case-insensitive for field names', () => {
    expect(mapValidationToCategory({ field: 'occupa' })).toEqual({ menu: 'basic-config', categoryKey: 'occupation' })
    expect(mapValidationToCategory({ field: 'Nation' })).toEqual({ menu: 'basic-config', categoryKey: 'race' })
  })

  // ── eclaim file context → eclaim categories ───────────────────────────────

  it('maps INSCL in eclaim file to eclaim-inscl', () => {
    const result = mapValidationToCategory({ field: 'INSCL', fileName: 'CLAIMOPD.TXT' })
    expect(result).toEqual({ menu: 'eclaim-config', categoryKey: 'eclaim-inscl' })
  })

  it('maps DRUGNAME in eclaim file to eclaim-drug-list', () => {
    const result = mapValidationToCategory({ field: 'DRUGNAME', fileName: 'CLAIMDT.TXT' })
    expect(result).toEqual({ menu: 'eclaim-config', categoryKey: 'eclaim-drug-list' })
  })

  it('maps ADPCODE in eclaim file to eclaim-charge', () => {
    const result = mapValidationToCategory({ field: 'ADPCODE', fileName: 'CLAIMST.TXT' })
    expect(result).toEqual({ menu: 'eclaim-config', categoryKey: 'eclaim-charge' })
  })

  // ── Unknown field → global-search (fallback) ─────────────────────────────

  it('returns global-search for an unknown uppercase field', () => {
    const result = mapValidationToCategory({ field: 'UNKNOWNFIELD' })
    expect(result).toEqual({ menu: 'global-search' })
  })

  it('returns global-search for another unknown field', () => {
    const result = mapValidationToCategory({ field: 'SOMECODE' })
    expect(result).toEqual({ menu: 'global-search' })
  })

  // ── null cases ────────────────────────────────────────────────────────────

  it('returns null for empty field', () => {
    expect(mapValidationToCategory({ field: '' })).toBeNull()
    expect(mapValidationToCategory({ field: '   ' })).toBeNull()
  })

  // ── Never invents a category key ─────────────────────────────────────────

  it('returns only known basic-config category keys', () => {
    const knownBasicKeys = new Set([
      'occupation', 'religion', 'race', 'marriage', 'insurance', 'department',
      'education', 'charge-list', 'person-kind', 'procedure', 'fp-method',
      'vaccine-prenatal', 'vaccine-0-1y', 'vaccine-1-5y', 'vaccine-school',
      'vaccine-all', 'chronic-status', 'accident-entry', 'injury-type',
      'urgency-level', 'rehab-code', 'pp-special-code', 'chronic-disease',
      'clinic', 'drug-list', 'drug-ned-reason', 'diagnosis-type',
      'accident-place', 'vehicle-type', 'service-entry', 'lab-value-map',
    ])
    const knownEclaimKeys = new Set([
      'eclaim-inscl', 'eclaim-marriage', 'eclaim-drug-list',
      'eclaim-charge', 'eclaim-clinic', 'eclaim-drug-ned',
    ])

    const testFields = [
      'OCCUPA', 'NATION', 'RELIGION', 'MARRIAGE', 'EDUCATE', 'TYPEAREA',
      'PTTYPE', 'SPCLTY', 'CLINIC', 'DIAGTYPE', 'OPER', 'FPTYPE',
      'VACCINE', 'URGENCY', 'OVSTIST', 'DRUGNAME', 'NED', 'LABCODE',
      'REHABCODE', 'TYPEDIS', 'INCOME', 'INJTYPE', 'VEHTYPE',
    ]

    for (const field of testFields) {
      const r = mapValidationToCategory({ field })
      if (r && r.categoryKey) {
        const isValid = knownBasicKeys.has(r.categoryKey) || knownEclaimKeys.has(r.categoryKey)
        expect(isValid).toBe(true)
      }
    }
  })

  // ── File+field override takes precedence ─────────────────────────────────

  it('uses file+field override when present', () => {
    const result = mapValidationToCategory({ field: 'PTTYPE', fileName: 'OPD.TXT' })
    expect(result).toEqual({ menu: 'basic-config', categoryKey: 'insurance' })
  })

  // ── Structural errors (no field context) → null ───────────────────────────

  it('returns null for whitespace-only field', () => {
    expect(mapValidationToCategory({ field: '\t\n' })).toBeNull()
  })
})
