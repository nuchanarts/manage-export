import { NHSO_LINKS, searchLinks, groupByCategory } from '../src/data/nhsoLinks'

describe('NHSO_LINKS data', () => {
  it('every link has a name, an https url, and a category', () => {
    expect(NHSO_LINKS.length).toBeGreaterThan(30)
    for (const link of NHSO_LINKS) {
      expect(link.name.trim().length).toBeGreaterThan(0)
      expect(link.url).toMatch(/^https?:\/\//)
      expect(link.category.trim().length).toBeGreaterThan(0)
    }
  })

  it('flags the reimbursement (เบิกจ่ายชดเชย) link as revenue-related', () => {
    const eclaim = NHSO_LINKS.find(l => l.url === 'https://eclaim.nhso.go.th/webComponent/')
    expect(eclaim).toBeDefined()
    expect(eclaim!.revenue).toBe(true)
  })
})

describe('searchLinks', () => {
  it('returns all links when query is empty or whitespace', () => {
    expect(searchLinks('')).toHaveLength(NHSO_LINKS.length)
    expect(searchLinks('   ')).toHaveLength(NHSO_LINKS.length)
  })

  it('matches link name case-insensitively', () => {
    const results = searchLinks('e-claim')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every(l => l.name.toLowerCase().includes('e-claim'))).toBe(true)
  })

  it('returns an empty array when nothing matches', () => {
    expect(searchLinks('zzz-no-such-service-zzz')).toEqual([])
  })
})

describe('groupByCategory', () => {
  it('groups links and lists revenue-related categories first', () => {
    const groups = groupByCategory(NHSO_LINKS)
    expect(groups.length).toBeGreaterThan(1)

    const firstNonRevenue = groups.findIndex(g => !g.revenue)
    const lastRevenue = groups.map(g => g.revenue).lastIndexOf(true)
    // every revenue group comes before every non-revenue group
    expect(lastRevenue).toBeLessThan(firstNonRevenue === -1 ? Infinity : firstNonRevenue)

    // no link is lost during grouping
    const total = groups.reduce((n, g) => n + g.links.length, 0)
    expect(total).toBe(NHSO_LINKS.length)
  })
})
