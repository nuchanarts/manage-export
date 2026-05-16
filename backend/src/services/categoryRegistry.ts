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

// All identifiers below come from CategoryDef (registry), never from request input.
function ident(name: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`unsafe identifier: ${name}`)
  return '`' + name + '`'
}

export function buildListSql(c: CategoryDef): string {
  const m = ident(c.table)
  const s = ident(c.stdTable)
  return (
    `SELECT ${m}.${ident(c.pk)} AS code, ` +
    `${m}.${ident(c.nameCol)} AS name, ` +
    `${m}.${ident(c.mapCol)} AS std_code, ` +
    `${s}.${ident(c.stdNameCol)} AS std_name, ` +
    `(${s}.${ident(c.stdCodeCol)} IS NOT NULL) AS mapped ` +
    `FROM ${m} ` +
    `LEFT JOIN ${s} ON ${m}.${ident(c.mapCol)} = ${s}.${ident(c.stdCodeCol)} ` +
    `ORDER BY ${m}.${ident(c.pk)}`
  )
}

export function buildStdOptionsSql(c: CategoryDef): string {
  return (
    `SELECT ${ident(c.stdCodeCol)} AS code, ${ident(c.stdNameCol)} AS name ` +
    `FROM ${ident(c.stdTable)} ORDER BY ${ident(c.stdCodeCol)}`
  )
}

export function buildUpdateSql(
  c: CategoryDef, code: string, stdCode: string
): { sql: string; params: (string | null)[] } {
  return {
    sql: `UPDATE ${ident(c.table)} SET ${ident(c.mapCol)} = ? WHERE ${ident(c.pk)} = ?`,
    params: [stdCode === '' ? null : stdCode, code],
  }
}
