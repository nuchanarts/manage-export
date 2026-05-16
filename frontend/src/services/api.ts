import axios from 'axios'
import { HealthRecord, SearchFilter, SearchResult } from '../types'

const client = axios.create({ baseURL: '/api' })

export async function searchRecords(filter: Omit<SearchFilter, 'page' | 'pageSize'> & { page?: number; pageSize?: number }): Promise<SearchResult> {
  const params = Object.fromEntries(
    Object.entries(filter).filter(([, v]) => v !== undefined && v !== '')
  )
  const { data } = await client.get<SearchResult>('/records', { params })
  return data
}

export function buildExportUrl(filter: Omit<SearchFilter, 'page' | 'pageSize'>): string {
  const params = new URLSearchParams(
    Object.entries(filter)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)])
  )
  return `/api/records/export?${params.toString()}`
}

export async function getRecord(pid: string): Promise<HealthRecord> {
  const { data } = await client.get<HealthRecord>(`/records/${encodeURIComponent(pid)}`)
  return data
}
