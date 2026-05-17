import { DRUG_CATALOG_SQL, DRUG_CATALOG_COLUMNS, filterDrugRows } from '../../src/services/drugCatalog'

describe('DRUG_CATALOG_COLUMNS', () => {
  it('has exactly 21 entries', () => {
    expect(DRUG_CATALOG_COLUMNS).toHaveLength(21)
  })

  it('contains all expected key names in order', () => {
    const keys = DRUG_CATALOG_COLUMNS.map(c => c.key)
    expect(keys).toEqual([
      'HospDrugCode',
      'ProductCat',
      'TMTID',
      'SpecPrep',
      'GenericName',
      'TradeName',
      'DSFCode',
      'DosageForm',
      'Strength',
      'Content',
      'UnitPrice',
      'Distributor',
      'Manufacture',
      'NDC24',
      'ised',
      'Packsize',
      'Packprice',
      'Updateflag',
      'Datechange',
      'DateUpdate',
      'DateEffective',
    ])
  })

  it('every entry has a non-empty header string', () => {
    for (const col of DRUG_CATALOG_COLUMNS) {
      expect(typeof col.header).toBe('string')
      expect(col.header.length).toBeGreaterThan(0)
    }
  })
})

describe('DRUG_CATALOG_SQL', () => {
  it('is a non-empty string', () => {
    expect(typeof DRUG_CATALOG_SQL).toBe('string')
    expect(DRUG_CATALOG_SQL.length).toBeGreaterThan(0)
  })

  it('contains SELECT from drugitems', () => {
    expect(DRUG_CATALOG_SQL).toContain('drugitems d')
  })

  it('contains all 21 expected column aliases', () => {
    const aliases = [
      'HospDrugCode', 'ProductCat', 'TMTID', 'SpecPrep', 'GenericName',
      'TradeName', 'DSFCode', 'DosageForm', 'Strength', 'Content',
      'UnitPrice', 'Distributor', 'Manufacture', 'NDC24', 'ised',
      'Packsize', 'Packprice', 'Updateflag', 'Datechange', 'DateUpdate',
      'DateEffective',
    ]
    for (const alias of aliases) {
      expect(DRUG_CATALOG_SQL).toContain(alias)
    }
  })
})

describe('filterDrugRows', () => {
  const rows: Record<string, unknown>[] = [
    { HospDrugCode: 'D001', GenericName: 'Amoxicillin', TradeName: 'Amoxil', ProductCat: '01' },
    { HospDrugCode: 'D002', GenericName: 'Paracetamol', TradeName: 'Tylenol', ProductCat: '02' },
    { HospDrugCode: 'D003', GenericName: 'Ibuprofen', TradeName: 'Advil', ProductCat: '01' },
    { HospDrugCode: 'D004', GenericName: null, TradeName: null, ProductCat: '03' },
  ]

  it('empty query returns all rows', () => {
    expect(filterDrugRows(rows, '')).toEqual(rows)
  })

  it('whitespace-only query returns all rows', () => {
    expect(filterDrugRows(rows, '   ')).toEqual(rows)
  })

  it('matches on a string value (case-insensitive)', () => {
    const result = filterDrugRows(rows, 'amoxicillin')
    expect(result).toHaveLength(1)
    expect(result[0]!['HospDrugCode']).toBe('D001')
  })

  it('matches on partial substring', () => {
    const result = filterDrugRows(rows, 'para')
    expect(result).toHaveLength(1)
    expect(result[0]!['HospDrugCode']).toBe('D002')
  })

  it('is case-insensitive (uppercase query)', () => {
    const result = filterDrugRows(rows, 'TYLENOL')
    expect(result).toHaveLength(1)
    expect(result[0]!['HospDrugCode']).toBe('D002')
  })

  it('matches on any column (HospDrugCode)', () => {
    const result = filterDrugRows(rows, 'D003')
    expect(result).toHaveLength(1)
    expect(result[0]!['HospDrugCode']).toBe('D003')
  })

  it('matches multiple rows when query spans multiple', () => {
    const result = filterDrugRows(rows, '01')
    // ProductCat '01' matches D001 and D003; also matches HospDrugCode D001 partial
    // D001 has ProductCat '01' and HospDrugCode 'D001'
    // D003 has ProductCat '01'
    // Let's check at least 2 results
    expect(result.length).toBeGreaterThanOrEqual(2)
  })

  it('does not crash on null cell values', () => {
    expect(() => filterDrugRows(rows, 'anything')).not.toThrow()
  })

  it('returns empty array when no match', () => {
    const result = filterDrugRows(rows, 'zzz_no_match_xyz')
    expect(result).toHaveLength(0)
  })

  it('matches numeric values converted to string', () => {
    const withNum: Record<string, unknown>[] = [
      { HospDrugCode: 'X1', UnitPrice: 125.50 },
    ]
    const result = filterDrugRows(withNum, '125')
    expect(result).toHaveLength(1)
  })
})
