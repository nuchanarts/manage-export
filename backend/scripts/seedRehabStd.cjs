// Seeds the bgs_rehab_std reference table from rehab_std_seed.json
// (parsed from the MoPH 43-file standard "รหัสกายภาพ" code list).
// Idempotent: recreates the table and reloads all rows. Run: node scripts/seedRehabStd.cjs
const fs = require('fs')
const path = require('path')

const url = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
  .match(/DATABASE_URL=(.*)/)[1].trim()
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'rehab_std_seed.json'), 'utf8'))

;(async () => {
  const mysql = require('mysql2/promise')
  const pool = mysql.createPool(url)
  await pool.query(
    'CREATE TABLE IF NOT EXISTS `bgs_rehab_std` (' +
    '`code` VARCHAR(20) NOT NULL PRIMARY KEY, ' +
    '`name` VARCHAR(255) NOT NULL) ' +
    'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
  )
  await pool.query('TRUNCATE TABLE `bgs_rehab_std`')
  const values = rows.map(r => [String(r.code), String(r.name).slice(0, 255)])
  // chunked bulk insert
  for (let i = 0; i < values.length; i += 200) {
    const chunk = values.slice(i, i + 200)
    await pool.query('INSERT INTO `bgs_rehab_std` (`code`,`name`) VALUES ?', [chunk])
  }
  const [[{ n }]] = await pool.query('SELECT COUNT(*) n FROM `bgs_rehab_std`')
  console.log('bgs_rehab_std seeded rows =', n)
  await pool.end()
})().catch(e => { console.error('SEED FAIL', e.code || e.message); process.exit(1) })
