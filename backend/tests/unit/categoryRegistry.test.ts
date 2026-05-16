import { getCategory, listCategories, CATEGORY_REGISTRY } from '../../src/services/categoryRegistry'

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
    expect(list.length).toBeGreaterThanOrEqual(2)
    for (const c of list) {
      expect(c.key.length).toBeGreaterThan(0)
      expect(c.label.length).toBeGreaterThan(0)
      expect(typeof c.pending).toBe('boolean')
    }
  })
})
