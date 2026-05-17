import { useMemo, useState } from 'react'
import { searchLinks, groupByCategory } from '../data/nhsoLinks'

export function NhsoLinksPage() {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => groupByCategory(searchLinks(query)), [query])
  const total = useMemo(() => groups.reduce((n, g) => n + g.links.length, 0), [groups])

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800">ลิงก์บริการออนไลน์ สปสช.</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            รวมลิงก์บริการที่เกี่ยวกับงานจัดเก็บรายได้ — คลิกเพื่อเปิดเว็บ สปสช. ในแท็บใหม่
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ค้นหาบริการ..."
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-400 whitespace-nowrap">{total.toLocaleString()} รายการ</span>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-10 text-center text-gray-400 text-sm">
          ไม่พบบริการที่ตรงกับ "{query}"
        </div>
      ) : (
        groups.map(group => (
          <section key={group.category} className="bg-white rounded-lg shadow overflow-hidden">
            <div
              className={`px-4 py-2.5 border-b flex items-center gap-2 ${
                group.revenue ? 'bg-blue-700 text-white' : 'bg-gray-50 text-gray-700'
              }`}
            >
              <h3 className="text-sm font-semibold">{group.category}</h3>
              {group.revenue && (
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">เกี่ยวกับงานรายได้</span>
              )}
              <span className={`ml-auto text-xs ${group.revenue ? 'text-blue-100' : 'text-gray-400'}`}>
                {group.links.length} รายการ
              </span>
            </div>
            <ul className="divide-y divide-gray-100">
              {group.links.map(link => (
                <li key={`${link.name}|${link.url}`}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors group"
                  >
                    <span className="flex-1 leading-snug group-hover:text-blue-800">{link.name}</span>
                    <span className="text-xs text-gray-400 group-hover:text-blue-600" aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
