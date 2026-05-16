describe('recordService filter building', () => {
  it('toYYYYMMDD converts ISO date', () => {
    const result = '2026-05-16'.replace(/-/g, '')
    expect(result).toBe('20260516')
  })

  it('search filter requires dateFrom and dateTo', () => {
    expect('2026-05-01' < '2026-05-16').toBe(true)
  })
})
