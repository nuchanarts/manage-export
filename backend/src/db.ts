import 'dotenv/config'

type QueryParam = string | number | boolean | null

interface DbRow {
  [key: string]: unknown
}

interface DbResult {
  rows: DbRow[]
  rowCount: number
}

let dbModule: { query: (sql: string, params?: QueryParam[]) => Promise<DbResult> } | null = null

async function getDb() {
  if (dbModule) return dbModule

  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL environment variable is not set')

  if (url.startsWith('mysql://') || url.startsWith('mysql2://')) {
    const mysql = await import('mysql2/promise')
    const pool = mysql.createPool(url)
    dbModule = {
      async query(sql: string, params: QueryParam[] = []) {
        const [rows] = await pool.execute(sql.replace(/\?/g, '?'), params)
        const arr = rows as DbRow[]
        return { rows: arr, rowCount: arr.length }
      },
    }
  } else if (url.startsWith('mssql://') || url.startsWith('sqlserver://')) {
    const mssql = await import('mssql')
    const pool = await mssql.connect(url)
    dbModule = {
      async query(sql: string, params: QueryParam[] = []) {
        const request = pool.request()
        params.forEach((p, i) => request.input(`p${i}`, p))
        const parameterizedSql = sql.replace(/\?/g, (_, i) => `@p${i}`)
        const result = await request.query(parameterizedSql)
        return { rows: result.recordset as DbRow[], rowCount: result.recordset.length }
      },
    }
  } else if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    const { Pool } = await import('pg')
    const pool = new Pool({ connectionString: url })
    dbModule = {
      async query(sql: string, params: QueryParam[] = []) {
        const result = await pool.query(sql, params)
        return { rows: result.rows as DbRow[], rowCount: result.rowCount ?? 0 }
      },
    }
  } else {
    throw new Error(`Unsupported database URL scheme: ${url.split('://')[0]}`)
  }

  return dbModule
}

export async function query(sql: string, params: QueryParam[] = []): Promise<DbResult> {
  const db = await getDb()
  return db.query(sql, params)
}
