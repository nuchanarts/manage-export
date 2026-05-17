import { filterRows, BasicRow } from '../src/data/basicConfigUtils'

const rows: BasicRow[] = [
  { code: 'A01', name: 'เกษตรกร', std_code: '0101', std_name: 'Farmer', mapped: true },
  { code: 'B02', name: 'แพทย์', std_code: '0202', std_name: 'Doctor', mapped: true },
  { code: 'C03', name: 'พยาบาล', std_code: null, std_name: null, mapped: false },
  {
    code: 'D04', name: 'คลินิกเบาหวาน', std_code: 'E11', std_name: 'Diabetes clinic',
    std_code2: 'ACT01', std_name2: 'กิจกรรมทั่วไป', mapped: true,
  },
  { code: 'E05', name: 'Unrelated', std_code: 'ZZZ', std_name: 'ไม่ตรง', mapped: true },
]

describe('filterRows', () => {
  it('empty query returns all rows', () => {
    expect(filterRows(rows, '')).toEqual(rows)
    expect(filterRows(rows, '  ')).toEqual(rows)
  })

  it('matches on code (case-insensitive)', () => {
    const result = filterRows(rows, 'a01')
    expect(result).toHaveLength(1)
    expect(result[0]!.code).toBe('A01')
  })

  it('matches on name (Thai, case-insensitive via normalizeName)', () => {
    const result = filterRows(rows, 'แพทย์')
    expect(result).toHaveLength(1)
    expect(result[0]!.code).toBe('B02')
  })

  it('matches on std_code', () => {
    const result = filterRows(rows, '0202')
    expect(result).toHaveLength(1)
    expect(result[0]!.code).toBe('B02')
  })

  it('matches on std_name', () => {
    const result = filterRows(rows, 'doctor')
    expect(result).toHaveLength(1)
    expect(result[0]!.code).toBe('B02')
  })

  it('matches on std_code2', () => {
    const result = filterRows(rows, 'ACT01')
    expect(result).toHaveLength(1)
    expect(result[0]!.code).toBe('D04')
  })

  it('matches on std_name2 (Thai)', () => {
    const result = filterRows(rows, 'กิจกรรมทั่วไป')
    expect(result).toHaveLength(1)
    expect(result[0]!.code).toBe('D04')
  })

  it('no match returns empty array', () => {
    const result = filterRows(rows, 'xxxxnotfound')
    expect(result).toHaveLength(0)
  })

  it('query matching null std_code/std_name does not crash', () => {
    // C03 has null std_code and std_name; querying 'พยาบาล' matches on name only
    const result = filterRows(rows, 'พยาบาล')
    expect(result).toHaveLength(1)
    expect(result[0]!.code).toBe('C03')
  })

  it('partial match on name returns correct subset', () => {
    // 'คลินิก' should match 'คลินิกเบาหวาน'
    const result = filterRows(rows, 'คลินิก')
    expect(result).toHaveLength(1)
    expect(result[0]!.code).toBe('D04')
  })
})
