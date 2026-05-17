/**
 * GlobalSearchPage.tsx — F7 global cross-category search.
 *
 * Queries both /api/basic-config/_search and /api/eclaim-config/_search,
 * merges and displays results grouped by category.
 * No new npm dependencies; uses native fetch + React state only.
 */

import { useState, useCallback, useRef } from 'react'

// ─── Types (mirrors backend SearchGroup / SearchResultRow shapes) ───────────

interface SearchResultRow {
  category: string
  label: string
  code: string
  name: string
  std_code: string | null
  std_name: string | null
  mapped: boolean
}

interface SearchGroup {
  category: string
  label: string
  count: number
  rows: SearchResultRow[]
}

interface SearchResponse {
  q: string
  totalMatches: number
  skippedPending: number
  groups: SearchGroup[]
  errors: { category: string; error: string }[]
}

/** A group enriched with which registry it came from */
interface EnrichedGroup extends SearchGroup {
  registry: 'basic' | 'eclaim'
  registryLabel: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchSearch(apiBase: string, q: string): Promise<SearchResponse> {
  const url = `${apiBase}/_search?q=${encodeURIComponent(q)}&limit=50`
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<SearchResponse>
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GlobalSearchPage() {
  const [inputValue, setInputValue] = useState('')
  const [lastQuery, setLastQuery] = useState('')
  const [groups, setGroups] = useState<EnrichedGroup[]>([])
  const [totalMatches, setTotalMatches] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setGroups([])
      setTotalMatches(null)
      setLastQuery('')
      setErrorMsg(null)
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const [basicResult, eclaimResult] = await Promise.allSettled([
        fetchSearch('/api/basic-config', trimmed),
        fetchSearch('/api/eclaim-config', trimmed),
      ])

      const allGroups: EnrichedGroup[] = []
      let total = 0

      if (basicResult.status === 'fulfilled') {
        total += basicResult.value.totalMatches
        for (const g of basicResult.value.groups) {
          allGroups.push({ ...g, registry: 'basic', registryLabel: '43 แฟ้ม' })
        }
      } else {
        setErrorMsg(prev =>
          prev
            ? `${prev} | basic-config: ${basicResult.reason instanceof Error ? basicResult.reason.message : String(basicResult.reason)}`
            : `basic-config: ${basicResult.reason instanceof Error ? basicResult.reason.message : String(basicResult.reason)}`
        )
      }

      if (eclaimResult.status === 'fulfilled') {
        total += eclaimResult.value.totalMatches
        for (const g of eclaimResult.value.groups) {
          allGroups.push({ ...g, registry: 'eclaim', registryLabel: 'E-Claim' })
        }
      } else {
        setErrorMsg(prev =>
          prev
            ? `${prev} | eclaim-config: ${eclaimResult.reason instanceof Error ? eclaimResult.reason.message : String(eclaimResult.reason)}`
            : `eclaim-config: ${eclaimResult.reason instanceof Error ? eclaimResult.reason.message : String(eclaimResult.reason)}`
        )
      }

      // Sort merged groups: most matches first, then registry (basic before eclaim), then label
      allGroups.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        if (a.registry !== b.registry) return a.registry === 'basic' ? -1 : 1
        return a.label.localeCompare(b.label, 'th')
      })

      setGroups(allGroups)
      setTotalMatches(total)
      setLastQuery(trimmed)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputValue(val)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void doSearch(val)
    }, 300)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    void doSearch(inputValue)
  }

  const hasResults = groups.length > 0
  const searched = lastQuery !== ''

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="text-lg font-bold text-gray-800 mb-1">ค้นหาข้ามหมวด</h2>
        <p className="text-xs text-gray-500 mb-4">
          ค้นหารหัส / ชื่อข้ามทุกหมวด (43 แฟ้ม + E-Claim) พร้อมแสดงสถานะการจับคู่
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="search"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="ค้นหารหัส/ชื่อ ข้ามทุกหมวด…"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="ค้นหารหัส/ชื่อข้ามหมวด"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'กำลังค้นหา…' : 'ค้นหา'}
          </button>
        </form>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-10 flex justify-center items-center">
          <div className="flex items-center gap-3 text-gray-500 text-sm">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>กำลังค้นหา…</span>
          </div>
        </div>
      )}

      {/* Summary bar */}
      {!loading && searched && (
        <div className="bg-white rounded-lg shadow px-4 py-2.5 flex items-center justify-between text-sm">
          <span className="text-gray-600">
            ผลการค้นหา <span className="font-semibold text-blue-700">"{lastQuery}"</span>
          </span>
          <span className={`font-semibold ${totalMatches === 0 ? 'text-gray-400' : 'text-blue-700'}`}>
            {totalMatches?.toLocaleString() ?? 0} รายการ จาก {groups.length} หมวด
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && searched && !hasResults && !errorMsg && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400 text-sm">
          ไม่พบรายการที่ตรงกับ "{lastQuery}"
        </div>
      )}

      {/* Results */}
      {!loading && hasResults && groups.map(group => (
        <div key={`${group.registry}:${group.category}`} className="bg-white rounded-lg shadow overflow-hidden">
          {/* Group header */}
          <div className="px-4 py-2.5 bg-gray-50 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800 text-sm">{group.label}</span>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  group.registry === 'basic'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                {group.registryLabel}
              </span>
            </div>
            <span className="text-xs text-gray-500">{group.count.toLocaleString()} รายการ</span>
          </div>

          {/* Rows table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-blue-700 text-white text-xs">
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">รหัส (HIS)</th>
                  <th className="text-left px-3 py-2 font-medium">ชื่อ (HIS)</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">รหัสมาตรฐาน</th>
                  <th className="text-left px-3 py-2 font-medium">ชื่อมาตรฐาน</th>
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {group.rows.map((row, i) => (
                  <tr key={i} className={row.mapped ? 'bg-white' : 'bg-red-50'}>
                    <td className="px-3 py-2 text-gray-700 font-mono text-xs whitespace-nowrap">{row.code}</td>
                    <td className="px-3 py-2 text-gray-700 max-w-[220px] truncate" title={row.name}>
                      {!row.mapped && (
                        <span className="mr-1 text-red-500" title="ยังไม่ map">⚠</span>
                      )}
                      {row.name}
                    </td>
                    <td className="px-3 py-2 text-gray-600 font-mono text-xs whitespace-nowrap">
                      {row.std_code ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-[220px] truncate" title={row.std_name ?? undefined}>
                      {row.std_name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.mapped ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          จับคู่แล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          ยังไม่ map
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
