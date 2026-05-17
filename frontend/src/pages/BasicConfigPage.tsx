import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { isUnmapped, summarize, BasicRow } from '../data/basicConfigUtils'

function DataTable({ menu }: { menu: { key: string; label: string } }) {
  const qc = useQueryClient()
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['basic-config', menu.key],
    queryFn: () => axios.get<BasicRow[]>(`/api/basic-config/${menu.key}`).then(r => r.data),
    staleTime: 60_000,
  })
  const { data: opts = [] } = useQuery({
    queryKey: ['basic-config-opts', menu.key],
    queryFn: () => axios.get<{ code: string; name: string }[]>(`/api/basic-config/${menu.key}/std-options`).then(r => r.data),
    staleTime: 300_000,
  })
  const save = useMutation({
    mutationFn: (v: { code: string; std_code: string }) =>
      axios.put(`/api/basic-config/${menu.key}/${encodeURIComponent(v.code)}`, { std_code: v.std_code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['basic-config', menu.key] }),
  })

  if (isLoading) return <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
  if (isError) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">เกิดข้อผิดพลาดในการดึงข้อมูล</div>

  const s = summarize(rows)
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
            {rows.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">ไม่พบข้อมูล</td></tr>
            ) : rows.map(row => (
              <tr key={row.code} className={isUnmapped(row) ? 'bg-red-50' : 'bg-white'}>
                <td className="px-3 py-2 text-gray-700">{row.code}</td>
                <td className="px-3 py-2 text-gray-700">
                  {isUnmapped(row) && <span className="mr-1 text-red-500" title="ยังไม่ map">⚠</span>}
                  {row.name}
                </td>
                <td className="px-3 py-2">
                  <select
                    defaultValue={row.std_code ?? ''}
                    onChange={e => save.mutate({ code: row.code, std_code: e.target.value })}
                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full max-w-md"
                  >
                    <option value="">— ยังไม่ map —</option>
                    {opts.map(o => (
                      <option key={o.code} value={o.code}>{o.code} — {o.name}</option>
                    ))}
                  </select>
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

export function BasicConfigPage() {
  const { data: menus = [] } = useQuery({
    queryKey: ['basic-config-menus'],
    queryFn: () => axios.get<{ key: string; label: string; pending: boolean }[]>('/api/basic-config').then(r => r.data),
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
          <p className="text-xs font-semibold text-gray-600">ตั้งค่าข้อมูลพื้นฐาน 43 แฟ้ม</p>
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
          <DataTable menu={activeMenu} />
        )}
      </div>
    </div>
  )
}
