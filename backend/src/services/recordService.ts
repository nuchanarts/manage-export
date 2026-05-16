import { query } from '../db'
import { HealthRecord, SearchFilter, SearchResult } from '../models/types'

// HOSxP tables: ovst (visit) JOIN patient (person info)
const BASE_SELECT = `
  SELECT
    COALESCE(pt.hcode, o.hospmain) AS HOSPCODE,
    pt.hn                          AS PID,
    COALESCE(pt.cid, '')           AS CID,
    o.hn                           AS HN,
    o.vn                           AS SEQ,
    DATE_FORMAT(o.vstdate, '%Y%m%d') AS DATE_SERV,
    pt.pname                       AS PRENAME,
    pt.fname                       AS NAME,
    pt.lname                       AS LNAME,
    pt.sex                         AS SEX,
    DATE_FORMAT(COALESCE(pt.truebirthday, pt.birthday), '%Y%m%d') AS BIRTH,
    COALESCE(pt.type_area, '')     AS TYPEAREA,
    COALESCE(pt.hid, '')           AS AREACODE
  FROM ovst o
  LEFT JOIN patient pt ON pt.hn = o.hn
`

function buildWhere(filter: SearchFilter): { where: string; params: (string | number | null)[] } {
  const conditions: string[] = []
  const params: (string | number | null)[] = []

  conditions.push('o.vstdate >= ?')
  params.push(filter.dateFrom)

  conditions.push('o.vstdate <= ?')
  params.push(filter.dateTo)

  if (filter.hospcode) {
    conditions.push('(pt.hcode = ? OR o.hospmain = ?)')
    params.push(filter.hospcode, filter.hospcode)
  }

  if (filter.birthFrom && filter.birthTo) {
    conditions.push('COALESCE(pt.truebirthday, pt.birthday) >= ?')
    params.push(filter.birthFrom)
    conditions.push('COALESCE(pt.truebirthday, pt.birthday) <= ?')
    params.push(filter.birthTo)
  }

  return { where: conditions.join(' AND '), params }
}

function rowToRecord(row: Record<string, unknown>): HealthRecord {
  return {
    HOSPCODE: String(row['HOSPCODE'] ?? ''),
    PID: String(row['PID'] ?? ''),
    CID: String(row['CID'] ?? ''),
    HN: String(row['HN'] ?? ''),
    SEQ: String(row['SEQ'] ?? ''),
    DATE_SERV: String(row['DATE_SERV'] ?? ''),
    PRENAME: String(row['PRENAME'] ?? ''),
    NAME: String(row['NAME'] ?? ''),
    LNAME: String(row['LNAME'] ?? ''),
    SEX: String(row['SEX'] ?? ''),
    BIRTH: String(row['BIRTH'] ?? ''),
    TYPEAREA: String(row['TYPEAREA'] ?? ''),
    AREACODE: String(row['AREACODE'] ?? ''),
  }
}

export async function search(filter: SearchFilter): Promise<SearchResult> {
  const { where, params } = buildWhere(filter)
  const offset = (filter.page - 1) * filter.pageSize

  const countResult = await query(
    `SELECT COUNT(*) AS total FROM ovst o LEFT JOIN patient pt ON pt.hn = o.hn WHERE ${where}`,
    params
  )
  const total = Number((countResult.rows[0] as Record<string, unknown>)['total'] ?? 0)

  const dataResult = await query(
    `${BASE_SELECT} WHERE ${where} ORDER BY o.vstdate DESC, o.vn LIMIT ? OFFSET ?`,
    [...params, filter.pageSize, offset]
  )

  return {
    data: dataResult.rows.map(r => rowToRecord(r as Record<string, unknown>)),
    total,
    page: filter.page,
    pageSize: filter.pageSize,
    totalPages: Math.ceil(total / filter.pageSize),
  }
}

export async function exportAll(filter: SearchFilter): Promise<HealthRecord[]> {
  const { where, params } = buildWhere(filter)
  const result = await query(
    `${BASE_SELECT} WHERE ${where} ORDER BY o.vstdate DESC, o.vn`,
    params
  )
  return result.rows.map(r => rowToRecord(r as Record<string, unknown>))
}

export async function getByPid(pid: string): Promise<HealthRecord | null> {
  const result = await query(
    `${BASE_SELECT} WHERE pt.hn = ? LIMIT 1`,
    [pid]
  )
  if (result.rows.length === 0) return null
  return rowToRecord(result.rows[0] as Record<string, unknown>)
}
