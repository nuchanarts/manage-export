/**
 * SnapshotsPage.tsx — F10 Snapshot / Versioning page.
 *
 * Standalone page for saving, diffing, and restoring mapping snapshots
 * for both the basic-config (43-file) and eclaim-config registries.
 * Extracted from DashboardPage so it lives under its own nav item
 * (last child of the 'ตั้งค่าข้อมูลพื้นฐาน' group).
 *
 * No new dependencies — uses native fetch + React state only.
 * Snapshot helper types/format fns are imported from basicConfigUtils.ts.
 */

import { useState, useEffect, useCallback } from 'react'
import type {
  SnapshotListItem,
  SnapshotDiffResult,
  SnapshotRestoreResult,
} from '../data/basicConfigUtils'
import {
  formatRestoreResult,
  formatSnapshotTs,
} from '../data/basicConfigUtils'

// ─── Fetch helpers ────────────────────────────────────────────────────────────

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

// ─── SnapshotRegistryPanel sub-component ─────────────────────────────────────

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

// ─── Main Page Component ──────────────────────────────────────────────────────

export function SnapshotsPage() {
  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="text-lg font-bold text-gray-800 mb-0.5">เวอร์ชัน/สแน็ปช็อต mapping</h2>
        <p className="text-xs text-gray-500">บันทึกสถานะ mapping เพื่อดูส่วนต่างหรือกู้คืนในภายหลัง</p>
      </div>

      {/* Snapshot panels — one per registry */}
      <SnapshotRegistryPanel apiBase="/api/basic-config" registryLabel="43 แฟ้ม (Basic Config)" />
      <SnapshotRegistryPanel apiBase="/api/eclaim-config" registryLabel="E-Claim Config" />
    </div>
  )
}
