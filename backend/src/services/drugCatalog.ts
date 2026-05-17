/**
 * Drug Catalog — fixed SQL constant, column definitions, and pure filter helper.
 * The SQL is owner-provided, static, and parameterless. Do NOT modify it.
 */

export const DRUG_CATALOG_SQL = `SELECT
    d.icode AS HospDrugCode,
    d.sks_product_category_id AS ProductCat,
    d.sks_drug_code AS TMTID,
    specprep AS SpecPrep,
    IFNULL(NULLIF(tc.active_ingredient, ''), d.generic_name) AS GenericName,
    IFNULL(NULLIF(tc.trade_Name, ''), d.trade_Name) AS TradeName,
    '' AS DSFCode,
    IFNULL(NULLIF(tc.dosage_form, ''), d.dosageform) AS DosageForm,
    IFNULL(NULLIF(tc.strength, ''), d.strength) AS Strength,
    TRIM(CONCAT(tc.cont_value,' ',tc.cont_unit,' ',tc.disp_unit)) AS Content,
    d.unitprice AS UnitPrice,
    dr.comp AS Distributor,
    IFNULL(NULLIF(tc.manufacturer, ''), dr.manufacturer) AS Manufacture,
    d.did AS NDC24,
    CASE WHEN d.drugaccount = '-' THEN 'N' WHEN d.drugaccount <> '' THEN 'E*' ELSE 'E' END AS ised,
    '' AS Packsize,
    '' AS Packprice,
    'A' AS Updateflag,
    CONCAT(CURDATE(), ' 00:00:00') AS Datechange,
    CONCAT(CURDATE(), ' 00:00:00') AS DateUpdate,
    CONCAT(CURDATE(), ' 00:00:00') AS DateEffective
FROM
    drugitems d
    LEFT JOIN tmt_tpu_code tc ON tc.tpu_code = d.sks_drug_code
    LEFT JOIN drugitems_register_unique dr ON dr.std_code = d.did
    LEFT JOIN provis_medication_unit p ON p.provis_medication_unit_code = d.provis_medication_unit_code
WHERE
    d.istatus = 'Y' and d.sks_drug_code <> '' AND d.income IN ('03', '17') and d.sks_drug_code is not null
ORDER BY
    d.sks_product_category_id, GenericName, d.sks_drug_code`

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

/** Case-insensitive contains filter over all string cell values. Empty query → all. */
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
