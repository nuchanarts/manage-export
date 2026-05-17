import { getCategory, listCategories, CATEGORY_REGISTRY } from '../../src/services/categoryRegistry'
import { buildListSql, buildStdOptionsSql, buildUpdateSql, buildStdOptionsSql2, buildUpdateSql2, buildStdOptionsSqlExtra, buildUpdateSqlExtra } from '../../src/services/categoryRegistry'
import type { CategoryDef } from '../../src/services/categoryRegistry'

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

// ─── extraFields (N-field mapping) ────────────────────────────────────────────
describe('extraFields — buildListSql', () => {
  // A synthetic category with two extra fields: one with stdTable, one free-value
  const catWithExtra: CategoryDef = {
    key: 'test-extra',
    label: 'Test Extra',
    table: 'nondrugitems',
    pk: 'icode',
    nameCol: 'name',
    mapCol: 'nhso_adp_code',
    stdTable: 'nhso_adp_code',
    stdCodeCol: 'nhso_adp_code',
    stdNameCol: 'nhso_adp_code_name',
    pending: false,
    extraFields: [
      { mapCol: 'billcode', label: 'Bill code' },  // free-value: no stdTable
      {
        mapCol: 'nhso_adp_type_id', label: 'ADP type',
        stdTable: 'nhso_adp_type', stdCodeCol: 'nhso_adp_type_id', stdNameCol: 'nhso_adp_type_name',
      },
    ],
  }

  it('includes std_code_e0 alias for first extra field', () => {
    const sql = buildListSql(catWithExtra)
    expect(sql).toContain('AS std_code_e0')
  })

  it('includes std_code_e1 alias for second extra field', () => {
    const sql = buildListSql(catWithExtra)
    expect(sql).toContain('AS std_code_e1')
  })

  it('does NOT include a correlated subquery for a free-value extra field (no stdTable)', () => {
    const sql = buildListSql(catWithExtra)
    // No std_name_e0 because billcode has no stdTable
    expect(sql).not.toContain('std_name_e0')
  })

  it('includes correlated subquery std_name_e1 when stdTable is present', () => {
    const sql = buildListSql(catWithExtra)
    expect(sql).toContain('AS std_name_e1')
    expect(sql).toContain('FROM `nhso_adp_type`')
  })

  it('uses unique aliases sE0, sE1 for extra subquery aliases', () => {
    const sql = buildListSql(catWithExtra)
    // The correlated subquery for index 1 uses alias sE1
    expect(sql).toContain('sE1')
    // Should not accidentally mix up aliases
    expect(sql).not.toContain('sE0')  // no subquery for free-value index 0
  })

  it('is still a single statement (no semicolons mid-query)', () => {
    const sql = buildListSql(catWithExtra)
    expect(sql).not.toMatch(/;\s*\S/)
  })

  it('does not include extra aliases when extraFields is absent (single-field category)', () => {
    const sql = buildListSql(getCategory('occupation')!)
    expect(sql).not.toContain('std_code_e')
    expect(sql).not.toContain('std_name_e')
  })

  it('does not include extra aliases when extraFields is absent (dual-field category)', () => {
    const sql = buildListSql(getCategory('clinic')!)
    expect(sql).not.toContain('std_code_e')
    expect(sql).not.toContain('std_name_e')
  })
})

describe('extraFields — buildStdOptionsSqlExtra', () => {
  const catFree: CategoryDef = {
    key: 'test-free',
    label: 'Test Free',
    table: 'nondrugitems',
    pk: 'icode',
    nameCol: 'name',
    mapCol: 'billcode',
    stdTable: 'nhso_adp_code',
    stdCodeCol: 'nhso_adp_code',
    stdNameCol: 'nhso_adp_code_name',
    pending: false,
    extraFields: [
      { mapCol: 'billcode', label: 'Bill code' },  // index 0: free-value
      {
        mapCol: 'nhso_adp_type_id', label: 'ADP type',
        stdTable: 'nhso_adp_type', stdCodeCol: 'nhso_adp_type_id', stdNameCol: 'nhso_adp_type_name',
      },  // index 1: has std reference
    ],
  }

  it('returns null for a free-value extra field (no stdTable)', () => {
    const result = buildStdOptionsSqlExtra(catFree, 0)
    expect(result).toBeNull()
  })

  it('returns a SELECT sql for an extra field that has stdTable', () => {
    const sql = buildStdOptionsSqlExtra(catFree, 1)
    expect(sql).not.toBeNull()
    expect(sql).toContain('FROM `nhso_adp_type`')
    expect(sql).toContain('AS code')
    expect(sql).toContain('AS name')
    expect(sql).toContain('ORDER BY')
  })

  it('returns null for an out-of-range index', () => {
    const result = buildStdOptionsSqlExtra(catFree, 99)
    expect(result).toBeNull()
  })

  it('returns null when extraFields is absent', () => {
    const result = buildStdOptionsSqlExtra(getCategory('occupation')!, 0)
    expect(result).toBeNull()
  })
})

describe('extraFields — buildUpdateSqlExtra', () => {
  const catExtra: CategoryDef = {
    key: 'test-update-extra',
    label: 'Test',
    table: 'nondrugitems',
    pk: 'icode',
    nameCol: 'name',
    mapCol: 'nhso_adp_code',
    stdTable: 'nhso_adp_code',
    stdCodeCol: 'nhso_adp_code',
    stdNameCol: 'nhso_adp_code_name',
    pending: false,
    extraFields: [
      { mapCol: 'billcode', label: 'Bill code' },
      { mapCol: 'sks_coverage_price', label: 'SKS coverage price' },
    ],
  }

  it('builds correct UPDATE for extra field index 0', () => {
    const { sql, params } = buildUpdateSqlExtra(catExtra, 0, 'I001', 'BC99')
    expect(sql).toBe('UPDATE `nondrugitems` SET `billcode` = ? WHERE `icode` = ?')
    expect(params).toEqual(['BC99', 'I001'])
  })

  it('builds correct UPDATE for extra field index 1', () => {
    const { sql, params } = buildUpdateSqlExtra(catExtra, 1, 'I001', '150.00')
    expect(sql).toBe('UPDATE `nondrugitems` SET `sks_coverage_price` = ? WHERE `icode` = ?')
    expect(params).toEqual(['150.00', 'I001'])
  })

  it('converts empty string value to null (clear mapping)', () => {
    const { params } = buildUpdateSqlExtra(catExtra, 0, 'I001', '')
    expect(params[0]).toBeNull()
  })

  it('throws for out-of-range index', () => {
    expect(() => buildUpdateSqlExtra(catExtra, 99, 'I001', 'X')).toThrow()
  })

  it('throws when extraFields is absent', () => {
    expect(() => buildUpdateSqlExtra(getCategory('occupation')!, 0, 'X', 'Y')).toThrow()
  })
})

describe('extraFields — registry integrity for extraFields', () => {
  const safe = /^[A-Za-z0-9_]+$/

  it('all extraField mapCols in CATEGORY_REGISTRY are safe identifiers', () => {
    for (const c of CATEGORY_REGISTRY) {
      for (const ef of c.extraFields ?? []) {
        expect(ef.mapCol).toMatch(safe)
        if (ef.stdTable)    expect(ef.stdTable).toMatch(safe)
        if (ef.stdCodeCol)  expect(ef.stdCodeCol).toMatch(safe)
        if (ef.stdNameCol)  expect(ef.stdNameCol).toMatch(safe)
      }
    }
  })
})

describe('hideCodeCol flag', () => {
  it('getCategory("drug-ned-reason").hideCodeCol is true', () => {
    const c = getCategory('drug-ned-reason')
    expect(c).toBeDefined()
    expect(c!.hideCodeCol).toBe(true)
  })

  it('getCategory("occupation").hideCodeCol is falsy (not set)', () => {
    const c = getCategory('occupation')
    expect(c).toBeDefined()
    expect(c!.hideCodeCol).toBeFalsy()
  })

  it('getCategory("clinic").hideCodeCol is falsy (not set)', () => {
    const c = getCategory('clinic')
    expect(c).toBeDefined()
    expect(c!.hideCodeCol).toBeFalsy()
  })

  it('listCategories exposes hideCodeCol:true for drug-ned-reason', () => {
    const list = listCategories()
    const entry = list.find(c => c.key === 'drug-ned-reason')!
    expect(entry).toBeDefined()
    expect(entry.hideCodeCol).toBe(true)
  })

  it('listCategories does NOT include hideCodeCol for occupation (additive — falsy/absent)', () => {
    const list = listCategories()
    const entry = list.find(c => c.key === 'occupation')!
    expect(entry).toBeDefined()
    expect(entry.hideCodeCol).toBeFalsy()
  })

  it('only drug-ned-reason has hideCodeCol:true in the entire CATEGORY_REGISTRY', () => {
    const withHide = CATEGORY_REGISTRY.filter(c => c.hideCodeCol)
    expect(withHide.length).toBe(1)
    expect(withHide[0]!.key).toBe('drug-ned-reason')
  })
})
