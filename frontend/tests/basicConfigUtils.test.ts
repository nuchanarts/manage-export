import { isUnmapped, summarize, BasicRow } from '../src/data/basicConfigUtils'

const rows: BasicRow[] = [
  { code: '01', name: 'a', std_code: '0110', std_name: 'A', mapped: true },
  { code: '02', name: 'b', std_code: '',    std_name: null, mapped: false },
  { code: '03', name: 'c', std_code: null,  std_name: null, mapped: false },
]

describe('isUnmapped', () => {
  it('is true when std_code is empty/null or mapped is false', () => {
    expect(isUnmapped(rows[0])).toBe(false)
    expect(isUnmapped(rows[1])).toBe(true)
    expect(isUnmapped(rows[2])).toBe(true)
  })
})

describe('summarize', () => {
  it('counts total and unmapped', () => {
    expect(summarize(rows)).toEqual({ total: 3, unmapped: 2 })
  })
})
