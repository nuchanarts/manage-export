import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DRUG_CATALOG_COLUMNS, filterDrugRows } from '../data/drugCatalogUtils'

async function fetchDrugCatalog(): Promise<Record<string, unknown>[]> {
  const res = await fetch('/api/drug-catalog')
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<Record<string, unknown>[]>
}

export function DrugCatalogPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ['drug-catalog'],
    queryFn: fetchDrugCatalog,
  })

  const filtered = useMemo(() => filterDrugRows(data, searchQuery), [data, searchQuery])

  return (
    <div className="space-y-4">
      {/* Toolbar card */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800">Drug Catalog Export</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            ข้อมูลยาจากระบบ HIS — ส่งออก Excel เพื่อใช้ในระบบมาตรฐาน
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ค้นหา..."
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {filtered.length.toLocaleString()} รายการ
          </span>
          <a
            href="/api/drug-catalog/export"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white text-sm font-medium rounded-md hover:bg-blue-800 transition-colors"
          >
            ⬇ ส่งออก Excel
          </a>
        </div>
      </div>

      {/* Related external links */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-lg shadow px-4 py-2.5 text-sm">
        <span className="text-gray-500">ลิงก์ที่เกี่ยวข้อง:</span>
        <a
          href="https://drug.nhso.go.th/drugcatalogue/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors"
        >
          💊 Drug Catalogue (สปสช.)
          <span aria-hidden="true" className="text-xs">↗</span>
        </a>
        <a
          href="https://this.or.th/service/tmt/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors"
        >
          🧬 TMT (Thai Medicines Terminology)
          <span aria-hidden="true" className="text-xs">↗</span>
        </a>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow p-10 flex justify-center items-center">
          <div className="flex items-center gap-3 text-gray-500 text-sm">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>กำลังโหลดข้อมูล...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="bg-white rounded-lg shadow p-6 border border-red-200">
          <p className="text-red-600 text-sm font-medium">เกิดข้อผิดพลาด</p>
          <p className="text-red-500 text-xs mt-1">
            {error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลได้'}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="bg-white rounded-lg shadow p-10 text-center text-gray-400 text-sm">
          ไม่พบข้อมูล
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-auto max-h-[72vh] rounded-lg">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-blue-700 text-white sticky top-0 z-10">
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">#</th>
                  {DRUG_CATALOG_COLUMNS.map(col => (
                    <th key={col.key} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}
                  >
                    <td className="px-3 py-1.5 text-gray-400 text-xs whitespace-nowrap">{i + 1}</td>
                    {DRUG_CATALOG_COLUMNS.map(col => {
                      const v = row[col.key]
                      return (
                        <td key={col.key} className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                          {v == null ? '' : String(v)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
