import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  isUnmapped,
  summarize,
  filterOptions,
  autoMatchSuggestions,
  BasicRow,
  StdOption,
} from '../../data/basicConfigUtils'

// ─── StdCombobox ─────────────────────────────────────────────────────────────
function StdCombobox({
  value,
  options,
  onChange,
}: {
  value: string
  options: StdOption[]
  onChange: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Label for the currently selected value
  const selectedLabel = value
    ? (() => {
        const found = options.find(o => o.code === value)
        return found ? `${found.code} — ${found.name}` : value
      })()
    : ''

  // Filtered options capped at 200 for perf
  const filtered = filterOptions(options, query).slice(0, 200)

  function openDropdown() {
    setQuery('')
    setOpen(true)
  }

  function closeDropdown() {
    setOpen(false)
    setQuery('')
  }

  function selectItem(code: string) {
    onChange(code)
    closeDropdown()
  }

  function handleFocus() {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    openDropdown()
  }

  function handleBlur() {
    blurTimerRef.current = setTimeout(() => {
      closeDropdown()
    }, 150)
  }

  function handleListMouseDown(e: React.MouseEvent) {
    // Prevent the input blur from firing before the click resolves
    e.preventDefault()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      closeDropdown()
      inputRef.current?.blur()
    } else if (e.key === 'Enter') {
      if (filtered.length > 0) {
        selectItem(filtered[0]!.code)
        inputRef.current?.blur()
      }
    } else if (!open) {
      openDropdown()
    }
  }

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    }
  }, [])

  return (
    <div className="relative w-full max-w-md">
      <input
        ref={inputRef}
        type="text"
        className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
        placeholder={selectedLabel || '— ยังไม่ map —'}
        value={open ? query : selectedLabel}
        onChange={e => {
          setQuery(e.target.value)
          if (!open) setOpen(true)
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        aria-haspopup="listbox"
        aria-expanded={open}
      />
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          onMouseDown={handleListMouseDown}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto text-sm"
        >
          {/* Explicit "no mapping" option */}
          <li
            role="option"
            aria-selected={value === ''}
            className="px-3 py-1.5 cursor-pointer text-gray-500 hover:bg-blue-50"
            onMouseDown={() => selectItem('')}
          >
            — ยังไม่ map —
          </li>
          {filtered.length === 0 ? (
            <li className="px-3 py-1.5 text-gray-400 italic">ไม่พบรายการ</li>
          ) : (
            filtered.map(o => (
              <li
                key={o.code}
                role="option"
                aria-selected={o.code === value}
                className={`px-3 py-1.5 cursor-pointer hover:bg-blue-50 ${
                  o.code === value ? 'bg-blue-100 font-medium' : ''
                }`}
                onMouseDown={() => selectItem(o.code)}
              >
                {o.code} — {o.name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

// ─── DataTable ────────────────────────────────────────────────────────────────
function DataTable({
  menu,
  apiBase,
}: {
  menu: { key: string; label: string; pending: boolean }
  apiBase: string
}) {
  const qc = useQueryClient()
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: [apiBase, menu.key],
    queryFn: () => axios.get<BasicRow[]>(`${apiBase}/${menu.key}`).then(r => r.data),
    staleTime: 60_000,
  })
  const { data: opts = [] } = useQuery({
    queryKey: [`${apiBase}-opts`, menu.key],
    queryFn: () => axios.get<StdOption[]>(`${apiBase}/${menu.key}/std-options`).then(r => r.data),
    staleTime: 300_000,
  })
  const save = useMutation({
    mutationFn: (v: { code: string; std_code: string }) =>
      axios.put(`${apiBase}/${menu.key}/${encodeURIComponent(v.code)}`, { std_code: v.std_code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [apiBase, menu.key] }),
  })

  // ── Filter toggle state ──
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false)

  // ── Auto-match state ──
  const [matching, setMatching] = useState(false)
  const [autoMatchMsg, setAutoMatchMsg] = useState<string | null>(null)

  if (isLoading) return <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
  if (isError) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">เกิดข้อผิดพลาดในการดึงข้อมูล</div>

  // Summary always over full rows (not filtered)
  const s = summarize(rows)

  // Displayed rows respect the filter toggle
  const displayedRows = showUnmappedOnly ? rows.filter(isUnmapped) : rows

  async function handleAutoMatch() {
    setAutoMatchMsg(null)
    const suggestions = autoMatchSuggestions(rows, opts)
    if (suggestions.length === 0) {
      setAutoMatchMsg('ไม่พบรายการที่จับคู่อัตโนมัติได้')
      return
    }
    setMatching(true)
    try {
      for (const m of suggestions) {
        await save.mutateAsync(m)
      }
      setAutoMatchMsg(`จับคู่อัตโนมัติ ${suggestions.length} รายการ`)
    } finally {
      setMatching(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b flex items-center justify-between">
        <p className="text-sm text-gray-600 font-medium">{menu.label}</p>
        <p className="text-xs text-gray-500">
          ทั้งหมด {s.total.toLocaleString()} ·{' '}
          <span className={s.unmapped ? 'text-red-600 font-semibold' : 'text-green-600'}>
            ยังไม่ map {s.unmapped.toLocaleString()}
          </span>
        </p>
      </div>
      {menu.pending && (
        <div className="px-4 py-2 text-sm text-amber-700 bg-amber-50 border-b">
          หมวดนี้ยังไม่พร้อมแก้ไข (รอยืนยันการจับคู่รหัส)
        </div>
      )}

      {/* Controls bar — only for non-pending */}
      {!menu.pending && (
        <div className="px-4 py-2 border-b flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showUnmappedOnly}
              onChange={e => setShowUnmappedOnly(e.target.checked)}
              className="accent-blue-600"
            />
            แสดงเฉพาะที่ยังไม่ map
          </label>

          <button
            onClick={handleAutoMatch}
            disabled={matching}
            className="px-3 py-1 text-sm rounded border border-blue-600 text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {matching ? 'กำลังจับคู่...' : 'จับคู่อัตโนมัติ'}
          </button>

          {autoMatchMsg && (
            <span className="text-sm text-gray-600">{autoMatchMsg}</span>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-700 text-white">
            <tr>
              <th className="text-left px-3 py-2 font-medium w-20">รหัส</th>
              <th className="text-left px-3 py-2 font-medium w-56">ชื่อ (HIS)</th>
              <th className="text-left px-3 py-2 font-medium">รหัสมาตรฐาน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayedRows.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">ไม่พบข้อมูล</td></tr>
            ) : displayedRows.map(row => (
              <tr key={row.code} className={isUnmapped(row) ? 'bg-red-50' : 'bg-white'}>
                <td className="px-3 py-2 text-gray-700">{row.code}</td>
                <td className="px-3 py-2 text-gray-700">
                  {isUnmapped(row) && <span className="mr-1 text-red-500" title="ยังไม่ map">⚠</span>}
                  {row.name}
                </td>
                <td className="px-3 py-2">
                  {menu.pending ? (
                    <span className="text-gray-500">{row.std_code ?? '—'}</span>
                  ) : (
                    <StdCombobox
                      value={row.std_code ?? ''}
                      options={opts}
                      onChange={(std_code) => save.mutate({ code: row.code, std_code })}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {save.isError && <div className="px-4 py-2 text-sm text-red-700 bg-red-50">บันทึกไม่สำเร็จ</div>}
      {save.isSuccess && <div className="px-4 py-2 text-sm text-green-700 bg-green-50">บันทึกแล้ว</div>}
    </div>
  )
}

// ─── ConfigCatalog ────────────────────────────────────────────────────────────
export interface ConfigCatalogProps {
  apiBase: string      // e.g. '/api/basic-config' or '/api/eclaim-config'
  sidebarTitle: string // Thai label shown in the sidebar header
}

export function ConfigCatalog({ apiBase, sidebarTitle }: ConfigCatalogProps) {
  const { data: menus = [] } = useQuery({
    queryKey: [`${apiBase}-menus`],
    queryFn: () =>
      axios.get<{ key: string; label: string; pending: boolean }[]>(apiBase).then(r => r.data),
    staleTime: 300_000,
  })

  const [activeKey, setActiveKey] = useState<string | null>(null)
  const resolvedKey = activeKey ?? menus[0]?.key ?? null
  const activeMenu = menus.find(m => m.key === resolvedKey) ?? null

  return (
    <div className="flex gap-0 h-full -m-6">
      {/* Sub-menu sidebar */}
      <div className="w-56 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="px-3 py-2.5 border-b bg-gray-50">
          <p className="text-xs font-semibold text-gray-600">{sidebarTitle}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{menus.length} รายการ</p>
        </div>
        <nav>
          {menus.map(m => (
            <button
              key={m.key}
              onClick={() => setActiveKey(m.key)}
              className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-50 flex items-center justify-between gap-2 transition-colors ${
                resolvedKey === m.key
                  ? 'bg-blue-50 text-blue-800 font-semibold border-l-2 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="leading-snug">{m.label}</span>
              {m.pending && (
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="รอ SQL" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeMenu == null ? (
          <div className="p-12 text-center text-gray-400">กำลังโหลดเมนู...</div>
        ) : (
          <DataTable menu={activeMenu} apiBase={apiBase} />
        )}
      </div>
    </div>
  )
}
