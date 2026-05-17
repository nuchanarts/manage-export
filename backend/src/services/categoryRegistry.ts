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
  // ── CONFIRMED (pending: false) ────────────────────────────────────────────
  { key: 'occupation', label: 'อาชีพ',
    table: 'occupation', pk: 'occupation', nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'provis_occupa', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // religion(religion, name, nhso_code) -> provis_religion(code, name)
  { key: 'religion', label: 'ศาสนา',
    table: 'religion', pk: 'religion', nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'provis_religion', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // nationality(nationality, name, nhso_code) -> provis_race(code, name)
  { key: 'race', label: 'เชื้อชาติ',
    table: 'nationality', pk: 'nationality', nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'provis_race', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // marrystatus(code, name, nhso_marriage_code) -> nhso_marriage(nhso_marriage_code, nhso_marriage_name)
  { key: 'marriage', label: 'สถานะสมรส',
    table: 'marrystatus', pk: 'code', nameCol: 'name', mapCol: 'nhso_marriage_code',
    stdTable: 'nhso_marriage', stdCodeCol: 'nhso_marriage_code', stdNameCol: 'nhso_marriage_name',
    pending: false },
  // pttype(pttype, name, nhso_code) -> provis_instype(code, name)
  { key: 'insurance', label: 'สิทธิการรักษา',
    table: 'pttype', pk: 'pttype', nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'provis_instype', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // spclty(spclty, name, nhso_code) -> nhso_clinic(code, name)  [JOIN verified: spclty.nhso_code = nhso_clinic.code]
  { key: 'department', label: 'แผนก',
    table: 'spclty', pk: 'spclty', nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'nhso_clinic', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // education(education, name, provis_code) -> provis_education(code, name)  [JOIN verified]
  { key: 'education', label: 'การศึกษา',
    table: 'education', pk: 'education', nameCol: 'name', mapCol: 'provis_code',
    stdTable: 'provis_education', stdCodeCol: 'code', stdNameCol: 'name',
    pending: false },
  // income(income, name, std_group) -> income_std_group(std_group, name)  [JOIN verified]
  { key: 'charge-list', label: 'รายการค่าบริการ',
    table: 'income', pk: 'income', nameCol: 'name', mapCol: 'std_group',
    stdTable: 'income_std_group', stdCodeCol: 'std_group', stdNameCol: 'name',
    pending: false },

  // ── PENDING (pending: true) — tables/cols confirmed in DB but mapCol/join unconfirmed ──
  // person_type empty in demo DB; provis_person is per-person (has pid) — no clear mapCol
  { key: 'person-kind', label: 'ชนิดบุคคล',
    table: 'person_type', pk: 'code', nameCol: 'name', mapCol: 'code',
    stdTable: 'provis_person', stdCodeCol: 'cid', stdNameCol: 'name',
    pending: true },
  // dbicd10chronic has icd_10/icd_name_thai but no mapCol to provis_chronic_icd10
  { key: 'chronic-disease', label: 'โรคเรื้อรัง',
    table: 'dbicd10chronic', pk: 'icd_10', nameCol: 'icd_name_thai', mapCol: 'icd_10',
    stdTable: 'provis_chronic_icd10', stdCodeCol: 'icd10', stdNameCol: 'name_thai',
    pending: true },
  // clinic(clinic, name) no mapCol that matches nhso_clinic.code (JOIN showed NULLs)
  { key: 'clinic', label: 'คลินิก',
    table: 'clinic', pk: 'clinic', nameCol: 'name', mapCol: 'clinic',
    stdTable: 'nhso_clinic', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // drugitems(icode, name) — provis_drug is per-person export table, not a code reference
  { key: 'drug-list', label: 'รายการยา',
    table: 'drugitems', pk: 'icode', nameCol: 'name', mapCol: 'tmt_tp_code',
    stdTable: 'provis_drug', stdCodeCol: 'did', stdNameCol: 'dname',
    pending: true },
  // drugitems_ned_reason_list is itself the std reference (doctor_reason=name, claim_control=code)
  { key: 'drug-ned-reason', label: 'เหตุผลการสั่งยา',
    table: 'drugitems_ned_reason_list', pk: 'claim_control', nameCol: 'doctor_reason', mapCol: 'claim_control',
    stdTable: 'drugitems_ned_reason_list', stdCodeCol: 'claim_control', stdNameCol: 'doctor_reason',
    pending: true },
  // er_oper_code(er_oper_code, name, icd9cm) — provis_icd10tm_oper has icd10tm_code/name but join unclear
  { key: 'procedure', label: 'หัตถการ',
    table: 'er_oper_code', pk: 'er_oper_code', nameCol: 'name', mapCol: 'icd9cm',
    stdTable: 'provis_icd10tm_oper', stdCodeCol: 'icd9cm_code', stdNameCol: 'name',
    pending: true },
  // fp_code(fp_code, fp_name) — no mapCol column to provis_fptype
  { key: 'fp-method', label: 'การคุมกำเนิด',
    table: 'fp_code', pk: 'fp_code', nameCol: 'fp_name', mapCol: 'fp_code',
    stdTable: 'provis_fptype', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // person_vaccine(person_vaccine_id, vaccine_name, export_vaccine_code) — vaccine table empty
  { key: 'vaccine-prenatal', label: 'วัคซีนฝากครรภ์',
    table: 'person_vaccine', pk: 'person_vaccine_id', nameCol: 'vaccine_name', mapCol: 'export_vaccine_code',
    stdTable: 'vaccine', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  { key: 'vaccine-0-1y', label: 'วัคซีนเด็ก 0-1 ปี',
    table: 'person_vaccine', pk: 'person_vaccine_id', nameCol: 'vaccine_name', mapCol: 'export_vaccine_code',
    stdTable: 'vaccine', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  { key: 'vaccine-1-5y', label: 'วัคซีนเด็ก 1-5 ปี',
    table: 'person_vaccine', pk: 'person_vaccine_id', nameCol: 'vaccine_name', mapCol: 'export_vaccine_code',
    stdTable: 'vaccine', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  { key: 'vaccine-school', label: 'วัคซีนเด็กวัยเรียน',
    table: 'person_vaccine', pk: 'person_vaccine_id', nameCol: 'vaccine_name', mapCol: 'export_vaccine_code',
    stdTable: 'vaccine', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  { key: 'vaccine-all', label: 'วัคซีนทั้งหมด',
    table: 'person_vaccine', pk: 'person_vaccine_id', nameCol: 'vaccine_name', mapCol: 'export_vaccine_code',
    stdTable: 'vaccine', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // diagtype(diagtype, name, nhso_code) -> provis_diagtype(code, name) — nhso_code is NULL in data
  { key: 'diagnosis-type', label: 'ประเภทการวินิจฉัย',
    table: 'diagtype', pk: 'diagtype', nameCol: 'name', mapCol: 'nhso_code',
    stdTable: 'provis_diagtype', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // person_type is empty in demo DB; provis_chronic is per-person — no clear mapCol
  { key: 'chronic-status', label: 'สถานะผู้ป่วยโรคเรื้อรัง',
    table: 'person_type', pk: 'code', nameCol: 'name', mapCol: 'code',
    stdTable: 'provis_chronic', stdCodeCol: 'chronic', stdNameCol: 'typedis',
    pending: true },
  // pcode(code, name) — provis_person is per-person (not a code reference table)
  { key: 'person-type', label: 'ประเภทบุคคล',
    table: 'pcode', pk: 'code', nameCol: 'name', mapCol: 'code',
    stdTable: 'provis_person', stdCodeCol: 'typearea', stdNameCol: 'name',
    pending: true },
  // accident_place_type(accident_place_type_id, accident_place_type_name, export_code) — no std provis table
  { key: 'accident-place', label: 'สถานที่เกิดอุบัติเหตุ',
    table: 'accident_place_type', pk: 'accident_place_type_id', nameCol: 'accident_place_type_name', mapCol: 'export_code',
    stdTable: 'provis_vehicle', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // er_accident_type(er_accident_type_id, er_accident_type_name) — no mapCol, no std provis table
  { key: 'accident-entry', label: 'ประเภทการมากรณีอุบัติเหตุ',
    table: 'er_accident_type', pk: 'er_accident_type_id', nameCol: 'er_accident_type_name', mapCol: 'er_accident_type_id',
    stdTable: 'provis_vehicle', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // accident_person_type(accident_person_type_id, accident_person_type_name, export_code) — injury-type per 43-file
  { key: 'injury-type', label: 'ประเภทผู้บาดเจ็บ',
    table: 'accident_person_type', pk: 'accident_person_type_id', nameCol: 'accident_person_type_name', mapCol: 'export_code',
    stdTable: 'provis_vehicle', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // accident_vehicle_type(accident_vehicle_type_id, accident_vehicle_type_name) — provis_vehicle is reference
  { key: 'vehicle-type', label: 'ประเภทยานพาหนะที่เกิดเหตุ',
    table: 'accident_vehicle_type', pk: 'accident_vehicle_type_id', nameCol: 'accident_vehicle_type_name', mapCol: 'accident_vehicle_type_id',
    stdTable: 'provis_vehicle', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // pcu_person_type(pcu_person_type_id, pcu_person_type_name) — provis_urgency(code, name) is reference
  { key: 'urgency-level', label: 'ระดับความเร่งด่วน',
    table: 'pcu_person_type', pk: 'pcu_person_type_id', nameCol: 'pcu_person_type_name', mapCol: 'pcu_person_type_id',
    stdTable: 'provis_urgency', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // handicapped_rehabilitation(handicapped_rehabilitation_id, name) — provis_rehabcode(code, name)
  { key: 'rehab-code', label: 'รหัสบริการฟื้นฟู',
    table: 'handicapped_rehabilitation', pk: 'handicapped_rehabilitation_id', nameCol: 'handicapped_rehabilitation_name', mapCol: 'handicapped_rehabilitation_id',
    stdTable: 'provis_rehabcode', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // pp_special_code(code, name) is itself the standard; no separate HIS local master
  { key: 'pp-special-code', label: 'รหัสบริการส่งเสริมป้องกันเฉพาะ',
    table: 'pp_special_code', pk: 'code', nameCol: 'name', mapCol: 'code',
    stdTable: 'pp_special_code', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // visit_type(visit_type, visit_type_name) is time-of-visit, not 43-file service-entry type
  { key: 'service-entry', label: 'ประเภทการมารับบริการ',
    table: 'visit_type', pk: 'visit_type', nameCol: 'visit_type_name', mapCol: 'visit_type',
    stdTable: 'provis_urgency', stdCodeCol: 'code', stdNameCol: 'name',
    pending: true },
  // lab_items(lab_items_code, lab_items_name, provis_labcode) -> provis_lab(provis_labcode, name_thai)
  // JOIN returned empty (no provis_labcode data populated) — confirm table cols only
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
