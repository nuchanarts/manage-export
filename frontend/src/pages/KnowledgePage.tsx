import { useState, useMemo } from 'react'
import { KB, searchKb, kbCategories, type KbEntry } from '../data/knowledge'

const ALL_CATEGORIES = 'ทั้งหมด'

export function KnowledgePage() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const categories = useMemo(() => [ALL_CATEGORIES, ...kbCategories(KB)], [])

  const filteredResults = useMemo<KbEntry[]>(() => {
    let results = searchKb(query)
    if (activeCategory !== ALL_CATEGORIES) {
      results = results.filter(e => e.category === activeCategory)
    }
    return results
  }, [query, activeCategory])

  const grouped = useMemo(() => {
    const map = new Map<string, KbEntry[]>()
    for (const entry of filteredResults) {
      const group = map.get(entry.category) ?? []
      group.push(entry)
      map.set(entry.category, group)
    }
    // Preserve category order from original KB
    const orderedCategories = kbCategories(KB).filter(c => map.has(c))
    return orderedCategories.map(cat => ({ category: cat, entries: map.get(cat)! }))
  }, [filteredResults])

  function toggleEntry(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleCategoryClick(cat: string) {
    setActiveCategory(cat)
    setExpandedIds(new Set())
  }

  const trimmedQuery = query.trim()

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 text-gray-800 pb-10">
      {/* Hero */}
      <section className="app-header text-white rounded-2xl px-7 py-8 shadow-lg">
        <p className="text-white/70 text-sm font-medium tracking-wide">BGS CHECK EXPORT</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1 leading-snug">
          คลังความรู้ — ถาม-ตอบ 43 แฟ้ม & การตั้งค่า
        </h1>
        <p className="text-white/85 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
          รวมคำถาม-คำตอบที่พบบ่อยเกี่ยวกับมาตรฐาน 43 แฟ้ม สปสช. และการใช้งานระบบตั้งค่านี้
          เลือกหมวดหรือพิมพ์คำค้นเพื่อค้นหาคำตอบได้ทันที
        </p>
      </section>

      {/* Search bar */}
      <section>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="พิมพ์คำถามหรือคำค้น เช่น 'pending', 'คลินิก', 'PERSON'…"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            aria-label="ค้นหาคำถาม-คำตอบ"
          />
        </div>
      </section>

      {/* Category chips */}
      <section>
        <div className="flex flex-wrap gap-2" role="group" aria-label="กรองตามหมวดหมู่">
          {categories.map(cat => {
            const isActive = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 ${
                  isActive
                    ? 'app-accent-bg app-accent-text border-transparent shadow-sm'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}
                aria-pressed={isActive}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </section>

      {/* Results */}
      <section>
        {/* Result count */}
        <p className="text-sm text-gray-500 mb-4">
          {filteredResults.length > 0 ? (
            <>พบ <span className="font-semibold text-gray-700">{filteredResults.length}</span> รายการ</>
          ) : null}
        </p>

        {/* Empty state */}
        {filteredResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 bg-white rounded-xl border border-gray-200">
            <span className="text-5xl mb-4">🔍</span>
            <p className="text-base font-medium text-gray-500">
              {trimmedQuery
                ? <>ไม่พบคำตอบที่ตรงกับ <span className="font-semibold text-gray-700">"{trimmedQuery}"</span></>
                : 'ไม่พบรายการในหมวดนี้'}
            </p>
            <p className="text-sm mt-1">ลองเปลี่ยนคำค้นหรือเลือกหมวดอื่น</p>
          </div>
        )}

        {/* Grouped accordion */}
        <div className="space-y-6">
          {grouped.map(({ category, entries }) => (
            <div key={category}>
              {/* Category header — only show when viewing "ทั้งหมด" or when there are multiple categories */}
              {(activeCategory === ALL_CATEGORIES || grouped.length > 1) && (
                <h2 className="text-base font-bold app-accent-text mb-3 flex items-center gap-2">
                  <span className="inline-block w-1 h-5 rounded-full app-accent-bg" aria-hidden="true" />
                  {category}
                  <span className="text-xs font-normal text-gray-400 ml-1">({entries.length})</span>
                </h2>
              )}

              <div className="space-y-2">
                {entries.map(entry => {
                  const isOpen = expandedIds.has(entry.id)
                  return (
                    <div
                      key={entry.id}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                    >
                      <button
                        onClick={() => toggleEntry(entry.id)}
                        className="w-full text-left px-5 py-4 flex items-start gap-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400"
                        aria-expanded={isOpen}
                        aria-controls={`kb-answer-${entry.id}`}
                      >
                        {/* Q icon */}
                        <span
                          className="shrink-0 mt-0.5 w-6 h-6 rounded-full app-accent-bg app-accent-text text-xs font-bold flex items-center justify-center"
                          aria-hidden="true"
                        >
                          Q
                        </span>
                        <span className="flex-1 text-sm font-semibold text-gray-800 leading-snug">
                          {entry.q}
                        </span>
                        {/* Chevron */}
                        <span
                          className={`shrink-0 text-gray-400 text-xs transition-transform duration-200 mt-1 ${isOpen ? 'rotate-180' : ''}`}
                          aria-hidden="true"
                        >
                          ▼
                        </span>
                      </button>

                      {/* Answer panel */}
                      {isOpen && (
                        <div
                          id={`kb-answer-${entry.id}`}
                          className="px-5 pb-4 pt-0"
                          role="region"
                          aria-label={`คำตอบ: ${entry.q}`}
                        >
                          <div className="border-t border-gray-100 pt-3 flex gap-3">
                            <span
                              className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center"
                              aria-hidden="true"
                            >
                              A
                            </span>
                            <p className="text-sm text-gray-700 leading-relaxed">{entry.a}</p>
                          </div>
                          {entry.keywords && entry.keywords.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5 pl-9">
                              {entry.keywords.map(kw => (
                                <span
                                  key={kw}
                                  className="text-[11px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-gray-400 pt-2 border-t">
        BGS Check Export · คลังความรู้ 43 แฟ้ม · เนื้อหาต้นฉบับโดยทีมพัฒนา BGS · สำหรับใช้งานภายในโรงพยาบาล
      </p>
    </div>
  )
}
