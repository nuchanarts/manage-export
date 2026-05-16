import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'

interface SubMenu {
  key: string
  label: string
  apiPath?: string          // GET /api/basic-config/{apiPath}
  columns?: ColDef[]        // คอลัมน์ที่แสดง
}

interface ColDef {
  field: string
  header: string
  width?: string
}

const SUB_MENUS: SubMenu[] = [
  {
    key: 'occupation',
    label: 'อาชีพ',
    apiPath: 'occupation',
    columns: [
      { field: 'code',      header: 'รหัส',              width: 'w-20' },
      { field: 'name',      header: 'ชื่ออาชีพ (HIS)',   width: 'w-56' },
      { field: 'nhso_code', header: 'รหัส สปสช.',        width: 'w-24' },
      { field: 'nhso_name', header: 'ชื่ออาชีพ (สปสช.)', width: '' },
    ],
  },
  { key: 'race',             label: 'เชื้อชาติ' },
  { key: 'religion',         label: 'ศาสนา' },
  { key: 'marriage',         label: 'สถานะสมรส' },
  { key: 'person-kind',      label: 'ชนิดบุคคล' },
  { key: 'chronic-disease',  label: 'โรคเรื้อรัง' },
  { key: 'insurance',        label: 'สิทธิการรักษา' },
  { key: 'clinic',           label: 'คลินิก' },
  { key: 'drug-list',        label: 'รายการยา' },
  { key: 'drug-ned-reason',  label: 'เหตุผลการสั่งยา' },
  { key: 'charge-list',      label: 'รายการค่าบริการ' },
  { key: 'procedure',        label: 'หัตถการ' },
  { key: 'fp-method',        label: 'การคุมกำเนิด' },
  { key: 'vaccine-prenatal', label: 'วัคซีนฝากครรภ์' },
  { key: 'vaccine-0-1y',     label: 'วัคซีนเด็ก 0-1 ปี' },
  { key: 'vaccine-1-5y',     label: 'วัคซีนเด็ก 1-5 ปี' },
  { key: 'vaccine-school',   label: 'วัคซีนเด็กวัยเรียน' },
  { key: 'vaccine-all',      label: 'วัคซีนทั้งหมด' },
  { key: 'department',       label: 'แผนก' },
  { key: 'education',        label: 'การศึกษา' },
  { key: 'chronic-status',   label: 'สถานะผู้ป่วยโรคเรื้อรัง' },
  { key: 'person-type',      label: 'ประเภทบุคคล' },
  { key: 'diagnosis-type',   label: 'ประเภทการวินิจฉัย' },
  { key: 'accident-place',   label: 'สถานที่เกิดอุบัติเหตุ' },
  { key: 'accident-entry',   label: 'ประเภทการมากรณีอุบัติเหตุ' },
  { key: 'injury-type',      label: 'ประเภทผู้บาดเจ็บ' },
  { key: 'vehicle-type',     label: 'ประเภทยานพาหนะที่เกิดเหตุ' },
  { key: 'urgency-level',    label: 'ระดับความเร่งด่วน' },
  { key: 'rehab-code',       label: 'รหัสบริการฟื้นฟู' },
  { key: 'pp-special-code',  label: 'รหัสบริการส่งเสริมป้องกันเฉพาะ' },
  { key: 'service-entry',    label: 'ประเภทการมารับบริการ' },
  { key: 'lab-value-map',    label: 'Lab Value Map' },
]

function DataTable({ menu }: { menu: SubMenu }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['basic-config', menu.apiPath],
    queryFn: () => axios.get<Record<string, unknown>[]>(`/api/basic-config/${menu.apiPath}`).then(r => r.data),
    enabled: !!menu.apiPath,
    staleTime: 60_000,
  })

  if (!menu.apiPath) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
        <p className="text-amber-700 text-sm font-medium">ยังไม่ได้กำหนด SQL / table ใน HIS</p>
        <p className="text-amber-600 text-xs mt-1">แจ้ง SQL query ที่ต้องใช้เพื่อเริ่มพัฒนา</p>
      </div>
    )
  }

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>

  if (isError) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
      {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'เกิดข้อผิดพลาดในการดึงข้อมูล'}
    </div>
  )

  const cols = menu.columns ?? []
  const rows = data ?? []

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b flex items-center justify-between">
        <p className="text-sm text-gray-600 font-medium">{menu.label}</p>
        <p className="text-xs text-gray-400">{rows.length.toLocaleString()} รายการ</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-700 text-white">
            <tr>
              {cols.map(c => (
                <th key={c.field} className={`text-left px-3 py-2 font-medium whitespace-nowrap ${c.width ?? ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-gray-400">ไม่พบข้อมูล</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {cols.map(c => (
                    <td key={c.field} className="px-3 py-2 text-gray-700">
                      {String(row[c.field] ?? '–')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function BasicConfigPage() {
  const [activeKey, setActiveKey] = useState<string>(SUB_MENUS[0]!.key)
  const activeMenu = SUB_MENUS.find(m => m.key === activeKey) ?? SUB_MENUS[0]!

  return (
    <div className="flex gap-0 h-full -m-6">
      {/* Sub-menu sidebar */}
      <div className="w-56 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="px-3 py-2.5 border-b bg-gray-50">
          <p className="text-xs font-semibold text-gray-600">ตั้งค่าข้อมูลพื้นฐาน 43 แฟ้ม</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{SUB_MENUS.length} รายการ</p>
        </div>
        <nav>
          {SUB_MENUS.map(m => (
            <button
              key={m.key}
              onClick={() => setActiveKey(m.key)}
              className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-50 flex items-center justify-between gap-2 transition-colors ${
                activeKey === m.key
                  ? 'bg-blue-50 text-blue-800 font-semibold border-l-2 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="leading-snug">{m.label}</span>
              {!m.apiPath && (
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="รอ SQL" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content area */}
      <div className="flex-1 p-6 overflow-y-auto">
        <DataTable menu={activeMenu} />
      </div>
    </div>
  )
}
