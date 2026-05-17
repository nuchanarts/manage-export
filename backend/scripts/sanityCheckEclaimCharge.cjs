// Sanity check: buildListSql for eclaim-charge row count vs COUNT(*) FROM nondrugitems
// Verifies no dup fan-out from the N extra free-value columns (no JOINs, only correlated subqueries).
const fs = require('fs')
const path = require('path')
const mysql2 = require('mysql2/promise')

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8')
const urlMatch = envContent.match(/DATABASE_URL=(.*)/)
const url = urlMatch[1].trim()

// Reproduce exactly what buildListSql(eclaim-charge) produces:
// primary: nhso_adp_code -> nhso_adp_code(stdTable)
// extra 0: billcode (free-value), 1: nhso_adp_type_id (free-value), 2: sks_coverage_price (free-value),
//        3: enable_sks_opd (free-value), 4: enable_sks_ipd (free-value), 5: sks_claim_category_type_id (free-value)
const listSql =
  'SELECT `nondrugitems`.`icode` AS code,' +
  ' `nondrugitems`.`name` AS name,' +
  ' `nondrugitems`.`nhso_adp_code` AS std_code,' +
  ' (SELECT s.`nhso_adp_code_name` FROM `nhso_adp_code` s WHERE s.`nhso_adp_code` = `nondrugitems`.`nhso_adp_code` LIMIT 1) AS std_name,' +
  ' (EXISTS(SELECT 1 FROM `nhso_adp_code` s WHERE s.`nhso_adp_code` = `nondrugitems`.`nhso_adp_code`)) AS mapped,' +
  ' `nondrugitems`.`billcode` AS std_code_e0,' +
  ' `nondrugitems`.`nhso_adp_type_id` AS std_code_e1,' +
  ' `nondrugitems`.`sks_coverage_price` AS std_code_e2,' +
  ' `nondrugitems`.`enable_sks_opd` AS std_code_e3,' +
  ' `nondrugitems`.`enable_sks_ipd` AS std_code_e4,' +
  ' `nondrugitems`.`sks_claim_category_type_id` AS std_code_e5' +
  ' FROM `nondrugitems` ORDER BY `nondrugitems`.`icode`'

;(async () => {
  const conn = await mysql2.createConnection(url)
  const [listRows] = await conn.query('SELECT COUNT(*) AS cnt FROM (' + listSql + ') x')
  const [countRows] = await conn.query('SELECT COUNT(*) AS cnt FROM `nondrugitems`')
  await conn.end()
  console.log('buildListSql(eclaim-charge) row count:', listRows[0].cnt)
  console.log('SELECT COUNT(*) FROM nondrugitems:', countRows[0].cnt)
  console.log('Match:', String(listRows[0].cnt) === String(countRows[0].cnt) ? 'YES - NO DUP FAN-OUT CONFIRMED' : 'NO - MISMATCH!')
  process.exit(String(listRows[0].cnt) === String(countRows[0].cnt) ? 0 : 1)
})()
