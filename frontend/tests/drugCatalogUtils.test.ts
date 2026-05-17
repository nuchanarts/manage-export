import { DRUG_CATALOG_COLUMNS, filterDrugRows } from '../src/data/drugCatalogUtils'

describe('DRUG_CATALOG_COLUMNS (frontend)', () => {
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

describe('filterDrugRows (frontend)', () => {
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

  it('matches on string value (case-insensitive)', () => {
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

  it('matches on HospDrugCode column', () => {
    const result = filterDrugRows(rows, 'D003')
    expect(result).toHaveLength(1)
    expect(result[0]!['HospDrugCode']).toBe('D003')
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
