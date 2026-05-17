/**
 * DashboardPage.tsx — F4 Completeness Dashboard.
 *
 * Shows mapping completeness across all basic-config (43-file) and
 * eclaim-config categories before exporting. Fetches both /_summary endpoints
 * and renders summary cards + per-category tables with progress bars.
 *
 * No new npm dependencies. Uses native fetch + React state only.
 */

import { useState, useEffect, useCallback } from 'react'
import type {
  DryRunResult,
  DryRunCategoryResult,
  SnapshotListItem,
  SnapshotDiffResult,
  SnapshotRestoreResult,
} from '../data/basicConfigUtils'
import {
  formatDryRunHeadline,
  formatRestoreResult,
  formatSnapshotTs,
} from '../data/basicConfigUtils'

// ─── Types (mirrors backend /_summary response) ──────────────────────────────

interface CategorySummary {
  key: string
  label: string
  pending: boolean
  total?: number
  mapped?: number
  unmapped?: number
  percent?: number | null
  error?: boolean
}

interface RegistrySummary {
  registry: string
  totalCategories: number
  totalRows: number
  totalUnmapped: number
  overallPercent: number | null
  categories: CategorySummary[]
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function fetchSummary(apiBase: string): Promise<RegistrySummary> {
  const res = await fetch(`${apiBase}/_summary`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<RegistrySummary>
}

// ─── Sort helper: unmapped first (most unmapped on top), pending last ─────────

function sortCategories(cats: CategorySummary[]): CategorySummary[] {
  return [...cats].sort((a, b) => {
    // Pending always last
    if (a.pending && !b.pending) return 1
    if (!a.pending && b.pending) return -1
    if (a.pending && b.pending) return a.label.localeCompare(b.label, 'th')
    // Error rows after non-error
    if (a.error && !b.error) return 1
    if (!a.error && b.error) return -1
    // Most unmapped first
    const aU = a.unmapped ?? 0
    const bU = b.unmapped ?? 0
    if (bU !== aU) return bU - aU
    return a.label.localeCompare(b.label, 'th')
  })
}

// ─── Dry-run fetch helper ─────────────────────────────────────────────────────

async function fetchDryRun(apiBase: string): Promise<DryRunResult> {
  const res = await fetch(`${apiBase}/_dryrun`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<DryRunResult>
}

// ─── Dry-run UI sub-components ────────────────────────────────────────────────

function DryRunCategoryRow({ cat }: { cat: DryRunCategoryResult }) {
  const [open, setOpen] = useState(false)

  if (cat.pending) {
    return (
      <div className="px-4 py-2 text-xs text-yellow-700 flex items-center gap-2">
        <span className="font-medium">{cat.label}</span>
        <span className="bg-yellow-100 border border-yellow-200 px-1.5 py-0.5 rounded-full text-[10px]">รอยืนยัน</span>
      </div>
    )
  }

  if (cat.error) {
    return (
      <div className="px-4 py-2 text-xs text-red-600 flex items-center gap-2">
        <span className="font-medium">{cat.label}</span>
        <span className="bg-red-100 border border-red-200 px-1.5 py-0.5 rounded-full text-[10px]">ข้อผิดพลาด</span>
      </div>
    )
  }

  if ((cat.unmappedCount ?? 0) === 0) {
    return (
      <div className="px-4 py-2 text-xs text-green-700 flex items-center gap-2">
        <span className="text-green-500">✓</span>
        <span className="font-medium">{cat.label}</span>
        <span className="text-gray-400">ครบถ้วน</span>
      </div>
    )
  }

  return (
    <div className="border-t border-red-100 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-2 text-xs text-left flex items-center justify-between hover:bg-red-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-red-500 font-bold">✗</span>
          <span className="font-medium text-gray-800">{cat.label}</span>
          <span className="bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
            ยังไม่ map {cat.unmappedCount!.toLocaleString()} รายการ
          </span>
        </span>
        <span className="text-gray-400 text-[10px]">{open ? '▲ ซ่อน' : '▼ ดูตัวอย่าง'}</span>
      </button>
      {open && cat.samples && cat.samples.length > 0 && (
        <div className="px-6 pb-3 bg-red-50">
          <table className="text-[11px] w-full max-w-lg">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left pr-4 py-1 font-medium">รหัส</th>
                <th className="text-left py-1 font-medium">ชื่อ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100">
              {cat.samples.map(s => (
                <tr key={s.code}>
                  <td className="pr-4 py-0.5 font-mono text-red-700">{s.code}</td>
                  <td className="py-0.5 text-gray-700">{s.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(cat.unmappedCount ?? 0) > (cat.samples?.length ?? 0) && (
            <p className="text-[10px] text-gray-400 mt-1">
              แสดง {cat.samples.length} จาก {cat.unmappedCount!.toLocaleString()} รายการ
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function DryRunRegistryPanel({
  result,
  registryLabel,
}: {
  result: DryRunResult
  registryLabel: string
}) {
  const isPass = result.status === 'PASS'
  const headline = formatDryRunHeadline(result)

  return (
    <div className={`rounded-lg border overflow-hidden ${isPass ? 'border-green-200' : 'border-red-200'}`}>
      <div className={`px-4 py-3 flex items-center justify-between ${isPass ? 'bg-green-50' : 'bg-red-50'}`}>
        <div>
          <span className="font-semibold text-sm text-gray-800">{registryLabel}</span>
          <span className={`ml-3 font-bold text-sm ${isPass ? 'text-green-700' : 'text-red-700'}`}>
            {headline}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {result.totalCategories} หมวด
          {!isPass && ` · มีปัญหา ${result.categoriesWithIssues} หมวด`}
        </span>
      </div>
      <div className="bg-white divide-y divide-gray-100">
        {result.results.map(cat => (
          <DryRunCategoryRow key={cat.key} cat={cat} />
        ))}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ percent }: { percent: number | null | undefined }) {
  const pct = percent ?? 0
  const isComplete = pct >= 100
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-red-400'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className={`text-xs font-mono w-8 text-right ${isComplete ? 'text-green-700' : 'text-red-600'}`}>
        {percent == null ? '—' : `${pct}%`}
      </span>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  sub,
  accent,
}: {
  title: string
  value: string | number
  sub?: string
  accent?: 'green' | 'red' | 'blue' | 'default'
}) {
  const accentClasses: Record<string, string> = {
    green:   'bg-green-50  border-green-200  text-green-700',
    red:     'bg-red-50    border-red-200    text-red-700',
    blue:    'bg-blue-50   border-blue-200   text-blue-700',
    default: 'bg-white     border-gray-200   text-gray-800',
  }
  const cls = accentClasses[accent ?? 'default'] ?? accentClasses['default']!
  return (
    <div className={`rounded-lg border px-5 py-4 ${cls}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{title}</p>
      <p className="text-2xl font-bold mt-0.5">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

function RegistrySection({
  summary,
  registryLabel,
}: {
  summary: RegistrySummary
  registryLabel: string
}) {
  const sorted = sortCategories(summary.categories)
  const hasUnmapped = summary.totalUnmapped > 0

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Section header */}
      <div className="px-5 py-3 bg-gray-50 border-b flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-gray-800 text-sm">{registryLabel}</span>
          <span className="ml-2 text-xs text-gray-500">
            {summary.totalCategories} หมวด · {summary.totalRows.toLocaleString()} รายการ
          </span>
        </div>
        <div className="flex items-center gap-4">
          {hasUnmapped && (
            <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              ยังไม่ map {summary.totalUnmapped.toLocaleString()} รายการ
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">ภาพรวม</span>
            <ProgressBar percent={summary.overallPercent} />
          </div>
        </div>
      </div>

      {/* Category table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-blue-700 text-white text-xs">
              <th className="text-left px-4 py-2 font-medium">หมวด</th>
              <th className="text-right px-3 py-2 font-medium">ทั้งหมด</th>
              <th className="text-right px-3 py-2 font-medium">จับคู่แล้ว</th>
              <th className="text-right px-3 py-2 font-medium">ยังไม่ map</th>
              <th className="px-4 py-2 font-medium" style={{ minWidth: '160px' }}>ความครบถ้วน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map(cat => {
              const hasErr   = !!cat.error
              const isPend   = cat.pending
              const hasUnmap = (cat.unmapped ?? 0) > 0
              const rowBg    = hasErr || isPend ? '' : hasUnmap ? 'bg-red-50' : ''
              return (
                <tr key={cat.key} className={rowBg}>
                  {/* Label */}
                  <td className="px-4 py-2 text-gray-800 font-medium">
                    {cat.label}
                    {isPend && (
                      <span className="ml-2 text-[10px] font-medium bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-full align-middle">
                        รอยืนยัน
                      </span>
                    )}
                    {hasErr && (
                      <span className="ml-2 text-[10px] font-medium bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full align-middle">
                        ข้อผิดพลาด
                      </span>
                    )}
                  </td>
                  {/* Total */}
                  <td className="px-3 py-2 text-right text-gray-600 tabular-nums">
                    {isPend || hasErr ? <span className="text-gray-300">—</span> : cat.total?.toLocaleString() ?? '—'}
                  </td>
                  {/* Mapped */}
                  <td className="px-3 py-2 text-right text-green-700 tabular-nums font-medium">
                    {isPend || hasErr ? <span className="text-gray-300">—</span> : cat.mapped?.toLocaleString() ?? '—'}
                  </td>
                  {/* Unmapped */}
                  <td className={`px-3 py-2 text-right tabular-nums font-medium ${hasUnmap ? 'text-red-600' : 'text-gray-400'}`}>
                    {isPend || hasErr ? <span className="text-gray-300">—</span> : (cat.unmapped ?? 0) > 0 ? cat.unmapped!.toLocaleString() : '0'}
                  </td>
                  {/* Progress */}
                  <td className="px-4 py-2">
                    {isPend || hasErr
                      ? <span className="text-xs text-gray-400 italic">{isPend ? 'รอยืนยัน' : 'ข้อผิดพลาด'}</span>
                      : <ProgressBar percent={cat.percent} />
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── F10: Snapshot helpers ────────────────────────────────────────────────────

async function fetchSnapshots(apiBase: string): Promise<SnapshotListItem[]> {
  const res = await fetch(`${apiBase}/_snapshots`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<SnapshotListItem[]>
}

async function postSnapshot(apiBase: string, label: string): Promise<{ id: number }> {
  const res = await fetch(`${apiBase}/_snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<{ id: number }>
}

async function fetchSnapshotDiff(apiBase: string, id: number): Promise<SnapshotDiffResult> {
  const res = await fetch(`${apiBase}/_snapshots/${id}/diff`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<SnapshotDiffResult>
}

async function postSnapshotRestore(apiBase: string, id: number): Promise<SnapshotRestoreResult> {
  const res = await fetch(`${apiBase}/_snapshots/${id}/restore`, { method: 'POST' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<SnapshotRestoreResult>
}

// ─── F10: SnapshotRegistryPanel sub-component ─────────────────────────────────

function SnapshotRegistryPanel({
  apiBase,
  registryLabel,
}: {
  apiBase: string
  registryLabel: string
}) {
  const [snapshots, setSnapshots] = useState<SnapshotListItem[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  // Per-snapshot diff/restore state
  const [diffLoading, setDiffLoading] = useState<Record<number, boolean>>({})
  const [diffResult, setDiffResult] = useState<Record<number, SnapshotDiffResult>>({})
  const [diffError, setDiffError] = useState<Record<number, string>>({})
  const [restoreLoading, setRestoreLoading] = useState<Record<number, boolean>>({})
  const [restoreResult, setRestoreResult] = useState<Record<number, SnapshotRestoreResult>>({})
  const [restoreError, setRestoreError] = useState<Record<number, string>>({})

  const loadSnapshots = useCallback(async () => {
    setLoadingList(true)
    setListError(null)
    try {
      const rows = await fetchSnapshots(apiBase)
      setSnapshots(rows)
    } catch (e) {
      setListError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingList(false)
    }
  }, [apiBase])

  useEffect(() => { void loadSnapshots() }, [loadSnapshots])

  async function handleSave() {
    const label = window.prompt('ชื่อสแน็ปช็อต (เช่น before-update-2026):', '')
    if (label == null) return  // cancelled
    const trimmed = label.trim()
    if (!trimmed) { setSaveError('กรุณาระบุชื่อสแน็ปช็อต'); return }
    if (trimmed.length > 120) { setSaveError('ชื่อสแน็ปช็อตต้องไม่เกิน 120 ตัวอักษร'); return }

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)
    try {
      const { id } = await postSnapshot(apiBase, trimmed)
      setSaveSuccess(`บันทึกสแน็ปช็อต #${id} เรียบร้อย`)
      await loadSnapshots()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDiff(id: number) {
    setDiffLoading(prev => ({ ...prev, [id]: true }))
    setDiffError(prev => { const n = { ...prev }; delete n[id]; return n })
    setDiffResult(prev => { const n = { ...prev }; delete n[id]; return n })
    try {
      const diff = await fetchSnapshotDiff(apiBase, id)
      setDiffResult(prev => ({ ...prev, [id]: diff }))
    } catch (e) {
      setDiffError(prev => ({ ...prev, [id]: e instanceof Error ? e.message : String(e) }))
    } finally {
      setDiffLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  async function handleRestore(id: number, label: string) {
    const ok = window.confirm(`กู้คืนสแน็ปช็อตนี้? จะเขียนทับ mapping ปัจจุบัน\n\n#${id}: ${label}`)
    if (!ok) return

    setRestoreLoading(prev => ({ ...prev, [id]: true }))
    setRestoreError(prev => { const n = { ...prev }; delete n[id]; return n })
    setRestoreResult(prev => { const n = { ...prev }; delete n[id]; return n })
    try {
      const result = await postSnapshotRestore(apiBase, id)
      setRestoreResult(prev => ({ ...prev, [id]: result }))
      // Refresh snapshot list after restore
      await loadSnapshots()
    } catch (e) {
      setRestoreError(prev => ({ ...prev, [id]: e instanceof Error ? e.message : String(e) }))
    } finally {
      setRestoreLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-gray-50 border-b flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-gray-800 text-sm">{registryLabel}</span>
          <span className="ml-2 text-xs text-gray-500">{snapshots.length} สแน็ปช็อต</span>
        </div>
        <button
          type="button"
          onClick={() => { void handleSave() }}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white transition-colors shadow-sm"
        >
          {saving ? '…กำลังบันทึก' : '💾 บันทึกสแน็ปช็อต'}
        </button>
      </div>

      {/* Save feedback */}
      {saveSuccess && (
        <div className="mx-4 mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
          {saveSuccess}
        </div>
      )}
      {saveError && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          เกิดข้อผิดพลาด: {saveError}
        </div>
      )}

      {/* List loading / error */}
      {loadingList && (
        <div className="p-4 text-xs text-gray-400 flex items-center gap-2">
          <svg className="animate-spin h-3 w-3 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          กำลังโหลด…
        </div>
      )}
      {!loadingList && listError && (
        <div className="mx-4 my-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          เกิดข้อผิดพลาด: {listError}
        </div>
      )}

      {/* Empty state */}
      {!loadingList && !listError && snapshots.length === 0 && (
        <div className="px-5 py-6 text-center text-xs text-gray-400">
          ยังไม่มีสแน็ปช็อต — กดปุ่ม "บันทึกสแน็ปช็อต" เพื่อบันทึกสถานะปัจจุบัน
        </div>
      )}

      {/* Snapshot list */}
      {!loadingList && snapshots.length > 0 && (
        <ul className="divide-y divide-gray-100">
          {snapshots.map(snap => (
            <li key={snap.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                {/* Info */}
                <div className="min-w-0">
                  <span className="font-medium text-sm text-gray-800 mr-2">#{snap.id}</span>
                  <span className="text-sm text-gray-700">{snap.label}</span>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatSnapshotTs(snap.ts)} · {snap.actor}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => { void handleDiff(snap.id) }}
                    disabled={!!diffLoading[snap.id]}
                    className="px-2.5 py-1 rounded text-xs font-medium border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {diffLoading[snap.id] ? '…' : '🔍 ดูส่วนต่าง'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { void handleRestore(snap.id, snap.label) }}
                    disabled={!!restoreLoading[snap.id]}
                    className="px-2.5 py-1 rounded text-xs font-medium border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 disabled:opacity-50 transition-colors"
                  >
                    {restoreLoading[snap.id] ? '…กำลังกู้คืน' : '↩ กู้คืน'}
                  </button>
                </div>
              </div>

              {/* Diff error */}
              {diffError[snap.id] && (
                <div className="mt-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  เกิดข้อผิดพลาด (diff): {diffError[snap.id]}
                </div>
              )}

              {/* Diff result */}
              {diffResult[snap.id] && (
                <div className="mt-2">
                  {diffResult[snap.id]!.totalChanged === 0 ? (
                    <div className="px-3 py-1.5 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                      ไม่มีความแตกต่าง — mapping ปัจจุบันตรงกับสแน็ปช็อตนี้
                    </div>
                  ) : (
                    <div className="border border-blue-100 rounded overflow-hidden">
                      <div className="px-3 py-1.5 bg-blue-50 text-xs font-medium text-blue-700">
                        มีความแตกต่าง {diffResult[snap.id]!.totalChanged} รายการ
                      </div>
                      <div className="overflow-x-auto max-h-40 overflow-y-auto">
                        <table className="text-[11px] w-full">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500">
                              <th className="text-left px-3 py-1 font-medium">หมวด</th>
                              <th className="text-left px-2 py-1 font-medium">รหัส</th>
                              <th className="text-left px-2 py-1 font-medium">ฟิลด์</th>
                              <th className="text-left px-2 py-1 font-medium">เดิม</th>
                              <th className="text-left px-2 py-1 font-medium">ปัจจุบัน</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {diffResult[snap.id]!.changed.slice(0, 50).map((d, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-0.5 text-gray-600">{d.category}</td>
                                <td className="px-2 py-0.5 font-mono text-gray-800">{d.code}</td>
                                <td className="px-2 py-0.5 text-gray-500">{d.field}</td>
                                <td className="px-2 py-0.5 text-red-600">{d.from ?? '(ว่าง)'}</td>
                                <td className="px-2 py-0.5 text-green-700">{d.to ?? '(ว่าง)'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {diffResult[snap.id]!.totalChanged > 50 && (
                          <p className="text-[10px] text-gray-400 px-3 py-1">
                            แสดง 50 จาก {diffResult[snap.id]!.totalChanged} รายการ
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Restore error */}
              {restoreError[snap.id] && (
                <div className="mt-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  เกิดข้อผิดพลาด (กู้คืน): {restoreError[snap.id]}
                </div>
              )}

              {/* Restore result */}
              {restoreResult[snap.id] && (
                <div className="mt-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                  {formatRestoreResult(restoreResult[snap.id]!)}
                  {restoreResult[snap.id]!.errors.length > 0 && (
                    <ul className="mt-1 list-disc list-inside text-red-600">
                      {restoreResult[snap.id]!.errors.slice(0, 10).map((e, i) => (
                        <li key={i}>{e.category}/{e.code}: {e.error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DashboardPage() {
  const [basicSummary,  setBasicSummary]  = useState<RegistrySummary | null>(null)
  const [eclaimSummary, setEclaimSummary] = useState<RegistrySummary | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ── F12: Dry-run state ────────────────────────────────────────────────────
  const [dryRunLoading,      setDryRunLoading]      = useState(false)
  const [dryRunError,        setDryRunError]        = useState<string | null>(null)
  const [dryRunBasic,        setDryRunBasic]        = useState<DryRunResult | null>(null)
  const [dryRunEclaim,       setDryRunEclaim]       = useState<DryRunResult | null>(null)
  const [dryRunPanelVisible, setDryRunPanelVisible] = useState(false)

  async function handleDryRun() {
    setDryRunLoading(true)
    setDryRunError(null)
    setDryRunBasic(null)
    setDryRunEclaim(null)
    setDryRunPanelVisible(true)

    const [basicResult, eclaimResult] = await Promise.allSettled([
      fetchDryRun('/api/basic-config'),
      fetchDryRun('/api/eclaim-config'),
    ])

    if (basicResult.status === 'fulfilled') {
      setDryRunBasic(basicResult.value)
    } else {
      const msg = basicResult.reason instanceof Error ? basicResult.reason.message : String(basicResult.reason)
      setDryRunError(prev => prev ? `${prev} | 43แฟ้ม: ${msg}` : `43แฟ้ม: ${msg}`)
    }

    if (eclaimResult.status === 'fulfilled') {
      setDryRunEclaim(eclaimResult.value)
    } else {
      const msg = eclaimResult.reason instanceof Error ? eclaimResult.reason.message : String(eclaimResult.reason)
      setDryRunError(prev => prev ? `${prev} | E-Claim: ${msg}` : `E-Claim: ${msg}`)
    }

    setDryRunLoading(false)
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setErrorMsg(null)

      const [basicResult, eclaimResult] = await Promise.allSettled([
        fetchSummary('/api/basic-config'),
        fetchSummary('/api/eclaim-config'),
      ])

      if (cancelled) return

      if (basicResult.status === 'fulfilled') {
        setBasicSummary(basicResult.value)
      } else {
        setErrorMsg(prev => {
          const msg = basicResult.reason instanceof Error ? basicResult.reason.message : String(basicResult.reason)
          return prev ? `${prev} | basic: ${msg}` : `basic: ${msg}`
        })
      }

      if (eclaimResult.status === 'fulfilled') {
        setEclaimSummary(eclaimResult.value)
      } else {
        setErrorMsg(prev => {
          const msg = eclaimResult.reason instanceof Error ? eclaimResult.reason.message : String(eclaimResult.reason)
          return prev ? `${prev} | eclaim: ${msg}` : `eclaim: ${msg}`
        })
      }

      setLoading(false)
    }

    void load()
    return () => { cancelled = true }
  }, [])

  // ── Derived overall stats ──────────────────────────────────────────────────
  const totalCategories = (basicSummary?.totalCategories ?? 0) + (eclaimSummary?.totalCategories ?? 0)
  const totalRows       = (basicSummary?.totalRows ?? 0) + (eclaimSummary?.totalRows ?? 0)
  const totalUnmapped   = (basicSummary?.totalUnmapped ?? 0) + (eclaimSummary?.totalUnmapped ?? 0)
  const totalMapped     = totalRows - totalUnmapped
  const overallPercent  = totalRows > 0 ? Math.round((totalMapped / totalRows) * 100) : null

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="bg-white rounded-lg shadow p-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-0.5">ภาพรวมความครบถ้วน</h2>
          <p className="text-xs text-gray-500">ตรวจความครบถ้วนก่อนส่งออก 43 แฟ้ม</p>
        </div>
        {/* F12: Dry-run button */}
        <button
          type="button"
          onClick={() => { void handleDryRun() }}
          disabled={dryRunLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white transition-colors shadow-sm"
        >
          {dryRunLoading
            ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                กำลังตรวจสอบ…
              </>
            )
            : '🧪 ทดสอบส่งออก (Dry-run)'
          }
        </button>
      </div>

      {/* F12: Dry-run result panel */}
      {dryRunPanelVisible && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
            <span className="font-semibold text-sm text-gray-800">ผลการทดสอบส่งออก (Dry-run)</span>
            <button
              type="button"
              onClick={() => setDryRunPanelVisible(false)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕ ปิด
            </button>
          </div>

          {/* Loading */}
          {dryRunLoading && (
            <div className="p-8 flex justify-center items-center">
              <div className="flex items-center gap-3 text-gray-500 text-sm">
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>กำลังจำลองการส่งออก…</span>
              </div>
            </div>
          )}

          {/* Error */}
          {!dryRunLoading && dryRunError && (
            <div className="p-4">
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                เกิดข้อผิดพลาด: {dryRunError}
              </div>
            </div>
          )}

          {/* Results */}
          {!dryRunLoading && (dryRunBasic || dryRunEclaim) && (
            <div className="p-4 space-y-3">
              {dryRunBasic && (
                <DryRunRegistryPanel result={dryRunBasic} registryLabel="43 แฟ้ม (Basic Config)" />
              )}
              {dryRunEclaim && (
                <DryRunRegistryPanel result={dryRunEclaim} registryLabel="E-Claim Config" />
              )}
            </div>
          )}
        </div>
      )}

      {/* F10: Snapshot / versioning panel */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b">
          <h3 className="font-semibold text-sm text-gray-800">เวอร์ชัน/สแน็ปช็อต mapping</h3>
          <p className="text-xs text-gray-500 mt-0.5">บันทึกสถานะ mapping เพื่อดูส่วนต่างหรือกู้คืนในภายหลัง</p>
        </div>
        <div className="p-4 space-y-4">
          <SnapshotRegistryPanel apiBase="/api/basic-config" registryLabel="43 แฟ้ม (Basic Config)" />
          <SnapshotRegistryPanel apiBase="/api/eclaim-config" registryLabel="E-Claim Config" />
        </div>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          เกิดข้อผิดพลาด: {errorMsg}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-12 flex justify-center items-center">
          <div className="flex items-center gap-3 text-gray-500 text-sm">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>กำลังโหลดข้อมูลความครบถ้วน…</span>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {!loading && (basicSummary || eclaimSummary) && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard
              title="ความครบถ้วนรวม"
              value={overallPercent != null ? `${overallPercent}%` : '—'}
              sub={`${totalMapped.toLocaleString()} / ${totalRows.toLocaleString()} รายการ`}
              accent={overallPercent === 100 ? 'green' : overallPercent != null ? 'red' : 'default'}
            />
            <SummaryCard
              title="43 แฟ้ม"
              value={basicSummary?.overallPercent != null ? `${basicSummary.overallPercent}%` : '—'}
              sub={`${((basicSummary?.totalRows ?? 0) - (basicSummary?.totalUnmapped ?? 0)).toLocaleString()} / ${(basicSummary?.totalRows ?? 0).toLocaleString()} รายการ`}
              accent={basicSummary?.overallPercent === 100 ? 'green' : basicSummary?.overallPercent != null ? 'blue' : 'default'}
            />
            <SummaryCard
              title="E-Claim"
              value={eclaimSummary?.overallPercent != null ? `${eclaimSummary.overallPercent}%` : '—'}
              sub={`${((eclaimSummary?.totalRows ?? 0) - (eclaimSummary?.totalUnmapped ?? 0)).toLocaleString()} / ${(eclaimSummary?.totalRows ?? 0).toLocaleString()} รายการ`}
              accent={eclaimSummary?.overallPercent === 100 ? 'green' : eclaimSummary?.overallPercent != null ? 'blue' : 'default'}
            />
            <SummaryCard
              title="ยังไม่ map (รวม)"
              value={totalUnmapped.toLocaleString()}
              sub={`${totalCategories} หมวด`}
              accent={totalUnmapped > 0 ? 'red' : 'green'}
            />
          </div>

          {/* Per-registry sections */}
          {basicSummary && (
            <RegistrySection summary={basicSummary} registryLabel="43 แฟ้ม (Basic Config)" />
          )}
          {eclaimSummary && (
            <RegistrySection summary={eclaimSummary} registryLabel="E-Claim Config" />
          )}
        </>
      )}

      {/* Empty state (both failed) */}
      {!loading && !basicSummary && !eclaimSummary && !errorMsg && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400 text-sm">
          ไม่พบข้อมูลความครบถ้วน
        </div>
      )}
    </div>
  )
}
