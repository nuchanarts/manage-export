/**
 * Pure frontend helpers for the Drug Catalog page.
 * Mirrors the backend filterDrugRows logic; dependency-free.
 */

export const DRUG_CATALOG_COLUMNS: { key: string; header: string }[] = [
  { key: 'HospDrugCode', header: 'HospDrugCode' },
  { key: 'ProductCat',   header: 'ProductCat' },
  { key: 'TMTID',        header: 'TMTID' },
  { key: 'SpecPrep',     header: 'SpecPrep' },
  { key: 'GenericName',  header: 'GenericName' },
  { key: 'TradeName',    header: 'TradeName' },
  { key: 'DSFCode',      header: 'DSFCode' },
  { key: 'DosageForm',   header: 'DosageForm' },
  { key: 'Strength',     header: 'Strength' },
  { key: 'Content',      header: 'Content' },
  { key: 'UnitPrice',    header: 'UnitPrice' },
  { key: 'Distributor',  header: 'Distributor' },
  { key: 'Manufacture',  header: 'Manufacture' },
  { key: 'NDC24',        header: 'NDC24' },
  { key: 'ised',         header: 'ised' },
  { key: 'Packsize',     header: 'Packsize' },
  { key: 'Packprice',    header: 'Packprice' },
  { key: 'Updateflag',   header: 'Updateflag' },
  { key: 'Datechange',   header: 'Datechange' },
  { key: 'DateUpdate',   header: 'DateUpdate' },
  { key: 'DateEffective', header: 'DateEffective' },
]

/** Case-insensitive substring filter over all string/number cell values. Empty query → all rows. */
export function filterDrugRows(rows: Record<string, unknown>[], q: string): Record<string, unknown>[] {
  const query = q.trim().toLowerCase()
  if (!query) return rows
  return rows.filter(row =>
    Object.values(row).some(v => {
      if (v == null) return false
      if (typeof v === 'string') return v.toLowerCase().includes(query)
      return String(v).toLowerCase().includes(query)
    }),
  )
}
