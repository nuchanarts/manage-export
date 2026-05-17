// Creates the bgs_mapping_audit table (idempotent: CREATE TABLE IF NOT EXISTS).
// Run: node scripts/seedAuditTable.cjs
const fs = require('fs')
const path = require('path')

const url = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
  .match(/DATABASE_URL=(.*)/)[1].trim()

;(async () => {
  const mysql = require('mysql2/promise')
  const pool = mysql.createPool(url)
  await pool.query(
    'CREATE TABLE IF NOT EXISTS `bgs_mapping_audit` (' +
    '`id` BIGINT AUTO_INCREMENT PRIMARY KEY, ' +
    '`ts` DATETIME NOT NULL, ' +
    '`registry` VARCHAR(20) NOT NULL, ' +
    '`category` VARCHAR(64) NOT NULL, ' +
    '`code` VARCHAR(190) NOT NULL, ' +
    '`field` VARCHAR(32) NOT NULL, ' +
    '`old_value` VARCHAR(255) NULL, ' +
    '`new_value` VARCHAR(255) NULL, ' +
    '`actor` VARCHAR(64) NOT NULL, ' +
    'INDEX `idx_audit_reg_cat_ts` (`registry`, `category`, `ts`) ' +
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
  )
  console.log('bgs_mapping_audit table ensured (CREATE TABLE IF NOT EXISTS)')
  await pool.end()
})().catch(e => { console.error('SEED FAIL', e.code || e.message); process.exit(1) })
