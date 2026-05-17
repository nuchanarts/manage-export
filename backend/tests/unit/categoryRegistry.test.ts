import { getCategory, listCategories, CATEGORY_REGISTRY } from '../../src/services/categoryRegistry'
import { buildListSql, buildStdOptionsSql, buildUpdateSql, buildStdOptionsSql2, buildUpdateSql2 } from '../../src/services/categoryRegistry'

describe('category registry', () => {
  it('has occupation fully configured and confirmed', () => {
    const occ = getCategory('occupation')
    expect(occ).toMatchObject({
      key: 'occupation', table: 'occupation', pk: 'occupation',
      nameCol: 'name', mapCol: 'nhso_code',
      stdTable: 'provis_occupa', stdCodeCol: 'code', stdNameCol: 'name',
      pending: false,
    })
  })

  it('returns undefined for an unknown category', () => {
    expect(getCategory('not-a-real-category')).toBeUndefined()
  })

  it('lists every category with key + label', () => {
    const list = listCategories()
    expect(list.length).toBeGreaterThanOrEqual(30)
    for (const c of list) {
      expect(c.key.length).toBeGreaterThan(0)
      expect(c.label.length).toBeGreaterThan(0)
      expect(typeof c.pending).toBe('boolean')
    }
  })
})

describe('SQL builders', () => {
  const occ = getCategory('occupation')!

  it('buildListSql uses correlated subqueries (no LEFT JOIN) and flags mapped', () => {
    const sql = buildListSql(occ)
    // Master table is the FROM target
    expect(sql).toContain('FROM `occupation`')
    // No LEFT JOIN — uses correlated subqueries instead
    expect(sql).not.toContain('LEFT JOIN')
    // Primary mapping column backtick-quoted via ident()
    expect(sql).toContain('`nhso_code`')
    // std_name resolved via correlated SELECT … LIMIT 1
    expect(sql).toContain('LIMIT 1) AS std_name')
    // mapped resolved via EXISTS(…)
    expect(sql).toContain('EXISTS(SELECT 1 FROM `provis_occupa`')
    // Required output aliases present
    expect(sql).toContain('AS std_code,')
    expect(sql).toContain('AS std_name,')
    expect(sql).toContain('AS mapped')
    // ORDER BY present
    expect(sql).toContain('ORDER BY')
    // Single statement; no stacked queries
    expect(sql).not.toMatch(/;\s*\S/)
  })

  it('buildStdOptionsSql selects code+name from the provis table', () => {
    const sql = buildStdOptionsSql(occ)
    expect(sql).toContain('FROM `provis_occupa`')
    expect(sql).toContain('`code`')
    expect(sql).toContain('`name`')
  })

  it('buildUpdateSql writes only the mapping column, parameterized by PK', () => {
    const { sql, params } = buildUpdateSql(occ, '05', '0510')
    expect(sql).toBe('UPDATE `occupation` SET `nhso_code` = ? WHERE `occupation` = ?')
    expect(params).toEqual(['0510', '05'])
  })
})

describe('buildExistsSql', () => {
  it('returns a parameterized SELECT 1 through ident() allow-list for occupation', () => {
    const { buildExistsSql } = require('../../src/services/categoryRegistry')
    const occ = getCategory('occupation')!
    expect(buildExistsSql(occ)).toBe(
      'SELECT 1 FROM `occupation` WHERE `occupation` = ? LIMIT 1'
    )
  })
})

describe('registry integrity', () => {
  it('uses only safe identifiers everywhere', () => {
    const safe = /^[A-Za-z0-9_]+$/
    for (const c of CATEGORY_REGISTRY) {
      for (const v of [c.table, c.pk, c.nameCol, c.mapCol, c.stdTable, c.stdCodeCol, c.stdNameCol]) {
        expect(v).toMatch(safe)
      }
      // also validate optional dual-field identifiers when present
      if (c.mapCol2)      expect(c.mapCol2).toMatch(safe)
      if (c.stdTable2)    expect(c.stdTable2).toMatch(safe)
      if (c.stdCodeCol2)  expect(c.stdCodeCol2).toMatch(safe)
      if (c.stdNameCol2)  expect(c.stdNameCol2).toMatch(safe)
    }
  })

  it('has unique keys', () => {
    const keys = CATEGORY_REGISTRY.map(c => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('dual-field clinic category', () => {
  const clinic = getCategory('clinic')!

  it('clinic entry is non-pending and dual (mapCol2 set)', () => {
    expect(clinic).toBeDefined()
    expect(clinic.pending).toBe(false)
    expect(clinic.mapCol2).toBe('oapp_activity_id')
    expect(clinic.stdTable2).toBe('oapp_activity')
    expect(clinic.stdCodeCol2).toBe('oapp_activity_id')
    expect(clinic.stdNameCol2).toBe('oapp_activity_name')
    expect(clinic.field1Label).toBe('ประเภทโรค')
    expect(clinic.field2Label).toBe('ประเภทกิจกรรม')
  })

  it('clinic primary mapping is icd10 -> icd101', () => {
    expect(clinic.mapCol).toBe('icd10')
    expect(clinic.stdTable).toBe('icd101')
    expect(clinic.stdCodeCol).toBe('code')
    expect(clinic.stdNameCol).toBe('name')
  })

  it('buildListSql for a dual category includes std_code2/std_name2 as correlated subqueries', () => {
    const sql = buildListSql(clinic)
    // Secondary alias present
    expect(sql).toContain('std_code2')
    expect(sql).toContain('std_name2')
    // Secondary correlated subquery references oapp_activity
    expect(sql).toContain('FROM `oapp_activity`')
    // Primary correlated subquery references icd101
    expect(sql).toContain('FROM `icd101`')
    // Master table is FROM target (no LEFT JOIN)
    expect(sql).toContain('FROM `clinic`')
    expect(sql).not.toContain('LEFT JOIN')
    // ORDER BY present
    expect(sql).toContain('ORDER BY')
    // Single statement
    expect(sql).not.toMatch(/;\s*\S/)
  })

  it('buildListSql dual still has std_code/std_name/mapped from primary', () => {
    const sql = buildListSql(clinic)
    expect(sql).toContain('AS std_code,')
    expect(sql).toContain('AS std_name,')
    expect(sql).toContain('AS mapped')
  })

  it('buildStdOptionsSql2 returns the field2 query for oapp_activity', () => {
    const sql = buildStdOptionsSql2(clinic)
    expect(sql).toContain('FROM `oapp_activity`')
    expect(sql).toContain('`oapp_activity_id`')
    expect(sql).toContain('`oapp_activity_name`')
    // selects as code and name
    expect(sql).toContain('AS code')
    expect(sql).toContain('AS name')
  })

  it('buildUpdateSql2 writes oapp_activity_id parameterized by pk', () => {
    const { sql, params } = buildUpdateSql2(clinic, 'CLI01', 'ACT99')
    expect(sql).toBe('UPDATE `clinic` SET `oapp_activity_id` = ? WHERE `clinic` = ?')
    expect(params).toEqual(['ACT99', 'CLI01'])
  })

  it('buildUpdateSql2 converts empty string to null (clear mapping)', () => {
    const { sql, params } = buildUpdateSql2(clinic, 'CLI01', '')
    expect(params[0]).toBeNull()
    expect(params[1]).toBe('CLI01')
  })

  it('listCategories includes dual:true and labels for clinic', () => {
    const list = listCategories()
    const entry = list.find(c => c.key === 'clinic')!
    expect(entry).toBeDefined()
    expect((entry as any).dual).toBe(true)
    expect((entry as any).field1Label).toBe('ประเภทโรค')
    expect((entry as any).field2Label).toBe('ประเภทกิจกรรม')
  })

  it('listCategories has dual:false for single-field categories', () => {
    const list = listCategories()
    const occ = list.find(c => c.key === 'occupation')!
    expect((occ as any).dual).toBe(false)
  })
})
