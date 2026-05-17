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

  it('pending entries have mapCol === pk (self-referential guard) — vacuously true after Task 1 made eclaim-drug-ned editable', () => {
    // After Task 1: eclaim-drug-ned moved to pending:false (pk=doctor_reason, mapCol=claim_control).
    // No pending entries remain in ECLAIM_REGISTRY; the loop is vacuously true.
    // The invariant is documented: if any new pending entry is added it must have mapCol === pk.
    const pendingEntries = ECLAIM_REGISTRY.filter(c => c.pending)
    for (const c of pendingEntries) {
      expect(c.mapCol).toBe(c.pk)
    }
  })

  it('non-pending entries have mapCol !== pk (safe to update)', () => {
    // All entries are now non-pending; each must have mapCol distinct from pk.
    // eclaim-drug-ned: pk=doctor_reason, mapCol=claim_control (distinct) — safe to update.
    const confirmed = ECLAIM_REGISTRY.filter(c => !c.pending)
    for (const c of confirmed) {
      expect(c.mapCol).not.toBe(c.pk)
    }
  })
})
