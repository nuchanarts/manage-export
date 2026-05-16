// backend/scripts/probeRegistry.cjs
// Prints, for each candidate master table, its columns and whether a matching
// provis_* table exists. Used to fill CATEGORY_REGISTRY by hand (no guessing).
const fs = require('fs')
const path = require('path')

// Support running from either backend/ or repo root
let envPath = path.join(__dirname, '../.env')
if (!fs.existsSync(envPath)) {
  envPath = path.join(__dirname, '../../backend/.env')
}
const envContent = fs.readFileSync(envPath, 'utf8')
const urlMatch = envContent.match(/DATABASE_URL=(.*)/)
if (!urlMatch) { console.error('DATABASE_URL not found in .env'); process.exit(1) }
const url = urlMatch[1].trim()

// [masterTable, menuKey, stdTable]
// All entries verified against the live HOSxP `demo` DB on 2026-05-16/17.
const CANDIDATES = [
  // KEY                 MASTER TABLE              STD TABLE
  ['occupation',         'occupation',             'provis_occupa'],
  ['religion',           'religion',               'provis_religion'],
  ['nationality',        'race',                   'provis_race'],
  ['marrystatus',        'marriage',               'nhso_marriage'],
  ['pttype',             'insurance',              'provis_instype'],
  ['spclty',             'department',             'nhso_clinic'],
  ['education',          'education',              'provis_education'],
  ['diagtype',           'diagnosis-type',         'provis_diagtype'],
  ['lab_items',          'lab-value-map',          'provis_lab'],
  ['income',             'charge-list',            'income_std_group'],
  ['dbicd10chronic',     'chronic-disease',        'provis_chronic_icd10'],
  ['pp_special_code',    'pp-special-code',        'pp_special_code'],
  ['clinic',             'clinic',                 'nhso_clinic'],
  ['drugitems',          'drug-list',              'provis_drug'],
  ['drugitems_ned_reason_list', 'drug-ned-reason', 'drugitems_ned_reason_list'],
  ['er_oper_code',       'procedure',              'provis_icd10tm_oper'],
  ['fp_code',            'fp-method',              'provis_fptype'],
  ['person_vaccine',     'vaccine-prenatal',       'vaccine'],
  ['person_vaccine',     'vaccine-0-1y',           'vaccine'],
  ['person_vaccine',     'vaccine-1-5y',           'vaccine'],
  ['person_vaccine',     'vaccine-school',         'vaccine'],
  ['person_vaccine',     'vaccine-all',            'vaccine'],
  ['person_type',        'chronic-status',         'provis_chronic'],
  ['person_type',        'person-kind',            'provis_person'],
  ['pcode',              'person-type',            'provis_person'],
  ['accident_place_type', 'accident-place',        'provis_vehicle'],
  ['er_accident_type',   'accident-entry',         'provis_vehicle'],
  ['accident_person_type', 'injury-type',          'provis_vehicle'],
  ['accident_vehicle_type', 'vehicle-type',        'provis_vehicle'],
  ['handicapped_rehabilitation', 'rehab-code',     'provis_rehabcode'],
  ['visit_type',         'service-entry',          'provis_urgency'],
  ['pcu_person_type',    'urgency-level',          'provis_urgency'],
]

;(async () => {
  let mysql
  try {
    mysql = require('mysql2/promise')
  } catch (e) {
    try {
      mysql = require(path.join(__dirname, '../../node_modules/mysql2/promise'))
    } catch (e2) {
      console.error('mysql2 not found:', e2.message)
      process.exit(1)
    }
  }

  const p = mysql.createPool(url)
  console.log('=== PROBE RESULTS ===')
  console.log('Format: key | table=<table> <exists/ERR> | provis=<std> <OK/MISSING> | cols: <filtered cols>')
  console.log('')

  for (const [table, key, std] of CANDIDATES) {
    try {
      const [cols] = await p.query('SHOW COLUMNS FROM `' + table + '`')
      const allCols = cols.map(c => c.Field)
      const relevantCols = allCols.filter(f => /code|name|nhso|std|type|id|pk|key/i.test(f))

      const [[{ n }]] = await p.query(
        "SELECT COUNT(*) n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?", [std])

      let stdCols = []
      if (n > 0) {
        const [sCols] = await p.query('SHOW COLUMNS FROM `' + std + '`')
        stdCols = sCols.map(c => c.Field)
      }

      console.log(
        key,
        '| table=', table, 'EXISTS',
        '| provis=', std, n ? 'OK' : 'MISSING',
        '| master_cols:', relevantCols.join(',') || '(none)',
        '| first3:', allCols.slice(0, 3).join(','),
        n > 0 ? '| std_cols: ' + stdCols.join(',') : ''
      )
    } catch (e) {
      console.log(key, '| table=', table, 'ERR', e.code || e.message)
    }
  }
  console.log('')
  console.log('=== END PROBE ===')
  await p.end()
})().catch(e => { console.error(e.code || e.message); process.exit(1) })
