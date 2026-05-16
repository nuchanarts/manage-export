import { useState } from 'react'

interface SubMenu {
  key: string
  label: string
  hisTable?: string
}

const SUB_MENUS: SubMenu[] = [
  { key: 'eclaim-inscl',     label: 'สิทธิการรักษา' },
  { key: 'eclaim-marriage',  label: 'สถานะสมรส' },
  { key: 'eclaim-clinic',    label: 'คลินิก' },
  { key: 'eclaim-drug-ned',  label: 'เหตุผลการสั่งยา' },
  { key: 'eclaim-drug-list', label: 'รายการยา' },
  { key: 'eclaim-charge',    label: 'รายการค่าบริการ' },
]

function PlaceholderTable({ menu }: { menu: SubMenu }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
        <h3 className="font-bold text-gray-800 text-base">{menu.label}</h3>
        {menu.hisTable ? (
          <p className="text-xs text-gray-500 mt-1">
            📋 ดึงข้อมูลจาก: <code className="bg-gray-100 px-1 rounded font-mono">{menu.hisTable}</code>
          </p>
        ) : (
          <p className="text-xs text-amber-600 mt-1">
            ⏳ รอกำหนด table HIS — กรุณาระบุว่าดึงจาก table อะไร
          </p>
        )}
      </div>

      {menu.hisTable ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <p className="text-sm text-gray-600">ข้อมูลจาก <span className="font-mono font-semibold">{menu.hisTable}</span></p>
          </div>
          <div className="p-8 text-center text-gray-400">
            <p className="text-sm">กำลังพัฒนา...</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <p className="text-amber-700 text-sm font-medium">ยังไม่ได้กำหนด table ใน HIS</p>
          <p className="text-amber-600 text-xs mt-1">แจ้งชื่อ table ที่ต้องใช้เพื่อเริ่มพัฒนา</p>
        </div>
      )}
    </div>
  )
}

export function EClaimConfigPage() {
  const [selectedKey, setSelectedKey] = useState<string>(SUB_MENUS[0]!.key)
  const activeMenu = SUB_MENUS.find(m => m.key === selectedKey) ?? SUB_MENUS[0]!

  return (
    <div className="flex gap-0 h-full -m-6">
      {/* Sub-menu sidebar */}
      <div className="w-52 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="px-3 py-2.5 border-b bg-gray-50">
          <p className="text-xs font-semibold text-gray-600">ตั้งค่าข้อมูลพื้นฐาน ส่ง E-Claim</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{SUB_MENUS.length} รายการ</p>
        </div>
        <nav>
          {SUB_MENUS.map(m => (
            <button
              key={m.key}
              onClick={() => setSelectedKey(m.key)}
              className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-50 flex items-center justify-between gap-2 transition-colors ${
                selectedKey === m.key
                  ? 'bg-blue-50 text-blue-800 font-semibold border-l-2 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="leading-snug">{m.label}</span>
              {!m.hisTable && (
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="รอกำหนด table" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content area */}
      <div className="flex-1 p-6 overflow-y-auto">
        <PlaceholderTable menu={activeMenu} />
      </div>
    </div>
  )
}
