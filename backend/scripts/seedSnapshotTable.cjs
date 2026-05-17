// Creates the bgs_mapping_snapshot table (idempotent: CREATE TABLE IF NOT EXISTS).
// Run: node scripts/seedSnapshotTable.cjs
const fs = require('fs')
const path = require('path')

const url = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
  .match(/DATABASE_URL=(.*)/)[1].trim()

;(async () => {
  const mysql = require('mysql2/promise')
  const pool = mysql.createPool(url)
  await pool.query(
    'CREATE TABLE IF NOT EXISTS `bgs_mapping_snapshot` (' +
    '`id` BIGINT AUTO_INCREMENT PRIMARY KEY, ' +
    '`ts` DATETIME NOT NULL, ' +
    '`registry` VARCHAR(20) NOT NULL, ' +
    '`label` VARCHAR(120) NOT NULL, ' +
    '`actor` VARCHAR(64) NOT NULL, ' +
    '`payload` LONGTEXT NOT NULL, ' +
    'INDEX `idx_snap_reg_ts` (`registry`, `ts`) ' +
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
  )
  console.log('bgs_mapping_snapshot table ensured (CREATE TABLE IF NOT EXISTS)')
  await pool.end()
})().catch(e => { console.error('SEED FAIL', e.code || e.message); process.exit(1) })
