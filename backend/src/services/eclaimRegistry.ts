import {
  CategoryDef,
  CategoryListItem,
  buildListSql,
  buildStdOptionsSql,
  buildUpdateSql,
  buildExistsSql,
} from './categoryRegistry'

// Re-export the builders so callers of eclaimRegistry can import them from one place
export { buildListSql, buildStdOptionsSql, buildUpdateSql, buildExistsSql }

// Confirmed against the live HOSxP `demo` schema probe (2026-05-17).
// pending:false  = master table, pk, nameCol, mapCol, stdTable, stdCodeCol, stdNameCol
//                  all verified via SHOW COLUMNS + sample in the probe script.
// pending:true   = mapCol === pk, or no external std join is possible.
export const ECLAIM_REGISTRY: CategoryDef[] = [
  // ── CONFIRMED (pending: false) ───────────────────────────────────────────────
  // pttype(pttype PK, name, pttype_std_code) -> nhso_inscl_code(inscl_code, inscl_name)
  // pttype_std_code is distinct from pk 'pttype'; schema valid; data NULL in demo (operator populates)
  // [verified 2026-05-17]
  { key: 'eclaim-inscl', label: 'สิทธิการรักษา',
    table: 'pttype', pk: 'pttype', nameCol: 'name', mapCol: 'pttype_std_code',
    stdTable: 'nhso_inscl_code', stdCodeCol: 'inscl_code', stdNameCol: 'inscl_name',
    pending: false },

  // marrystatus(code PK, name, nhso_marriage_code) -> nhso_marriage(nhso_marriage_code, nhso_marriage_name)
  // [verified 2026-05-17; same tables as basic-config 'marriage']
  { key: 'eclaim-marriage', label: 'สถานะสมรส',
    table: 'marrystatus', pk: 'code', nameCol: 'name', mapCol: 'nhso_marriage_code',
    stdTable: 'nhso_marriage', stdCodeCol: 'nhso_marriage_code', stdNameCol: 'nhso_marriage_name',
    pending: false },

  // drugitems(icode PK, name, tmt_tp_code) -> tmt_tp_code(tp_code, tp_name)
  // [verified 2026-05-17; same tables as basic-config 'drug-list'; tmt_tp_code distinct from pk icode]
  { key: 'eclaim-drug-list', label: 'รายการยา',
    table: 'drugitems', pk: 'icode', nameCol: 'name', mapCol: 'tmt_tp_code',
    stdTable: 'tmt_tp_code', stdCodeCol: 'tp_code', stdNameCol: 'tp_name',
    pending: false },

  // nondrugitems(icode PK, name, nhso_adp_code) -> nhso_adp_code(nhso_adp_code, nhso_adp_code_name)
  // nhso_adp_code col is distinct from pk 'icode'; JOIN valid; data NULL in demo (operator populates)
  // [verified 2026-05-17]
  { key: 'eclaim-charge', label: 'รายการค่ารักษาพยาบาล',
    table: 'nondrugitems', pk: 'icode', nameCol: 'name', mapCol: 'nhso_adp_code',
    stdTable: 'nhso_adp_code', stdCodeCol: 'nhso_adp_code', stdNameCol: 'nhso_adp_code_name',
    pending: false },

  // ── PENDING (pending: true) — mapCol === pk or no external std col ────────────
  // clinic(clinic PK, name): no separate eclaim/nhso mapping col distinct from pk
  // depcode/sss_clinic_code/pcu_code are unrelated to nhso_clinic.code [verified 2026-05-17]
  { key: 'eclaim-clinic', label: 'คลินิก',
    table: 'clinic', pk: 'clinic', nameCol: 'name', mapCol: 'clinic',
    stdTable: 'nhso_clinic', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },

  // drugitems_ned_reason_list: claim_control IS pk; only 4 cols; no external std table
  // [verified 2026-05-17; self-referential; same conclusion as basic-config 'drug-ned-reason']
  { key: 'eclaim-drug-ned', label: 'เหตุผลการสั่งยา NED',
    table: 'drugitems_ned_reason_list', pk: 'claim_control', nameCol: 'doctor_reason', mapCol: 'claim_control',
    stdTable: 'drugitems_ned_reason_list', stdCodeCol: 'claim_control', stdNameCol: 'doctor_reason',
    pending: true },
]

export function getEclaimCategory(key: string): CategoryDef | undefined {
  return ECLAIM_REGISTRY.find(c => c.key === key)
}

export function listEclaimCategories(): CategoryListItem[] {
  return ECLAIM_REGISTRY.map(({ key, label, pending, mapCol2, field1Label, field2Label }) => ({
    key,
    label,
    pending,
    dual: !!mapCol2,
    ...(field1Label !== undefined ? { field1Label } : {}),
    ...(field2Label !== undefined ? { field2Label } : {}),
  }))
}
