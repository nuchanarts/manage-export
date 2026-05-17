import {
  getEclaimCategory,
  listEclaimCategories,
  ECLAIM_REGISTRY,
} from '../../src/services/eclaimRegistry'

describe('eclaimRegistry — lookup', () => {
  it('getEclaimCategory returns a known entry (eclaim-inscl)', () => {
    const c = getEclaimCategory('eclaim-inscl')
    expect(c).toMatchObject({
      key: 'eclaim-inscl',
      table: 'pttype',
      pk: 'pttype',
      nameCol: 'name',
      mapCol: 'pttype_std_code',
      stdTable: 'nhso_inscl_code',
      stdCodeCol: 'inscl_code',
      stdNameCol: 'inscl_name',
      pending: false,
    })
  })

  it('getEclaimCategory returns a known entry (eclaim-charge)', () => {
    const c = getEclaimCategory('eclaim-charge')
    expect(c).toMatchObject({
      key: 'eclaim-charge',
      table: 'nondrugitems',
      pk: 'icode',
      mapCol: 'nhso_adp_code',
      stdTable: 'nhso_adp_code',
      stdCodeCol: 'nhso_adp_code',
      stdNameCol: 'nhso_adp_code_name',
      pending: false,
    })
  })

  it('getEclaimCategory returns undefined for unknown key', () => {
    expect(getEclaimCategory('not-a-real-eclaim-key')).toBeUndefined()
  })

  it('getEclaimCategory returns undefined for basic-config key', () => {
    // eclaim registry is separate — basic-config keys must not bleed in
    expect(getEclaimCategory('occupation')).toBeUndefined()
  })
})

describe('eclaimRegistry — list', () => {
  it('listEclaimCategories returns at least 6 entries', () => {
    expect(listEclaimCategories().length).toBeGreaterThanOrEqual(6)
  })

  it('every item has key, label, and boolean pending', () => {
    for (const c of listEclaimCategories()) {
      expect(c.key.length).toBeGreaterThan(0)
      expect(c.label.length).toBeGreaterThan(0)
      expect(typeof c.pending).toBe('boolean')
    }
  })

  it('covers all 6 required keys', () => {
    const keys = listEclaimCategories().map(c => c.key)
    const required = [
      'eclaim-inscl',
      'eclaim-marriage',
      'eclaim-clinic',
      'eclaim-drug-ned',
      'eclaim-drug-list',
      'eclaim-charge',
    ]
    for (const k of required) {
      expect(keys).toContain(k)
    }
  })
})

describe('eclaimRegistry — integrity', () => {
  const safe = /^[A-Za-z0-9_]+$/

  it('uses only safe identifiers in all fields', () => {
    for (const c of ECLAIM_REGISTRY) {
      for (const v of [c.table, c.pk, c.nameCol, c.mapCol, c.stdTable, c.stdCodeCol, c.stdNameCol]) {
        expect(v).toMatch(safe)
      }
    }
  })

  it('has unique keys', () => {
    const keys = ECLAIM_REGISTRY.map(c => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('eclaim-drug-ned is no longer pending (editable with 2-char stdRule, owner decision 2026-05-18)', () => {
    // eclaim-drug-ned was made editable again with stdRule { pattern: '^[A-Za-z0-9]{2}$' } as anti-wipe safeguard.
    // mapCol (claim_control) !== pk (doctor_reason) — satisfies the non-pending mapCol!==pk invariant.
    const entry = ECLAIM_REGISTRY.find(c => c.key === 'eclaim-drug-ned')
    expect(entry).toBeDefined()
    expect(entry!.pending).toBe(false)
    expect(entry!.stdRule).toBeDefined()
    expect(entry!.stdRule!.pattern).toBe('^[A-Za-z0-9]{2}$')
  })

  it('all entries have mapCol !== pk (all now non-pending and safe to update)', () => {
    // All entries in ECLAIM_REGISTRY are non-pending; mapCol must be distinct from pk for all.
    for (const c of ECLAIM_REGISTRY) {
      expect(c.mapCol).not.toBe(c.pk)
    }
  })
})

describe('eclaimRegistry — hideCodeCol flag', () => {
  it('getEclaimCategory("eclaim-drug-ned").hideCodeCol is true', () => {
    const c = getEclaimCategory('eclaim-drug-ned')
    expect(c).toBeDefined()
    expect(c!.hideCodeCol).toBe(true)
  })

  it('getEclaimCategory("eclaim-inscl").hideCodeCol is falsy (not set)', () => {
    const c = getEclaimCategory('eclaim-inscl')
    expect(c).toBeDefined()
    expect(c!.hideCodeCol).toBeFalsy()
  })

  it('only eclaim-drug-ned has hideCodeCol:true in ECLAIM_REGISTRY', () => {
    const withHide = ECLAIM_REGISTRY.filter(c => c.hideCodeCol)
    expect(withHide.length).toBe(1)
    expect(withHide[0]!.key).toBe('eclaim-drug-ned')
  })

  it('listEclaimCategories exposes hideCodeCol:true for eclaim-drug-ned', () => {
    const list = listEclaimCategories()
    const entry = list.find(c => c.key === 'eclaim-drug-ned')!
    expect(entry).toBeDefined()
    expect(entry.hideCodeCol).toBe(true)
  })

  it('listEclaimCategories does NOT include hideCodeCol for eclaim-inscl (additive — falsy/absent)', () => {
    const list = listEclaimCategories()
    const entry = list.find(c => c.key === 'eclaim-inscl')!
    expect(entry).toBeDefined()
    expect(entry.hideCodeCol).toBeFalsy()
  })
})
