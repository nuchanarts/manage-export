export interface CategoryDef {
  key: string        // url + query key, e.g. 'occupation'
  label: string      // Thai label shown in the menu
  table: string      // HIS master table
  pk: string         // PK / local code column
  nameCol: string    // local display-name column
  mapCol: string     // the ONLY writable column (local -> standard mapping)
  stdTable: string   // provis_* standard reference table
  stdCodeCol: string // standard code column in stdTable
  stdNameCol: string // standard name column in stdTable
  pending: boolean   // true = table/column not yet confirmed against the DB
}

// Confirmed against the live HOSxP `demo` schema probe (2026-05-16):
//   occupation(name, occupation, nhso_code)  -> provis_occupa(code, name)
//   religion(religion, name, nhso_code)      -> provis_religion(code, name)
export const CATEGORY_REGISTRY: CategoryDef[] = [
  { key: 'occupation', label: 'อาชีพ', table: 'occupation', pk: 'occupation',
    nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'provis_occupa', stdCodeCol: 'code', stdNameCol: 'name', pending: false },
  { key: 'religion', label: 'ศาสนา', table: 'religion', pk: 'religion',
    nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'provis_religion', stdCodeCol: 'code', stdNameCol: 'name', pending: false },
]

export function getCategory(key: string): CategoryDef | undefined {
  return CATEGORY_REGISTRY.find(c => c.key === key)
}

export function listCategories(): Pick<CategoryDef, 'key' | 'label' | 'pending'>[] {
  return CATEGORY_REGISTRY.map(({ key, label, pending }) => ({ key, label, pending }))
}
