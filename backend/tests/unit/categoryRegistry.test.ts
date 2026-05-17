import { getCategory, listCategories, CATEGORY_REGISTRY } from '../../src/services/categoryRegistry'
import { buildListSql, buildStdOptionsSql, buildUpdateSql } from '../../src/services/categoryRegistry'

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

  it('buildListSql LEFT JOINs the standard table and flags mapped', () => {
    const sql = buildListSql(occ)
    expect(sql).toContain('FROM `occupation`')
    expect(sql).toContain('LEFT JOIN `provis_occupa`')
    expect(sql).toContain('`occupation`.`nhso_code`')
    expect(sql).not.toMatch(/;\s*\S/) // single statement, no stacked queries
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
    }
  })

  it('has unique keys', () => {
    const keys = CATEGORY_REGISTRY.map(c => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
