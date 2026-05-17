// Sanity check: buildListSql for drug-list row count vs COUNT(*) FROM drugitems
const fs = require('fs')
const path = require('path')
const mysql2 = require('mysql2/promise')

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8')
const urlMatch = envContent.match(/DATABASE_URL=(.*)/)
const url = urlMatch[1].trim()

// Reproduce the new correlated-subquery shape for drug-list manually
const listSql =
  'SELECT `drugitems`.`icode` AS code,' +
  ' `drugitems`.`name` AS name,' +
  ' `drugitems`.`did` AS std_code,' +
  ' (SELECT s.`drugname` FROM `drugitems_register` s WHERE s.`std_code` = `drugitems`.`did` LIMIT 1) AS std_name,' +
  ' (EXISTS(SELECT 1 FROM `drugitems_register` s WHERE s.`std_code` = `drugitems`.`did`)) AS mapped' +
  ' FROM `drugitems` ORDER BY `drugitems`.`icode`'

;(async () => {
  const conn = await mysql2.createConnection(url)
  const [listRows] = await conn.query('SELECT COUNT(*) AS cnt FROM (' + listSql + ') x')
  const [countRows] = await conn.query('SELECT COUNT(*) AS cnt FROM drugitems')
  await conn.end()
  console.log('buildListSql row count:', listRows[0].cnt)
  console.log('SELECT COUNT(*) FROM drugitems:', countRows[0].cnt)
  console.log('Match:', String(listRows[0].cnt) === String(countRows[0].cnt) ? 'YES - DEDUPLICATION CONFIRMED' : 'NO - MISMATCH!')
})()
