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
  // er_oper_code(er_oper_code PK, name, icd9cm) -> provis_icd10tm_oper(icd9cm_code, name)  [JOIN verified 2026-05-17; icd9cm separate from pk]
  { key: 'procedure', label: 'หัตถการ',
    table: 'er_oper_code', pk: 'er_oper_code', nameCol: 'name', mapCol: 'icd9cm',
    stdTable: 'provis_icd10tm_oper', stdCodeCol: 'icd9cm_code', stdNameCol: 'name',
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
  { key: 'rehab-code', label: 'รหัสบริการฟื้นฟู',
    table: 'physic_items', pk: 'physic_items_id', nameCol: 'name', mapCol: 'f43_rehab_code',
    stdTable: 'provis_rehabcode', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // pp_special_type(pp_special_type_id PK, pp_special_type_name, pp_special_code) -> pp_special_code(code, name)  [JOIN verified 2026-05-17]
  { key: 'pp-special-code', label: 'รหัสบริการส่งเสริมป้องกันเฉพาะ',
    table: 'pp_special_type', pk: 'pp_special_type_id', nameCol: 'pp_special_type_name', mapCol: 'pp_special_code',
    stdTable: 'pp_special_code', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },

  // ── PENDING (pending: true) — mapCol===pk or data/join unconfirmable ───────
  // icd101(code PK, name) -> provis_chronic_icd10(icd10, name_thai): mapCol would be code===pk; master table corrected from dbicd10chronic to icd101 per owner
  { key: 'chronic-disease', label: 'โรคเรื้อรัง',
    table: 'icd101', pk: 'code', nameCol: 'name', mapCol: 'code',
    stdTable: 'provis_chronic_icd10', stdCodeCol: 'icd10', stdNameCol: 'name_thai',
    pending: true },
  // clinic(clinic PK, name) — no separate mapCol to nhso_clinic.code; clinic code IS pk
  { key: 'clinic', label: 'คลินิก',
    table: 'clinic', pk: 'clinic', nameCol: 'name', mapCol: 'clinic',
    stdTable: 'nhso_clinic', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // drugitems(icode PK, name, tmt_tp_code) -> drugitems_register(std_code, drugname): no plain single-name col in std (needs CONCAT); tmt_tp_code is real separate col
  { key: 'drug-list', label: 'รายการยา',
    table: 'drugitems', pk: 'icode', nameCol: 'name', mapCol: 'tmt_tp_code',
    stdTable: 'drugitems_register', stdCodeCol: 'std_code', stdNameCol: 'drugname',
    pending: true },
  // drugitems_ned_reason_list is itself the std reference (self-map); no external std table
  { key: 'drug-ned-reason', label: 'เหตุผลการสั่งยา',
    table: 'drugitems_ned_reason_list', pk: 'claim_control', nameCol: 'doctor_reason', mapCol: 'claim_control',
    stdTable: 'drugitems_ned_reason_list', stdCodeCol: 'claim_control', stdNameCol: 'doctor_reason',
    pending: true },
  // diagtype(diagtype PK, name, nhso_code) -> provis_diagtype(code, name): nhso_code col exists but is NULL for all rows in demo
  { key: 'diagnosis-type', label: 'ประเภทการวินิจฉัย',
    table: 'diagtype', pk: 'diagtype', nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'provis_diagtype', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // pcode(code PK, name) -> no separate mapCol; provis_person is per-person export table (not a code reference)
  { key: 'person-type', label: 'ประเภทบุคคล',
    table: 'pcode', pk: 'code', nameCol: 'name', mapCol: 'code',
    stdTable: 'provis_person', stdCodeCol: 'typearea', stdNameCol: 'name',
    pending: true },
  // accident_place_type(accident_place_type_id PK, accident_place_type_name, export_code) -> provis_aeplace(code, name): export_code col exists but is NULL for all rows in demo
  { key: 'accident-place', label: 'สถานที่เกิดอุบัติเหตุ',
    table: 'accident_place_type', pk: 'accident_place_type_id', nameCol: 'accident_place_type_name', mapCol: 'export_code',
    stdTable: 'provis_aeplace', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // accident_transport_type(accident_transport_type_id PK, accident_transport_type_name, export_code) -> provis_vehicle(code, name): export_code col exists but is NULL for all rows in demo
  { key: 'vehicle-type', label: 'ประเภทยานพาหนะที่เกิดเหตุ',
    table: 'accident_transport_type', pk: 'accident_transport_type_id', nameCol: 'accident_transport_type_name', mapCol: 'export_code',
    stdTable: 'provis_vehicle', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // ovstist(ovstist UNI-code, name, export_code) -> provis_typein(code, name): export_code col exists but is NULL for all rows in demo; note: DB PK is 'name' field (schema quirk), ovstist used as functional code pk
  { key: 'service-entry', label: 'ประเภทการมารับบริการ',
    table: 'ovstist', pk: 'ovstist', nameCol: 'name', mapCol: 'export_code',
    stdTable: 'provis_typein', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // lab_items(lab_items_code PK, lab_items_name, provis_labcode) -> provis_lab(provis_labcode, name_thai): JOIN returns empty (no provis_labcode populated in demo)
  { key: 'lab-value-map', label: 'Lab Value Map',
    table: 'lab_items', pk: 'lab_items_code', nameCol: 'lab_items_name', mapCol: 'provis_labcode',
    stdTable: 'provis_lab', stdCodeCol: 'provis_labcode', stdNameCol: 'name_thai',
    pending: true },
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

export function buildExistsSql(c: CategoryDef): string {
  return `SELECT 1 FROM ${ident(c.table)} WHERE ${ident(c.pk)} = ? LIMIT 1`
}
