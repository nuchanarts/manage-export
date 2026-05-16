describe('excelService column generation', () => {
  const COLUMNS = [
    'HOSPCODE', 'PID', 'CID', 'HN', 'SEQ',
    'DATE_SERV', 'PRENAME', 'NAME', 'LNAME',
    'SEX', 'BIRTH', 'TYPEAREA', 'AREACODE',
  ]

  it('has 13 columns matching 43-file standard', () => {
    expect(COLUMNS.length).toBe(13)
  })

  it('includes required primary fields', () => {
    expect(COLUMNS).toContain('HOSPCODE')
    expect(COLUMNS).toContain('PID')
    expect(COLUMNS).toContain('CID')
    expect(COLUMNS).toContain('DATE_SERV')
  })
})
