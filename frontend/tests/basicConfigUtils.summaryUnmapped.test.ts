import { summaryToUnmappedMap } from '../src/data/basicConfigUtils'

describe('summaryToUnmappedMap', () => {
  it('returns empty record for empty categories array', () => {
    expect(summaryToUnmappedMap([])).toEqual({})
  })

  it('includes entries where unmapped > 0 and not pending', () => {
    const result = summaryToUnmappedMap([
      { key: 'cat1', unmapped: 5, pending: false },
      { key: 'cat2', unmapped: 12, pending: false },
    ])
    expect(result).toEqual({ cat1: 5, cat2: 12 })
  })

  it('excludes entries where unmapped is 0', () => {
    const result = summaryToUnmappedMap([
      { key: 'cat1', unmapped: 0, pending: false },
      { key: 'cat2', unmapped: 3, pending: false },
    ])
    expect(result).toEqual({ cat2: 3 })
  })

  it('excludes pending categories (even if unmapped > 0)', () => {
    const result = summaryToUnmappedMap([
      { key: 'cat1', unmapped: 7, pending: true },
      { key: 'cat2', unmapped: 2, pending: false },
    ])
    expect(result).toEqual({ cat2: 2 })
  })

  it('treats null unmapped as 0 (excluded)', () => {
    const result = summaryToUnmappedMap([
      { key: 'cat1', unmapped: null, pending: false },
      { key: 'cat2', unmapped: 4, pending: false },
    ])
    expect(result).toEqual({ cat2: 4 })
  })

  it('treats undefined unmapped as 0 (excluded)', () => {
    const result = summaryToUnmappedMap([
      { key: 'cat1', pending: false },
      { key: 'cat2', unmapped: 1, pending: false },
    ])
    expect(result).toEqual({ cat2: 1 })
  })

  it('excludes both pending and zero-unmapped, includes only valid unmapped non-pending', () => {
    const result = summaryToUnmappedMap([
      { key: 'cat1', unmapped: 0, pending: false },
      { key: 'cat2', unmapped: 3, pending: true },
      { key: 'cat3', unmapped: null, pending: false },
      { key: 'cat4', unmapped: 8, pending: false },
      { key: 'cat5', unmapped: 1, pending: false },
    ])
    expect(result).toEqual({ cat4: 8, cat5: 1 })
  })
})
