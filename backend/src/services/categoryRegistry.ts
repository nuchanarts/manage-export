export interface CategoryDef {
  key: string        // url + query key, e.g. 'occupation'
  label: string      // Thai label shown in the menu
  table: string      // HIS master table
  pk: string         // PK / local code column
  nameCol: string    // local display-name column
  mapCol: string     // primary writable column (local -> standard mapping)
  stdTable: string   // provis_* standard reference table (primary)
  stdCodeCol: string // standard code column in stdTable
  stdNameCol: string // standard name column in stdTable
  pending: boolean   // true = table/column not yet confirmed against the DB
  // ── Optional secondary mapping (dual-field categories only) ──────────────
  mapCol2?: string        // secondary writable column in `table`
  stdTable2?: string      // secondary standard reference table
  stdCodeCol2?: string    // standard code column in stdTable2
  stdNameCol2?: string    // standard name column in stdTable2
  field1Label?: string    // UI column header for primary mapping
  field2Label?: string    // UI column header for secondary mapping
}

// Confirmed against the live HOSxP `demo` schema probe (2026-05-16/17).
// pending:false  = master table, pk, nameCol, mapCol, stdTable, stdCodeCol, stdNameCol
//                  all verified via SHOW COLUMNS + sample JOIN in the probe scripts.
// pending:true   = table/columns exist in DB but the exact mapCol or std join is
//                  ambiguous / unconfirmed — safe-valve per Task 4 spec.
export const CATEGORY_REGISTRY: CategoryDef[] = [
  // ── CONFIRMED (pending: false) ─────────────────────────────────────────────
  // occupation(occupation PK, name, nhso_code) -> provis_occupa(code, name)  [verified 2026-05-16]
  { key: 'occupation', label: 'อาชีพ',
    table: 'occupation', pk: 'occupation', nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'provis_occupa', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // religion(religion PK, name, nhso_code) -> provis_religion(code, name)  [verified 2026-05-16]
  { key: 'religion', label: 'ศาสนา',
    table: 'religion', pk: 'religion', nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'provis_religion', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // nationality(nationality PK, name, nhso_code) -> provis_nation(code, name)  [verified 2026-05-17; owner std=provis_nation]
  { key: 'race', label: 'เชื้อชาติ',
    table: 'nationality', pk: 'nationality', nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'provis_nation', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // marrystatus(code PK, name, nhso_marriage_code) -> nhso_marriage(nhso_marriage_code, nhso_marriage_name)  [verified 2026-05-16]
  { key: 'marriage', label: 'สถานะสมรส',
    table: 'marrystatus', pk: 'code', nameCol: 'name', mapCol: 'nhso_marriage_code',
    stdTable: 'nhso_marriage', stdCodeCol: 'nhso_marriage_code', stdNameCol: 'nhso_marriage_name',
    pending: false },
  // pttype(pttype PK, name, nhso_code) -> provis_instype(code, name)  [verified 2026-05-16]
  { key: 'insurance', label: 'สิทธิการรักษา',
    table: 'pttype', pk: 'pttype', nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'provis_instype', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // spclty(spclty PK, name, nhso_code) -> nhso_clinic(code, name)  [JOIN verified 2026-05-16]
  { key: 'department', label: 'แผนก',
    table: 'spclty', pk: 'spclty', nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'nhso_clinic', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // education(education PK, name, provis_code) -> provis_education(code, name)  [JOIN verified 2026-05-16]
  { key: 'education', label: 'การศึกษา',
    table: 'education', pk: 'education', nameCol: 'name', mapCol: 'provis_code',
    stdTable: 'provis_education', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // income(income PK, name, std_group) -> income_std_group(std_group, name)  [JOIN verified 2026-05-16]
  { key: 'charge-list', label: 'รายการค่าบริการ',
    table: 'income', pk: 'income', nameCol: 'name', mapCol: 'std_group',
    stdTable: 'income_std_group', stdCodeCol: 'std_group', stdNameCol: 'name',
    pending: false },
  // house_regist_type(house_regist_type_id PK, house_regist_type_name, export_code) -> provis_typearea(code, name)  [JOIN verified 2026-05-17]
  { key: 'person-kind', label: 'ชนิดบุคคล',
    table: 'house_regist_type', pk: 'house_regist_type_id', nameCol: 'house_regist_type_name', mapCol: 'export_code',
    stdTable: 'provis_typearea', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // er_oper_code(er_oper_code PK, name, icd9cm) -> icd9cm1(code, name)  [owner-specified 2026-05-17; mapCol icd9cm distinct from pk; tables/cols probe-verified]
  { key: 'procedure', label: 'หัตถการ',
    table: 'er_oper_code', pk: 'er_oper_code', nameCol: 'name', mapCol: 'icd9cm',
    stdTable: 'icd9cm1', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // women_birth_control(women_birth_control_id PK, women_birth_control_name, export_code) -> provis_fptype(code, name)  [JOIN verified 2026-05-17]
  { key: 'fp-method', label: 'การคุมกำเนิด',
    table: 'women_birth_control', pk: 'women_birth_control_id', nameCol: 'women_birth_control_name', mapCol: 'export_code',
    stdTable: 'provis_fptype', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // anc_service(anc_service_id PK, anc_service_name, export_vaccine_code) -> provis_vcctype(code, name)  [JOIN verified 2026-05-17]
  { key: 'vaccine-prenatal', label: 'วัคซีนฝากครรภ์',
    table: 'anc_service', pk: 'anc_service_id', nameCol: 'anc_service_name', mapCol: 'export_vaccine_code',
    stdTable: 'provis_vcctype', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // wbc_vaccine(wbc_vaccine_id PK, wbc_vaccine_name, export_vaccine_code) -> provis_vcctype(code, name)  [JOIN verified 2026-05-17]
  { key: 'vaccine-0-1y', label: 'วัคซีนเด็ก 0-1 ปี',
    table: 'wbc_vaccine', pk: 'wbc_vaccine_id', nameCol: 'wbc_vaccine_name', mapCol: 'export_vaccine_code',
    stdTable: 'provis_vcctype', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // epi_vaccine(epi_vaccine_id PK, epi_vaccine_name, export_vaccine_code) -> provis_vcctype(code, name)  [JOIN verified 2026-05-17]
  { key: 'vaccine-1-5y', label: 'วัคซีนเด็ก 1-5 ปี',
    table: 'epi_vaccine', pk: 'epi_vaccine_id', nameCol: 'epi_vaccine_name', mapCol: 'export_vaccine_code',
    stdTable: 'provis_vcctype', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // student_vaccine(student_vaccine_id PK, student_vaccine_name, export_vaccine_code) -> provis_vcctype(code, name)  [JOIN verified 2026-05-17]
  { key: 'vaccine-school', label: 'วัคซีนเด็กวัยเรียน',
    table: 'student_vaccine', pk: 'student_vaccine_id', nameCol: 'student_vaccine_name', mapCol: 'export_vaccine_code',
    stdTable: 'provis_vcctype', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // person_vaccine(person_vaccine_id PK, vaccine_name, export_vaccine_code) -> provis_vcctype(code, name)  [JOIN verified 2026-05-17; std was 'vaccine', corrected to provis_vcctype]
  { key: 'vaccine-all', label: 'วัคซีนทั้งหมด',
    table: 'person_vaccine', pk: 'person_vaccine_id', nameCol: 'vaccine_name', mapCol: 'export_vaccine_code',
    stdTable: 'provis_vcctype', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // clinic_member_status(clinic_member_status_id PK, clinic_member_status_name, provis_typedis) -> provis_typedis(code, name)  [JOIN verified 2026-05-17]
  { key: 'chronic-status', label: 'สถานะผู้ป่วยโรคเรื้อรัง',
    table: 'clinic_member_status', pk: 'clinic_member_status_id', nameCol: 'clinic_member_status_name', mapCol: 'provis_typedis',
    stdTable: 'provis_typedis', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // er_nursing_visit_type(visit_type PK, visit_name, export_code) -> provis_typein_ae(code, name)  [JOIN verified 2026-05-17]
  { key: 'accident-entry', label: 'ประเภทการมากรณีอุบัติเหตุ',
    table: 'er_nursing_visit_type', pk: 'visit_type', nameCol: 'visit_name', mapCol: 'export_code',
    stdTable: 'provis_typein_ae', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // accident_person_type(accident_person_type_id PK, accident_person_type_name, export_code) -> provis_traffic(code, name)  [JOIN verified 2026-05-17]
  { key: 'injury-type', label: 'ประเภทผู้บาดเจ็บ',
    table: 'accident_person_type', pk: 'accident_person_type_id', nameCol: 'accident_person_type_name', mapCol: 'export_code',
    stdTable: 'provis_traffic', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // er_emergency_type(er_emergency_type PK, name, export_code) -> provis_urgency(code, name)  [JOIN verified 2026-05-17]
  { key: 'urgency-level', label: 'ระดับความเร่งด่วน',
    table: 'er_emergency_type', pk: 'er_emergency_type', nameCol: 'name', mapCol: 'export_code',
    stdTable: 'provis_urgency', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // physic_items(physic_items_id PK, name, f43_rehab_code) -> provis_rehabcode(code, name)  [cols verified 2026-05-17; provis_rehabcode empty in demo but schema is valid]
  // std from bgs_rehab_std (seeded from MoPH 43-file รหัสกายภาพ.xls, 197 codes via scripts/seedRehabStd.cjs) [owner-specified 2026-05-17]
  { key: 'rehab-code', label: 'รหัสบริการฟื้นฟู',
    table: 'physic_items', pk: 'physic_items_id', nameCol: 'name', mapCol: 'f43_rehab_code',
    stdTable: 'bgs_rehab_std', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // pp_special_type(pp_special_type_id PK, pp_special_type_name, pp_special_code) -> pp_special_code(code, name)  [JOIN verified 2026-05-17]
  { key: 'pp-special-code', label: 'รหัสบริการส่งเสริมป้องกันเฉพาะ',
    table: 'pp_special_type', pk: 'pp_special_type_id', nameCol: 'pp_special_type_name', mapCol: 'pp_special_code',
    stdTable: 'pp_special_code', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },

  // ── PENDING (pending: true) — mapCol===pk or generic builders cannot express mapping ──
  // clinic(clinic PK, name, icd10) -> icd101(code, name)  [owner-specified 2026-05-17: โรคเรื้อรัง = chronic clinics in `clinic`; std code from icd101; mapCol icd10 distinct from pk; cols probe-verified]
  { key: 'chronic-disease', label: 'โรคเรื้อรัง',
    table: 'clinic', pk: 'clinic', nameCol: 'name', mapCol: 'icd10',
    stdTable: 'icd101', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // clinic(clinic PK, name, icd10, oapp_activity_id) -> icd101(code, name) + oapp_activity(oapp_activity_id, oapp_activity_name)
  // [probe-verified 2026-05-17: mapCol icd10 distinct from pk; mapCol2 oapp_activity_id distinct from pk; both std tables confirmed]
  { key: 'clinic', label: 'คลินิก',
    table: 'clinic', pk: 'clinic', nameCol: 'name', mapCol: 'icd10',
    stdTable: 'icd101', stdCodeCol: 'code', stdNameCol: 'name',
    mapCol2: 'oapp_activity_id', stdTable2: 'oapp_activity', stdCodeCol2: 'oapp_activity_id', stdNameCol2: 'oapp_activity_name',
    field1Label: 'ประเภทโรค', field2Label: 'ประเภทกิจกรรม',
    pending: false },
  // drugitems(icode PK, name, did=24-digit std code) -> drugitems_register(std_code, drugname)  [owner-specified 2026-05-17: 24 หลัก = drugitems.did; did distinct from pk icode; ncd24 does NOT exist; std name is plain drugname (full CONCAT format not expressible by generic builder)]
  { key: 'drug-list', label: 'รายการยา',
    table: 'drugitems', pk: 'icode', nameCol: 'name', mapCol: 'did',
    stdTable: 'drugitems_register', stdCodeCol: 'std_code', stdNameCol: 'drugname',
    pending: false },
  // drugitems_ned_reason_list(doctor_reason PK, claim_control mapCol) — 4 cols only: doctor_reason, claim_control, hos_guid, hos_guid_ext
  // WHERE is on doctor_reason (row identity); writable column is claim_control (distinct NED code) — safe to edit, no PK overwrite
  // [verified 2026-05-17; self-referential std table for code lookup is intentional]
  { key: 'drug-ned-reason', label: 'เหตุผลการสั่งยา NED',
    table: 'drugitems_ned_reason_list', pk: 'doctor_reason', nameCol: 'doctor_reason', mapCol: 'claim_control',
    stdTable: 'drugitems_ned_reason_list', stdCodeCol: 'claim_control', stdNameCol: 'doctor_reason',
    pending: false },
  // diagtype(diagtype PK, name, nhso_code) -> provis_diagtype(code, name): nhso_code col distinct from pk; schema valid; NULL in demo but operator populates [verified 2026-05-17]
  { key: 'diagnosis-type', label: 'ประเภทการวินิจฉัย',
    table: 'diagtype', pk: 'diagtype', nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'provis_diagtype', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // accident_place_type(accident_place_type_id PK, accident_place_type_name, export_code) -> provis_aeplace(code, name): export_code col distinct from pk; schema valid; NULL in demo [verified 2026-05-17]
  { key: 'accident-place', label: 'สถานที่เกิดอุบัติเหตุ',
    table: 'accident_place_type', pk: 'accident_place_type_id', nameCol: 'accident_place_type_name', mapCol: 'export_code',
    stdTable: 'provis_aeplace', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // accident_transport_type(accident_transport_type_id PK, accident_transport_type_name, export_code) -> provis_vehicle(code, name): export_code col distinct from pk; schema valid; NULL in demo [verified 2026-05-17]
  { key: 'vehicle-type', label: 'ประเภทยานพาหนะที่เกิดเหตุ',
    table: 'accident_transport_type', pk: 'accident_transport_type_id', nameCol: 'accident_transport_type_name', mapCol: 'export_code',
    stdTable: 'provis_vehicle', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // ovstist(ovstist functional PK, name, export_code) -> provis_typein(code, name): export_code col distinct from pk ovstist; schema valid; NULL in demo [verified 2026-05-17]
  { key: 'service-entry', label: 'ประเภทการมารับบริการ',
    table: 'ovstist', pk: 'ovstist', nameCol: 'name', mapCol: 'export_code',
    stdTable: 'provis_typein', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // lab_items(lab_items_code PK, lab_items_name, provis_labcode) -> provis_lab(provis_labcode, name_thai): provis_labcode col distinct from pk; schema valid; NULL in demo (operator populates) [verified 2026-05-17]
  { key: 'lab-value-map', label: 'Lab Value Map',
    table: 'lab_items', pk: 'lab_items_code', nameCol: 'lab_items_name', mapCol: 'provis_labcode',
    stdTable: 'provis_lab', stdCodeCol: 'provis_labcode', stdNameCol: 'name_thai',
    pending: false },
]

export function getCategory(key: string): CategoryDef | undefined {
  return CATEGORY_REGISTRY.find(c => c.key === key)
}

export interface CategoryListItem {
  key: string
  label: string
  pending: boolean
  dual: boolean
  field1Label?: string
  field2Label?: string
}

export function listCategories(): CategoryListItem[] {
  return CATEGORY_REGISTRY.map(({ key, label, pending, mapCol2, field1Label, field2Label }) => ({
    key,
    label,
    pending,
    dual: !!mapCol2,
    ...(field1Label !== undefined ? { field1Label } : {}),
    ...(field2Label !== undefined ? { field2Label } : {}),
  }))
}

// All identifiers below come from CategoryDef (registry), never from request input.
function ident(name: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`unsafe identifier: ${name}`)
  return '`' + name + '`'
}

export function buildListSql(c: CategoryDef): string {
  const m = ident(c.table)
  const s = ident(c.stdTable)
  // Use correlated scalar subqueries instead of LEFT JOIN so that std tables with
  // non-unique stdCodeCol (e.g. drugitems_register) never multiply master rows.
  let sql =
    `SELECT ${m}.${ident(c.pk)} AS code, ` +
    `${m}.${ident(c.nameCol)} AS name, ` +
    `${m}.${ident(c.mapCol)} AS std_code, ` +
    `(SELECT s.${ident(c.stdNameCol)} FROM ${s} s WHERE s.${ident(c.stdCodeCol)} = ${m}.${ident(c.mapCol)} LIMIT 1) AS std_name, ` +
    `(EXISTS(SELECT 1 FROM ${s} s WHERE s.${ident(c.stdCodeCol)} = ${m}.${ident(c.mapCol)})) AS mapped`
  if (c.mapCol2 && c.stdTable2 && c.stdCodeCol2 && c.stdNameCol2) {
    const s2 = ident(c.stdTable2)
    sql +=
      `, ${m}.${ident(c.mapCol2)} AS std_code2` +
      `, (SELECT s2.${ident(c.stdNameCol2)} FROM ${s2} s2 WHERE s2.${ident(c.stdCodeCol2)} = ${m}.${ident(c.mapCol2)} LIMIT 1) AS std_name2`
  }
  sql += ` FROM ${m} ORDER BY ${m}.${ident(c.pk)}`
  return sql
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

/** Only valid for dual categories (mapCol2 set). Builds UPDATE for secondary mapping. */
export function buildStdOptionsSql2(c: CategoryDef): string {
  if (!c.stdTable2 || !c.stdCodeCol2 || !c.stdNameCol2) {
    throw new Error(`buildStdOptionsSql2: category '${c.key}' is not dual`)
  }
  return (
    `SELECT ${ident(c.stdCodeCol2)} AS code, ${ident(c.stdNameCol2)} AS name ` +
    `FROM ${ident(c.stdTable2)} ORDER BY ${ident(c.stdCodeCol2)}`
  )
}

/** Only valid for dual categories (mapCol2 set). Builds UPDATE for secondary mapping. */
export function buildUpdateSql2(
  c: CategoryDef, code: string, stdCode: string
): { sql: string; params: (string | null)[] } {
  if (!c.mapCol2) {
    throw new Error(`buildUpdateSql2: category '${c.key}' is not dual`)
  }
  return {
    sql: `UPDATE ${ident(c.table)} SET ${ident(c.mapCol2)} = ? WHERE ${ident(c.pk)} = ?`,
    params: [stdCode === '' ? null : stdCode, code],
  }
}

export function buildExistsSql(c: CategoryDef): string {
  return `SELECT 1 FROM ${ident(c.table)} WHERE ${ident(c.pk)} = ? LIMIT 1`
}
