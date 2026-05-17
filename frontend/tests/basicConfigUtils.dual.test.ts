import { isDualRow, BasicRow } from '../src/data/basicConfigUtils'

const singleRow: BasicRow = { code: '01', name: 'a', std_code: 'X', std_name: 'A', mapped: true }
const dualRow: BasicRow = { code: '02', name: 'b', std_code: 'X', std_name: 'A', mapped: true, std_code2: 'Y', std_name2: 'B' }
const dualRowNullField2: BasicRow = { code: '03', name: 'c', std_code: null, std_name: null, mapped: false, std_code2: null, std_name2: null }

describe('isDualRow', () => {
  it('returns false for a row without std_code2 key', () => {
    expect(isDualRow(singleRow)).toBe(false)
  })

  it('returns true for a row that has std_code2 key (even if null)', () => {
    expect(isDualRow(dualRow)).toBe(true)
    expect(isDualRow(dualRowNullField2)).toBe(true)
  })
})
