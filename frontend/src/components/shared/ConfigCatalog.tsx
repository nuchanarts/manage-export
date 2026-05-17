import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  isUnmapped,
  summarize,
  filterOptions,
  filterRows,
  autoMatchSuggestions,
  sortRows,
  resolveComboCommit,
  BasicRow,
  StdOption,
  SortKey,
  SortDir,
} from '../../data/basicConfigUtils'

// ─── Menu item type (additive: dual + optional labels) ────────────────────────
interface MenuItem {
  key: string
  label: string
  pending: boolean
  dual?: boolean
  field1Label?: string
  field2Label?: string
}

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
      // On blur: if the user typed something that doesn't match any option exactly,
      // commit the raw typed value (free-text/custom code entry).
      if (open && query.trim() !== '') {
        const commit = resolveComboCommit(query, options)
        // Only fire onChange if the value is actually different from current
        if (commit !== value) {
          onChange(commit)
        }
      }
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
      e.preventDefault()
      if (filtered.length > 0) {
        // There are matching options — select the first (existing behaviour)
        selectItem(filtered[0]!.code)
      } else {
        // No matching option: commit the raw typed query (free-text / custom code)
        const commit = resolveComboCommit(query, options)
        if (commit !== value) onChange(commit)
        closeDropdown()
      }
      inputRef.current?.blur()
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
            <li
              role="option"
              aria-selected={false}
              className="px-3 py-1.5 cursor-pointer text-blue-600 hover:bg-blue-50 italic"
              onMouseDown={() => {
                const commit = resolveComboCommit(query, options)
                if (commit !== value) onChange(commit)
                closeDropdown()
              }}
            >
              {query.trim() ? `ใช้รหัส "${query.trim()}"` : 'ไม่พบรายการ'}
            </li>
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
  menu: MenuItem
  apiBase: string
}) {
  const isDual = !!menu.dual
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
  // Secondary options — only fetched for dual categories
  const { data: opts2 = [] } = useQuery({
    queryKey: [`${apiBase}-opts2`, menu.key],
    queryFn: () => axios.get<StdOption[]>(`${apiBase}/${menu.key}/std-options2`).then(r => r.data),
    staleTime: 300_000,
    enabled: isDual,
  })
  const save = useMutation({
    mutationFn: (v: { code: string; std_code: string }) =>
      axios.put(`${apiBase}/${menu.key}/${encodeURIComponent(v.code)}`, { std_code: v.std_code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [apiBase, menu.key] }),
  })
  const save2 = useMutation({
    mutationFn: (v: { code: string; std_code2: string }) =>
      axios.put(`${apiBase}/${menu.key}/${encodeURIComponent(v.code)}`, { std_code2: v.std_code2 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [apiBase, menu.key] }),
  })

  // ── Filter toggle state ──
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false)

  // ── Row search state ──
  const [rowQuery, setRowQuery] = useState('')

  // ── Sort state ──
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null)

  function handleSortClick(key: SortKey) {
    setSort(prev => {
      if (prev === null || prev.key !== key) return { key, dir: 'asc' }
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
    })
  }

  function sortIndicator(key: SortKey): string {
    if (sort === null || sort.key !== key) return ' ⇅'
    return sort.dir === 'asc' ? ' ▲' : ' ▼'
  }

  // ── Column resize state ──
  // Default widths (px); persisted to localStorage keyed by apiBase for convenience.
  const STORAGE_KEY = `col-widths:${apiBase}`
  const defaultWidths = { code: 80, name: 224, std_code: 240, std_code2: 240 }
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return { ...defaultWidths, ...JSON.parse(stored) }
    } catch { /* ignore */ }
    return { ...defaultWidths }
  })

  const startColResize = useCallback((colKey: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()          // don't trigger sort
    const startX = e.clientX
    const startW = colWidths[colKey] ?? defaultWidths[colKey as keyof typeof defaultWidths] ?? 120
    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(60, startW + (ev.clientX - startX))
      setColWidths(prev => {
        const next = { ...prev, [colKey]: newW }
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
        return next
      })
    }
    const onUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [colWidths, STORAGE_KEY])

  // ── Auto-match state ──
  const [matching, setMatching] = useState(false)
  const [autoMatchMsg, setAutoMatchMsg] = useState<string | null>(null)

  if (isLoading) return <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
  if (isError) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">เกิดข้อผิดพลาดในการดึงข้อมูล</div>

  // Summary always over full rows (not filtered)
  const s = summarize(rows)

  // Displayed rows: unmapped filter → row search → sort
  const afterUnmappedFilter = showUnmappedOnly ? rows.filter(isUnmapped) : rows
  const afterSearch = filterRows(afterUnmappedFilter, rowQuery)
  const displayedRows = sort ? sortRows(afterSearch, sort.key, sort.dir) : afterSearch

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

      {/* Controls bar — search always visible; edit controls only for non-pending */}
      <div className="px-4 py-2 border-b flex flex-wrap items-center gap-4">
        <input
          type="text"
          value={rowQuery}
          onChange={e => setRowQuery(e.target.value)}
          placeholder="ค้นหารายการ..."
          className="border border-gray-300 rounded px-2 py-1 text-sm w-52"
          aria-label="ค้นหารายการ"
        />

        {!menu.pending && (
          <>
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
          </>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm table-fixed">
          <colgroup>
            <col style={{ width: colWidths.code }} />
            <col style={{ width: colWidths.name }} />
            <col style={{ width: colWidths.std_code }} />
            {isDual && <col style={{ width: colWidths.std_code2 }} />}
          </colgroup>
          <thead className="bg-blue-700 text-white">
            <tr>
              {/* Each <th> has a right-edge drag handle; the handle stops propagation so sort still works on th click */}
              <th
                className="text-left px-3 py-2 font-medium cursor-pointer select-none relative"
                onClick={() => handleSortClick('code')}
              >
                รหัส<span className="text-xs opacity-70">{sortIndicator('code')}</span>
                <span
                  className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-white/30"
                  onMouseDown={e => startColResize('code', e)}
                />
              </th>
              <th
                className="text-left px-3 py-2 font-medium cursor-pointer select-none relative"
                onClick={() => handleSortClick('name')}
              >
                ชื่อ (HIS)<span className="text-xs opacity-70">{sortIndicator('name')}</span>
                <span
                  className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-white/30"
                  onMouseDown={e => startColResize('name', e)}
                />
              </th>
              <th
                className="text-left px-3 py-2 font-medium cursor-pointer select-none relative"
                onClick={() => handleSortClick('std_code')}
              >
                {isDual ? (menu.field1Label ?? 'รหัสมาตรฐาน 1') : 'รหัสมาตรฐาน'}
                <span className="text-xs opacity-70">{sortIndicator('std_code')}</span>
                <span
                  className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-white/30"
                  onMouseDown={e => startColResize('std_code', e)}
                />
              </th>
              {isDual && (
                <th
                  className="text-left px-3 py-2 font-medium cursor-pointer select-none relative"
                  onClick={() => handleSortClick('std_code2')}
                >
                  {menu.field2Label ?? 'รหัสมาตรฐาน 2'}
                  <span className="text-xs opacity-70">{sortIndicator('std_code2')}</span>
                  <span
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-white/30"
                    onMouseDown={e => startColResize('std_code2', e)}
                  />
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayedRows.length === 0 ? (
              <tr><td colSpan={isDual ? 4 : 3} className="px-4 py-8 text-center text-gray-400">ไม่พบข้อมูล</td></tr>
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
                {isDual && (
                  <td className="px-3 py-2">
                    {menu.pending ? (
                      <span className="text-gray-500">{row.std_code2 ?? '—'}</span>
                    ) : (
                      <StdCombobox
                        value={row.std_code2 ?? ''}
                        options={opts2}
                        onChange={(std_code2) => save2.mutate({ code: row.code, std_code2 })}
                      />
                    )}
                  </td>
                )}
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
      axios.get<MenuItem[]>(apiBase).then(r => r.data),
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
