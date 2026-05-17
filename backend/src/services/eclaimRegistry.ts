import {
  CategoryDef,
  CategoryListItem,
  ExtraFieldMeta,
  buildListSql,
  buildStdOptionsSql,
  buildStdOptionsSqlExtra,
  buildUpdateSql,
  buildUpdateSqlExtra,
  buildExistsSql,
} from './categoryRegistry'

// Re-export the builders so callers of eclaimRegistry can import them from one place
export { buildListSql, buildStdOptionsSql, buildStdOptionsSqlExtra, buildUpdateSql, buildUpdateSqlExtra, buildExistsSql }

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

  // aligned with 43-file 'marriage'
  // marrystatus(code PK, name, nhso_marriage_code) -> nhso_marriage(nhso_marriage_code, nhso_marriage_name)
  // [verified 2026-05-17; same tables as basic-config 'marriage']
  { key: 'eclaim-marriage', label: 'สถานะสมรส',
    table: 'marrystatus', pk: 'code', nameCol: 'name', mapCol: 'nhso_marriage_code',
    stdTable: 'nhso_marriage', stdCodeCol: 'nhso_marriage_code', stdNameCol: 'nhso_marriage_name',
    pending: false },

  // aligned with 43-file 'drug-list'
  // drugitems(icode PK, name, did=24-digit std code) -> drugitems_register(std_code, drugname)
  // [owner-specified 2026-05-17; same mapping as basic-config 'drug-list']
  { key: 'eclaim-drug-list', label: 'รายการยา',
    table: 'drugitems', pk: 'icode', nameCol: 'name', mapCol: 'did',
    stdTable: 'drugitems_register', stdCodeCol: 'std_code', stdNameCol: 'drugname',
    pending: false },

  // nondrugitems(icode PK, name, nhso_adp_code) -> nhso_adp_code(nhso_adp_code, nhso_adp_code_name)
  // nhso_adp_code col is distinct from pk 'icode'; JOIN valid; data NULL in demo (operator populates)
  // 7 editable columns total: primary nhso_adp_code + 6 extra free-value cols (no external std ref)
  // [verified 2026-05-17; nondrugitems cols: icode,name,billcode,nhso_adp_type_id,nhso_adp_code,
  //  sks_coverage_price,enable_sks_opd,enable_sks_ipd,sks_claim_category_type_id]
  { key: 'eclaim-charge', label: 'รายการค่ารักษาพยาบาล',
    table: 'nondrugitems', pk: 'icode', nameCol: 'name', mapCol: 'nhso_adp_code',
    stdTable: 'nhso_adp_code', stdCodeCol: 'nhso_adp_code', stdNameCol: 'nhso_adp_code_name',
    pending: false,
    extraFields: [
      { mapCol: 'billcode',                    label: 'Bill code' },
      { mapCol: 'nhso_adp_type_id',            label: 'ADP type' },
      { mapCol: 'sks_coverage_price',          label: 'SKS coverage price' },
      { mapCol: 'enable_sks_opd',              label: 'SKS OPD' },
      { mapCol: 'enable_sks_ipd',              label: 'SKS IPD' },
      { mapCol: 'sks_claim_category_type_id',  label: 'SKS claim category' },
    ],
  },

  // ── PENDING (pending: true) — mapCol === pk or std join confirmed as self-referential ─────────
  // aligned with 43-file 'clinic' (DUAL)
  // clinic(clinic PK, name, icd10, oapp_activity_id) -> icd101(code,name) + oapp_activity(oapp_activity_id, oapp_activity_name)
  // [probe-verified 2026-05-17; mapCol icd10 and mapCol2 oapp_activity_id both distinct from pk]
  { key: 'eclaim-clinic', label: 'คลินิก',
    table: 'clinic', pk: 'clinic', nameCol: 'name', mapCol: 'icd10',
    stdTable: 'icd101', stdCodeCol: 'code', stdNameCol: 'name',
    mapCol2: 'oapp_activity_id', stdTable2: 'oapp_activity', stdCodeCol2: 'oapp_activity_id', stdNameCol2: 'oapp_activity_name',
    field1Label: 'ประเภทโรค', field2Label: 'ประเภทกิจกรรม',
    pending: false },

  // aligned with 43-file drug-ned-reason
  // drugitems_ned_reason_list(doctor_reason PK, claim_control mapCol) — WHERE on doctor_reason; writable is claim_control (NED code)
  // [verified 2026-05-17; self-referential std table intentional; pk=doctor_reason so no PK overwrite]
  { key: 'eclaim-drug-ned', label: 'เหตุผลการสั่งยา NED',
    table: 'drugitems_ned_reason_list', pk: 'doctor_reason', nameCol: 'doctor_reason', mapCol: 'claim_control',
    stdTable: 'drugitems_ned_reason_list', stdCodeCol: 'claim_control', stdNameCol: 'doctor_reason',
    pending: false, hideCodeCol: true },
]

export function getEclaimCategory(key: string): CategoryDef | undefined {
  return ECLAIM_REGISTRY.find(c => c.key === key)
}

export function listEclaimCategories(): CategoryListItem[] {
  return ECLAIM_REGISTRY.map(({ key, label, pending, mapCol2, field1Label, field2Label, extraFields, hideCodeCol }) => ({
    key,
    label,
    pending,
    dual: !!mapCol2,
    ...(field1Label !== undefined ? { field1Label } : {}),
    ...(field2Label !== undefined ? { field2Label } : {}),
    ...(extraFields && extraFields.length > 0
      ? { extraFields: extraFields.map((ef): ExtraFieldMeta => ({ label: ef.label, hasOptions: !!(ef.stdTable && ef.stdCodeCol && ef.stdNameCol) })) }
      : {}),
    ...(hideCodeCol ? { hideCodeCol: true } : {}),
  }))
}
