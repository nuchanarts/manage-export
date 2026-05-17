import { KB, KbEntry, searchKb, kbCategories } from '../src/data/knowledge'

describe('KB data integrity', () => {
  it('has at least 20 entries', () => {
    expect(KB.length).toBeGreaterThanOrEqual(20)
  })

  it('every entry has non-empty id, category, q, a', () => {
    for (const entry of KB) {
      expect(entry.id.trim().length).toBeGreaterThan(0)
      expect(entry.category.trim().length).toBeGreaterThan(0)
      expect(entry.q.trim().length).toBeGreaterThan(0)
      expect(entry.a.trim().length).toBeGreaterThan(0)
    }
  })

  it('every entry id is unique', () => {
    const ids = KB.map(e => e.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(KB.length)
  })
})

describe('searchKb', () => {
  it('empty string returns all entries', () => {
    const result = searchKb('')
    expect(result).toHaveLength(KB.length)
  })

  it('whitespace-only query returns all entries', () => {
    const result = searchKb('   ')
    expect(result).toHaveLength(KB.length)
  })

  it('case-insensitive match on question (Thai)', () => {
    // Every entry question contains Thai text; search by a substring in q
    const sampleEntry = KB[0]!
    const qWord = sampleEntry.q.slice(0, 4)
    const result = searchKb(qWord)
    expect(result.some(e => e.id === sampleEntry.id)).toBe(true)
  })

  it('matches on category', () => {
    const categories = kbCategories(KB)
    const firstCat = categories[0]!
    const inCategory = KB.filter(e => e.category === firstCat)
    const result = searchKb(firstCat)
    // All entries in that category should appear in results
    for (const entry of inCategory) {
      expect(result.some(e => e.id === entry.id)).toBe(true)
    }
  })

  it('matches on keyword when keyword matches', () => {
    // Find an entry that has keywords defined
    const entryWithKeyword = KB.find(e => e.keywords && e.keywords.length > 0)
    if (!entryWithKeyword) return // skip if no keywords used
    const keyword = entryWithKeyword.keywords![0]!
    const result = searchKb(keyword)
    expect(result.some(e => e.id === entryWithKeyword.id)).toBe(true)
  })

  it('matches on answer text (Thai substring)', () => {
    // Search for a substring from the first entry answer
    const sampleEntry = KB[0]!
    const aWord = sampleEntry.a.slice(0, 5)
    const result = searchKb(aWord)
    expect(result.some(e => e.id === sampleEntry.id)).toBe(true)
  })

  it('returns empty array for a query that matches nothing', () => {
    const result = searchKb('zzzzzXXXXnotfound9999')
    expect(result).toHaveLength(0)
  })

  it('search for "pending" finds entries about pending', () => {
    const result = searchKb('pending')
    // There should be at least one entry about pending
    expect(result.length).toBeGreaterThan(0)
  })

  it('search for "PERSON" finds entries about PERSON file', () => {
    const result = searchKb('PERSON')
    expect(result.length).toBeGreaterThan(0)
  })

  it('search is case-insensitive for Latin text', () => {
    const resultLower = searchKb('person')
    const resultUpper = searchKb('PERSON')
    expect(resultLower).toHaveLength(resultUpper.length)
  })

  it('search for "mapping" or "map" finds relevant entries', () => {
    const result = searchKb('map')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('kbCategories', () => {
  it('returns distinct categories', () => {
    const cats = kbCategories(KB)
    const uniqueCats = new Set(cats)
    expect(uniqueCats.size).toBe(cats.length)
  })

  it('preserves first-seen order', () => {
    const cats = kbCategories(KB)
    // Verify no duplicates and all categories appear
    const seenInOrder: string[] = []
    for (const entry of KB) {
      if (!seenInOrder.includes(entry.category)) {
        seenInOrder.push(entry.category)
      }
    }
    expect(cats).toEqual(seenInOrder)
  })

  it('returns all categories present in the KB', () => {
    const cats = kbCategories(KB)
    const allCats = new Set(KB.map(e => e.category))
    expect(cats.length).toBe(allCats.size)
  })

  it('works with a custom filtered array', () => {
    const subset = KB.slice(0, 5)
    const cats = kbCategories(subset)
    const expected = new Set(subset.map(e => e.category))
    expect(cats.length).toBe(expected.size)
  })
})
