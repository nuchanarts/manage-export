import { useRef, useState } from 'react'
import axios from 'axios'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'

interface FieldError {
  row: number
  field: string
  caption: string
  description: string
  type: string
  value?: string
  message: string
  pid?: string
  cid?: string
}

interface PersonError {
  pid: string
  cid: string
  hn: string
  name: string
  errors: { field: string; caption: string; type: string; value?: string }[]
}

interface SchemaFieldSummary {
  name: string
  caption: string
  type: string
  width: number
  notNull: boolean
  pk: boolean
}

interface FileResult {
  fileName: string
  description: string
  status: 'PASS' | 'FAIL' | 'WARN' | 'UNKNOWN'
  totalRows: number
  totalPersons: number
  passPersons: number
  failPersons: number
  passPercent: number
  errorCount: number
  warnCount: number
  errors: FieldError[]
  personErrors: PersonError[]
  personPass: PersonError[]
  missingColumns: string[]
  extraColumns: string[]
  schemaFields: SchemaFieldSummary[]
  fileMeta: FileMetaFull
}

interface HisGuide {
  menu: string
  path: string[]
  screen: string
  note?: string
  keyFields: string[]
}

interface FileMetaFull {
  fileNumber: number
  fileType: string
  units: string
  definition: string
  scope: string[]
  period: string[]
  notes: string[]
  related: string[]
  hisGuide: HisGuide | null
}

function SchemaTooltip({ fields, fileName, description, fileMeta }: {
  fields: SchemaFieldSummary[]
  fileName: string
  description: string
  fileMeta: FileMetaFull
}) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const required = fields.filter(f => f.notNull)
  const optional = fields.filter(f => !f.notNull)
  const TYPE_LABEL: Record<string, string> = { C: 'ข้อความ', N: 'ตัวเลข', D: 'วันที่', DT: 'วันเวลา' }

  return (
    <span
      onMouseEnter={e => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
        setPos({ x: r.left, y: r.bottom })
        setShow(true)
      }}
      onMouseLeave={() => setShow(false)}
    >
      <span className="font-mono text-xs font-semibold text-gray-800 cursor-help border-b border-dotted border-blue-400 hover:text-blue-700">
        {fileName}
      </span>

      {show && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
          style={{ left: Math.min(pos.x, window.innerWidth - 420), top: pos.y + 4, width: 400, maxHeight: 480 }}
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
        >
          <div className="bg-blue-800 text-white px-3 py-2.5">
            <p className="font-bold text-sm">
              {fileMeta.fileNumber > 0 ? `(${fileMeta.fileNumber}) ` : ''}{fileName}
              <span className="ml-1.5 text-[11px] font-normal text-blue-300">version 3.1.1</span>
            </p>
            {fileMeta.definition && (
              <p className="text-xs text-blue-100 mt-0.5 leading-relaxed">{fileMeta.definition}</p>
            )}
            {!fileMeta.definition && description && (
              <p className="text-xs text-blue-100 mt-0.5">{description}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {fileMeta.fileType && <span className="bg-blue-600 px-2 py-0.5 rounded text-[11px]">📁 {fileTypeLabel(fileMeta.fileType)}</span>}
              {fileMeta.units && <span className="bg-blue-600 px-2 py-0.5 rounded text-[11px]">🏥 {fileMeta.units}</span>}
            </div>
            <p className="text-[11px] text-blue-300 mt-1.5">{fields.length} คอลัมน์ · ห้ามว่าง {required.length} · ไม่บังคับ {optional.length}</p>
          </div>

          {/* Rich metadata section */}
          {(fileMeta.scope.length > 0 || fileMeta.period.length > 0) && (
            <div className="border-b border-gray-100 px-3 py-2 space-y-1.5 bg-gray-50 text-xs text-gray-700">
              {fileMeta.scope.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-800 mb-0.5">ขอบเขตข้อมูล:</p>
                  {fileMeta.scope.slice(0, 4).map((s, i) => <p key={i} className="leading-snug">{s}</p>)}
                  {fileMeta.scope.length > 4 && <p className="text-gray-400">...และอีก {fileMeta.scope.length - 4} รายการ</p>}
                </div>
              )}
              {fileMeta.period.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-800 mb-0.5">เวลา/รอบที่บันทึก:</p>
                  {fileMeta.period.slice(0, 3).map((s, i) => <p key={i} className="leading-snug">{s}</p>)}
                  {fileMeta.period.length > 3 && <p className="text-gray-400">...และอีก {fileMeta.period.length - 3} รายการ</p>}
                </div>
              )}
            </div>
          )}

          <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
            {required.length > 0 && (
              <>
                <div className="px-3 py-1.5 bg-red-50 border-b border-red-100 sticky top-0">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />
                  <span className="text-xs font-semibold text-red-700">ห้ามว่าง (NOT NULL) — {required.length} คอลัมน์</span>
                </div>
                <table className="min-w-full text-xs">
                  <tbody>
                    {required.map(f => (
                      <tr key={f.name} className="border-b border-red-50 hover:bg-red-50">
                        <td className="pl-3 pr-1 py-1.5 w-6 text-yellow-500 text-[10px] font-bold">{f.pk ? 'PK' : ''}</td>
                        <td className="px-2 py-1.5 font-mono font-semibold text-red-800 whitespace-nowrap">{f.name}</td>
                        <td className="px-2 py-1.5 text-gray-700">{f.caption}</td>
                        <td className="px-2 py-1.5 text-gray-400 whitespace-nowrap">{TYPE_LABEL[f.type] ?? f.type}({f.width})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {optional.length > 0 && (
              <>
                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 sticky top-0">
                  <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1.5" />
                  <span className="text-xs font-semibold text-gray-500">ไม่บังคับ — {optional.length} คอลัมน์</span>
                </div>
                <table className="min-w-full text-xs">
                  <tbody>
                    {optional.map(f => (
                      <tr key={f.name} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="pl-3 pr-1 py-1.5 w-6 text-yellow-500 text-[10px] font-bold">{f.pk ? 'PK' : ''}</td>
                        <td className="px-2 py-1.5 font-mono text-gray-600 whitespace-nowrap">{f.name}</td>
                        <td className="px-2 py-1.5 text-gray-500">{f.caption}</td>
                        <td className="px-2 py-1.5 text-gray-400 whitespace-nowrap">{TYPE_LABEL[f.type] ?? f.type}({f.width})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {fields.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">ไม่พบข้อมูลโครงสร้างในมาตรฐาน</p>
            )}
          </div>
        </div>
      )}
    </span>
  )
}

interface ErrorGroupSummary {
  fileName: string
  description: string
  totalPersons: number
  failPersons: number
  passPercent: number
  topErrors: { field: string; caption: string; count: number }[]
}

interface ValidationReport {
  hospcode: string
  totalFiles: number
  passCount: number
  failCount: number
  warnCount: number
  totalPersonsAll: number
  passPersonsAll: number
  failPersonsAll: number
  passPercentAll: number
  errorGroupSummary: ErrorGroupSummary[]
  missingFiles: string[]
  unknownFiles: string[]
  files: FileResult[]
  generatedAt: string
}

function fileTypeBadge(t: string): string {
  if (!t) return 'bg-gray-100 text-gray-400'
  if (t.includes('กึ่งสำรวจ') || t === 'บริการกึ่งสำรวจ') return 'bg-purple-100 text-purple-700'
  if (t.includes('บริการ') || t === 'บริการ') return 'bg-blue-100 text-blue-700'
  if (t.includes('สะสม') || t === 'สะสม') return 'bg-green-100 text-green-700'
  if (t.includes('ส่งต่อ')) return 'bg-orange-100 text-orange-700'
  if (t.includes('แก้ไข')) return 'bg-red-100 text-red-600'
  if (t.includes('นโยบาย')) return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-600'
}

function fileTypeLabel(t: string): string {
  // Normalize short forms to full form for display
  if (t === 'สะสม') return 'แฟ้มสะสม'
  if (t === 'บริการ') return 'แฟ้มบริการ'
  if (t === 'บริการกึ่งสำรวจ') return 'แฟ้มบริการกึ่งสำรวจ'
  return t
}

const STATUS_COLOR: Record<string, string> = {
  PASS: 'text-green-700 font-semibold',
  FAIL: 'text-red-700 font-semibold',
  WARN: 'text-yellow-700',
  UNKNOWN: 'text-gray-400',
}
const STATUS_LABEL: Record<string, string> = {
  PASS: 'ผ่าน', FAIL: 'พบข้อผิดพลาด', WARN: 'คำเตือน', UNKNOWN: 'ไม่รู้จัก',
}
const ERR_TYPE_LABEL: Record<string, string> = {
  NULL_REQUIRED: 'ค่าว่าง (บังคับ)',
  EXCEEDS_WIDTH: 'ความยาวเกิน',
  INVALID_DATE: 'วันที่ผิดรูปแบบ',
  INVALID_NUMBER: 'ตัวเลขผิดรูปแบบ',
  MISSING_COLUMN: 'คอลัมน์ขาดหาย',
}

function FileDetailPanel({ file, hospcode, onClose }: { file: FileResult; hospcode: string; onClose: () => void }) {
  const [tab, setTab] = useState<'incomplete' | 'fail' | 'pass' | 'field'>(file.status === 'PASS' ? 'pass' : 'incomplete')
  const [exporting, setExporting] = useState(false)

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      let persons = file.personErrors
      let exportType: 'pass' | 'fail' = 'fail'
      let suffix = 'fail'

      if (tab === 'pass') {
        persons = file.personPass; exportType = 'pass'; suffix = 'pass'
      } else if (tab === 'incomplete') {
        persons = file.personErrors.filter(p => p.errors.some(e => e.type === 'NULL_REQUIRED'))
        suffix = 'incomplete'
      }

      const resp = await fetch('/api/validate/export-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.fileName,
          description: file.description,
          hospcode,
          personErrors: persons,
          missingColumns: file.missingColumns,
          exportType,
        }),
      })
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      a.download = `${suffix}-${file.fileName.replace('.txt', '')}-${date}.xlsx`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  const handlePrint = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const persons = tab === 'pass' ? file.personPass : file.personErrors
    const isFail = tab === 'fail'
    const headerColor = tab === 'pass' ? '#16a34a' : '#dc2626'
    const tabLabel = tab === 'pass' ? 'รายชื่อผู้ผ่าน' : tab === 'fail' ? 'รายชื่อผู้ไม่ผ่าน' : 'สรุปตามฟิลด์'

    let body = ''
    if (tab === 'field') {
      const byField = file.errors.reduce<Record<string, FieldError[]>>((acc, e) => {
        acc[e.field] = acc[e.field] ?? []; acc[e.field]!.push(e); return acc
      }, {})
      body = Object.entries(byField).map(([fn, errs]) => `
        <h3>${fn} (${errs[0]!.caption}) — ${errs.length} รายการ</h3>
        <table><thead><tr><th>แถว</th><th>PID</th><th>CID</th><th>ประเภท</th><th>ค่า</th></tr></thead>
        <tbody>${errs.slice(0,200).map((e,i)=>`<tr style="background:${i%2===0?'#fff':'#f9f9f9'}">
          <td>${e.row}</td><td>${e.pid||'–'}</td><td>${e.cid||'–'}</td><td>${e.type}</td><td>${e.value||''}</td>
        </tr>`).join('')}</tbody></table>`).join('')
    } else {
      const rows = persons.map((p, i) => `
        <tr style="background:${i%2===0?'#fff':tab==='pass'?'#f0fdf4':'#fef2f2'}">
          <td>${i+1}</td><td>${p.pid}</td><td>${p.hn||'–'}</td><td>${p.name||'–'}</td><td>${p.cid||'–'}</td>
          ${isFail ? `<td>${[...new Set(p.errors.map(e=>e.field))].join(', ')}</td>` : ''}
        </tr>`).join('')
      body = `<table><thead><tr style="background:${headerColor};color:#fff">
        <th>#</th><th>PID</th><th>HN</th><th>ชื่อ-นามสกุล</th><th>CID</th>
        ${isFail ? '<th>ฟิลด์ที่ต้องแก้ไข</th>' : ''}
      </tr></thead><tbody>${rows}</tbody></table>`
    }

    w.document.write(`<html><head><title>${tabLabel} - ${file.fileName}</title>
      <style>body{font-family:sans-serif;font-size:11px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:3px 6px}h2,h3{color:#1e3a8a}</style></head>
      <body><h2>${file.fileName} — ${file.description} — ${tabLabel}</h2>
      <p>HOSPCODE: ${hospcode} | ทั้งหมด: ${file.totalPersons} คน | ผ่าน: ${file.passPersons} คน | ไม่ผ่าน: ${file.failPersons} คน | ร้อยละ: ${file.passPercent}%</p>
      ${file.missingColumns.length > 0 ? `<p style="color:red">คอลัมน์ขาด: ${file.missingColumns.join(', ')}</p>` : ''}
      ${body}</body></html>`)
    w.document.close(); w.print()
  }

  const byField = file.errors.reduce<Record<string, FieldError[]>>((acc, e) => {
    acc[e.field] = acc[e.field] ?? []
    acc[e.field]!.push(e)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-blue-700 rounded-t-xl text-white">
          <div>
            <h3 className="font-bold text-lg">{file.fileName}</h3>
            {file.description && <p className="text-blue-200 text-sm mt-0.5">{file.description}</p>}
            <div className="flex gap-4 text-sm text-blue-100 mt-0.5">
              <span>ทั้งหมด: <strong className="text-white">{file.totalPersons.toLocaleString()} คน</strong></span>
              <span>ผ่าน: <strong className="text-green-300">{file.passPersons.toLocaleString()} คน</strong></span>
              <span>ไม่ผ่าน: <strong className="text-red-300">{file.failPersons.toLocaleString()} คน</strong></span>
              <span>ร้อยละ: <strong className="text-white">{file.passPercent}%</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button onClick={handlePrint} className="px-3 py-1.5 bg-white text-blue-800 text-xs font-medium rounded hover:bg-blue-50 transition-colors">🖨 พิมพ์</button>
            <button onClick={handleExportExcel} disabled={exporting || (tab === 'pass' ? file.personPass.length === 0 : tab === 'incomplete' ? !file.personErrors.some(p => p.errors.some(e => e.type === 'NULL_REQUIRED')) : tab === 'fail' ? file.personErrors.length === 0 : false)}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors">
              {exporting ? '...' : '⬇ Excel'}
            </button>
            <button onClick={onClose} className="text-white hover:text-blue-200 text-2xl leading-none">&times;</button>
          </div>
        </div>

        {/* HIS Guide — แนวทางแก้ไขใน HIS */}
        {file.fileMeta?.hisGuide && file.status !== 'PASS' && (
          <div className="mx-5 mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="font-bold text-blue-800 text-sm mb-2">🏥 แนวทางแก้ไขใน HIS</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-500 mb-0.5">เมนูหลัก</p>
                <p className="font-semibold text-blue-900">{file.fileMeta.hisGuide.menu}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">เส้นทางเมนู</p>
                <p className="text-gray-800">{file.fileMeta.hisGuide.path.join(' → ')}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-500 mb-0.5">หน้าจอที่ต้องใช้</p>
                <p className="font-medium text-gray-800 bg-white border border-blue-200 rounded px-2 py-1">
                  📋 {file.fileMeta.hisGuide.screen}
                </p>
              </div>
              {file.fileMeta.hisGuide.keyFields.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-gray-500 mb-1">คอลัมน์ที่ต้องตรวจสอบ / บันทึก</p>
                  <div className="flex flex-wrap gap-1.5">
                    {file.fileMeta.hisGuide.keyFields.map((f, i) => {
                      const [fieldName, ...rest] = f.split(' - ')
                      return (
                        <div key={i} className="bg-white border border-blue-200 rounded px-2 py-1 text-[11px]">
                          <span className="font-mono font-bold text-blue-700">{fieldName}</span>
                          {rest.length > 0 && <span className="text-gray-500"> — {rest.join(' - ')}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {file.fileMeta.hisGuide.note && (
                <div className="md:col-span-2">
                  <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    ⚠️ {file.fileMeta.hisGuide.note}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Missing columns alert */}
        {file.missingColumns.length > 0 && (
          <div className="mx-5 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="font-semibold text-red-800 text-sm mb-1">⚠ คอลัมน์ที่ขาดในไฟล์ ({file.missingColumns.length} คอลัมน์) — ต้องเพิ่มในโครงสร้าง:</p>
            <div className="flex flex-wrap gap-1">
              {file.missingColumns.map(c => (
                <span key={c} className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono text-xs border border-red-200">{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        {(() => {
          const incompletePersons = file.personErrors.filter(p => p.errors.some(e => e.type === 'NULL_REQUIRED'))
          const otherFailPersons = file.personErrors.filter(p => p.errors.some(e => e.type !== 'NULL_REQUIRED') && !p.errors.every(e => e.type === 'NULL_REQUIRED'))
          return (
            <div className="flex flex-wrap gap-1 px-5 pt-4">
              {[
                { key: 'incomplete', label: `📋 ข้อมูลไม่ครบ (${incompletePersons.length} คน)`, color: incompletePersons.length > 0 ? 'text-orange-700 border-orange-500' : '' },
                { key: 'fail', label: `❌ ไม่ผ่านทั้งหมด (${file.failPersons} คน)`, color: file.failPersons > 0 ? 'text-red-700 border-red-600' : '' },
                { key: 'pass', label: `✅ ผ่าน (${file.passPersons} คน)`, color: 'text-green-700 border-green-600' },
                { key: 'field', label: `🔍 สรุปตามฟิลด์ (${Object.keys(byField).length})`, color: '' },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key as 'incomplete' | 'fail' | 'pass' | 'field')}
                  className={`px-3 py-1.5 text-sm rounded-t-lg border-b-2 font-medium transition-colors ${tab === t.key ? (t.color || 'text-blue-700 border-blue-700') : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          )
        })()}

        <div className="px-5 pb-5 max-h-[60vh] overflow-y-auto border-t">

          {/* Tab: ข้อมูลไม่ครบ */}
          {tab === 'incomplete' && (() => {
            const persons = file.personErrors.filter(p => p.errors.some(e => e.type === 'NULL_REQUIRED'))
            return (
              <div className="mt-3">
                {persons.length === 0
                  ? <p className="text-green-700 text-center py-6">✅ ทุก record มีข้อมูลครบถ้วน</p>
                  : (
                    <>
                      <p className="text-xs text-orange-600 mb-2 px-1">
                        ⚠️ แสดง record ที่มีฟิลด์บังคับ (NOT NULL) ว่างเปล่า — ต้องไปกรอกข้อมูลให้ครบใน HIS
                      </p>
                      <table className="min-w-full text-xs">
                        <thead className="sticky top-0 bg-orange-500 text-white">
                          <tr>
                            <th className="text-left px-3 py-2">#</th>
                            <th className="text-left px-3 py-2">PID</th>
                            <th className="text-left px-3 py-2">HN</th>
                            <th className="text-left px-3 py-2">ชื่อ-นามสกุล</th>
                            <th className="text-left px-3 py-2">CID</th>
                            <th className="text-left px-3 py-2">ฟิลด์ที่ว่าง (ต้องกรอก)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {persons.map((p, i) => {
                            const emptyFields = p.errors.filter(e => e.type === 'NULL_REQUIRED')
                            return (
                              <tr key={p.pid} className={i % 2 === 0 ? 'bg-white' : 'bg-orange-50'}>
                                <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                                <td className="px-3 py-1.5 font-mono text-gray-700">{p.pid}</td>
                                <td className="px-3 py-1.5 font-mono text-blue-700">{p.hn || '–'}</td>
                                <td className="px-3 py-1.5 font-semibold text-gray-800">{p.name || '–'}</td>
                                <td className="px-3 py-1.5 font-mono text-gray-600">{p.cid || '–'}</td>
                                <td className="px-3 py-1.5">
                                  <div className="flex flex-wrap gap-1">
                                    {emptyFields.map(e => (
                                      <span key={e.field} title={e.caption} className="bg-orange-100 text-orange-800 border border-orange-300 px-1.5 py-0.5 rounded font-mono text-[11px]">
                                        {e.field}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      {persons.length >= 500 && (
                        <p className="text-xs text-gray-400 text-center mt-2">แสดง 500 รายการแรก</p>
                      )}
                    </>
                  )
                }
              </div>
            )
          })()}

          {/* Tab: ไม่ผ่าน */}
          {tab === 'fail' && (
            <div className="mt-3">
              {file.personErrors.length === 0
                ? <p className="text-green-700 text-center py-6">✅ ทุกคนผ่านการตรวจสอบ</p>
                : (
                  <table className="min-w-full text-xs">
                    <thead className="sticky top-0 bg-red-600 text-white">
                      <tr>
                        <th className="text-left px-3 py-2">#</th>
                        <th className="text-left px-3 py-2">PID</th>
                        <th className="text-left px-3 py-2">HN</th>
                        <th className="text-left px-3 py-2">ชื่อ-นามสกุล</th>
                        <th className="text-left px-3 py-2">CID</th>
                        <th className="text-left px-3 py-2">ฟิลด์ที่ต้องแก้ไข</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {file.personErrors.map((p, i) => (
                        <tr key={p.pid} className={i % 2 === 0 ? 'bg-white' : 'bg-red-50'}>
                          <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-1.5 font-mono text-gray-700">{p.pid}</td>
                          <td className="px-3 py-1.5 font-mono text-blue-700">{p.hn || '–'}</td>
                          <td className="px-3 py-1.5 font-semibold text-gray-800">{p.name || '–'}</td>
                          <td className="px-3 py-1.5 font-mono text-gray-600">{p.cid || '–'}</td>
                          <td className="px-3 py-1.5">
                            <div className="flex flex-wrap gap-1">
                              {[...new Set(p.errors.map(e => e.field))].map(f => (
                                <span key={f} className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-mono text-[11px]">{f}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
              {file.personErrors.length >= 500 && (
                <p className="text-xs text-gray-400 text-center mt-2">แสดง 500 รายการแรก จากทั้งหมด {file.failPersons.toLocaleString()} คน</p>
              )}
            </div>
          )}

          {/* Tab: ผ่าน */}
          {tab === 'pass' && (
            <div className="mt-3">
              {file.personPass.length === 0
                ? <p className="text-gray-500 text-center py-6">ไม่มีรายการที่ผ่าน</p>
                : (
                  <table className="min-w-full text-xs">
                    <thead className="sticky top-0 bg-green-600 text-white">
                      <tr>
                        <th className="text-left px-3 py-2">#</th>
                        <th className="text-left px-3 py-2">PID</th>
                        <th className="text-left px-3 py-2">HN</th>
                        <th className="text-left px-3 py-2">ชื่อ-นามสกุล</th>
                        <th className="text-left px-3 py-2">CID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {file.personPass.map((p, i) => (
                        <tr key={p.pid} className={i % 2 === 0 ? 'bg-white' : 'bg-green-50'}>
                          <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-1.5 font-mono text-gray-700">{p.pid}</td>
                          <td className="px-3 py-1.5 font-mono text-blue-700">{p.hn || '–'}</td>
                          <td className="px-3 py-1.5 font-semibold text-gray-800">{p.name || '–'}</td>
                          <td className="px-3 py-1.5 font-mono text-gray-600">{p.cid || '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
              {file.passPersons > 500 && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  แสดง 500 รายการแรก จากทั้งหมด {file.passPersons.toLocaleString()} คน
                </p>
              )}
            </div>
          )}

          {/* Tab: Field summary */}
          {tab === 'field' && (
            <div className="mt-3 space-y-3">
              {Object.keys(byField).length === 0
                ? <p className="text-green-700 text-center py-6">✅ ไม่พบปัญหาข้อมูล</p>
                : Object.entries(byField).map(([fieldName, errors]) => (
                  <div key={fieldName} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div>
                          <span className="font-mono font-bold text-sm text-gray-900">{fieldName}</span>
                          <span className="ml-2 text-sm text-blue-700 font-medium">({errors[0]!.caption})</span>
                        </div>
                        <span className="text-xs text-red-600 font-semibold">{errors.length.toLocaleString()} รายการ</span>
                      </div>
                      <div className="flex items-start gap-1.5 mt-1">
                        <span className={`shrink-0 text-[11px] px-1.5 py-0.5 rounded font-medium ${errors[0]!.type === 'NULL_REQUIRED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {ERR_TYPE_LABEL[errors[0]!.type] ?? errors[0]!.type}
                        </span>
                        <p className="text-xs text-gray-600 leading-snug">
                          {errors[0]!.description
                            ? errors[0]!.description
                            : errors[0]!.type === 'NULL_REQUIRED' ? 'ฟิลด์นี้บังคับต้องมีข้อมูล ห้ามเว้นว่าง'
                            : errors[0]!.type === 'INVALID_DATE' ? 'รูปแบบ YYYYMMDD (8 หลัก) เช่น 25660101'
                            : errors[0]!.type === 'EXCEEDS_WIDTH' ? 'ข้อมูลยาวเกินกว่าที่มาตรฐานกำหนด'
                            : 'ฟิลด์นี้ต้องเป็นตัวเลข'}
                        </p>
                      </div>
                    </div>
                    <table className="min-w-full text-xs">
                      <thead><tr className="bg-gray-100 text-gray-500">
                        <th className="text-left px-3 py-1.5">แถว</th>
                        <th className="text-left px-3 py-1.5">PID</th>
                        <th className="text-left px-3 py-1.5">CID/HN</th>
                        <th className="text-left px-3 py-1.5">ประเภท</th>
                        <th className="text-left px-3 py-1.5">ค่าที่พบ</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {errors.slice(0, 50).map((e, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-1 text-gray-400">{e.row}</td>
                            <td className="px-3 py-1 font-mono">{e.pid || '–'}</td>
                            <td className="px-3 py-1 font-mono text-gray-500">{e.cid || '–'}</td>
                            <td className="px-3 py-1">
                              <span className={`px-1.5 py-0.5 rounded text-[11px] ${e.type === 'NULL_REQUIRED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {ERR_TYPE_LABEL[e.type] ?? e.type}
                              </span>
                            </td>
                            <td className="px-3 py-1 font-mono text-gray-500 max-w-xs truncate">{e.value !== undefined ? (e.value || '(ว่าง)') : '–'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {errors.length > 50 && <p className="text-xs text-gray-400 px-3 py-1.5">...และอีก {errors.length - 50} รายการ</p>}
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ValidatePage() {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<ValidationReport | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileResult | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const folderRef = useRef<HTMLInputElement>(null)

  const submitToServer = async (form: FormData, label: string) => {
    setError(null); setReport(null); setLoading(true); setFileName(label)
    try {
      const { data } = await axios.post<ValidationReport>('/api/validate', form, {
        headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180_000,
      })
      setReport(data)
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'เกิดข้อผิดพลาดในการตรวจสอบ')
    } finally { setLoading(false) }
  }

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'zip' && ext !== 'rar') { setError('รองรับเฉพาะไฟล์ .zip และ .rar'); return }
    const form = new FormData()
    form.append('file', file)
    submitToServer(form, file.name)
  }

  const handleFolder = (fileList: FileList) => {
    const txts = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.txt'))
    if (txts.length === 0) { setError('ไม่พบไฟล์ .txt ในโฟลเดอร์ที่เลือก'); return }
    const form = new FormData()
    txts.forEach(f => form.append('files', f, f.name.split(/[\\/]/).pop()))
    const first = txts[0] as File & { webkitRelativePath?: string }
    const folderName = first?.webkitRelativePath?.split('/')[0] ?? 'folder'
    submitToServer(form, `📁 ${folderName} (${txts.length} ไฟล์ .txt)`)
  }

  const [filterMode, setFilterMode] = useState<'hasData' | 'noData' | 'all'>('hasData')
  const [filterErrorOnly, setFilterErrorOnly] = useState(false)
  const [filterFileType, setFilterFileType] = useState<string>('all')

  const allFiles = (report?.files ?? []).filter(f => {
    if (filterMode === 'hasData' && f.totalRows === 0) return false
    if (filterMode === 'noData' && f.totalRows > 0) return false
    if (filterErrorOnly && f.status === 'PASS') return false
    if (filterFileType !== 'all' && f.fileMeta?.fileType !== filterFileType) return false
    return true
  })

  const fileTypes = [...new Set((report?.files ?? [])
    .map(f => f.fileMeta?.fileType)
    .filter(Boolean))] as string[]

  return (
    <div className="space-y-5">
      {/* Related external links */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-lg shadow px-4 py-2.5 text-sm">
        <span className="text-gray-500">ลิงก์ที่เกี่ยวข้อง:</span>
        <a
          href="https://hdc.moph.go.th/center/public/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors"
        >
          🌐 HDC กระทรวงสาธารณสุข (ตรวจสอบส่งออก 43 แฟ้ม)
          <span aria-hidden="true" className="text-xs">↗</span>
        </a>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault(); setDragging(false)
          const f = e.dataTransfer.files[0]; if (f) handleFile(f)
        }}
        className={`border-2 border-dashed rounded-xl p-6 transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
      >
        {/* Hidden inputs */}
        <input ref={inputRef} type="file" accept=".zip,.rar" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        <input ref={folderRef} type="file" className="hidden"
          {...{ webkitdirectory: '', multiple: true } as React.InputHTMLAttributes<HTMLInputElement>}
          onChange={e => { if (e.target.files?.length) handleFolder(e.target.files) }} />

        <div className="text-center mb-4">
          <div className="text-3xl mb-1">📦</div>
          <p className="font-semibold text-gray-700">ลากไฟล์มาวางที่นี่ หรือเลือกจากปุ่มด้านล่าง</p>
          <p className="text-xs text-gray-400 mt-0.5">อ่านเฉพาะไฟล์ .txt เท่านั้น</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors">
            📂 เลือกไฟล์ .zip / .rar
          </button>
          <button onClick={() => folderRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors">
            🗂️ เลือกโฟลเดอร์
          </button>
        </div>

        {fileName && !loading && (
          <p className="mt-3 text-center text-xs text-blue-600 font-mono">{fileName}</p>
        )}
      </div>

      {loading && <div className="flex flex-col items-center gap-2 py-6"><LoadingSpinner size="lg" /><p className="text-gray-500 text-sm">กำลังตรวจสอบ 43 แฟ้ม...</p></div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

      {report && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-bold text-gray-800">ผลการตรวจสอบ 43 แฟ้ม</span>
                <span className="ml-3 text-xs text-gray-400">HOSPCODE: {report.hospcode} | {new Date(report.generatedAt).toLocaleString('th-TH')}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[{l:'แฟ้มทั้งหมด',v:report.totalFiles,c:'text-gray-700'},{l:'แฟ้มผ่าน',v:report.passCount,c:'text-green-700'},{l:'แฟ้มไม่ผ่าน',v:report.failCount,c:'text-red-700'},{l:'คำเตือน',v:report.warnCount,c:'text-yellow-700'}].map(s=>(
                <div key={s.l} className="bg-gray-50 rounded p-2 text-center">
                  <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
                  <p className="text-xs text-gray-500">{s.l}</p>
                </div>
              ))}
            </div>
            {report.totalPersonsAll > 0 && (
              <div className="mt-3 border-t pt-3 grid grid-cols-4 gap-2">
                {[
                  {l:'รวมทุกแฟ้ม (คน)',v:report.totalPersonsAll.toLocaleString(),c:'text-gray-800'},
                  {l:'ผ่านทั้งหมด (คน)',v:report.passPersonsAll.toLocaleString(),c:'text-green-700'},
                  {l:'ไม่ผ่านทั้งหมด (คน)',v:report.failPersonsAll.toLocaleString(),c:'text-red-700'},
                  {l:'% ผ่านรวมทุกแฟ้ม',v:`${report.passPercentAll.toFixed(2)}%`,c:report.passPercentAll<100?'text-orange-600':'text-green-700'},
                ].map(s=>(
                  <div key={s.l} className="bg-blue-50 rounded p-2 text-center">
                    <p className={`text-lg font-bold ${s.c}`}>{s.v}</p>
                    <p className="text-xs text-gray-500">{s.l}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg shadow px-4 py-2.5">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 text-xs">
              {([
                { v: 'all', label: 'ทั้งหมด' },
                { v: 'hasData', label: 'มีข้อมูล' },
                { v: 'noData', label: 'ไม่มีข้อมูล' },
              ] as { v: 'all' | 'hasData' | 'noData'; label: string }[]).map(opt => (
                <button key={opt.v} onClick={() => setFilterMode(opt.v)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${filterMode === opt.v ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={filterErrorOnly} onChange={e => setFilterErrorOnly(e.target.checked)} className="w-4 h-4 accent-red-600" />
              <span className="text-red-700 font-medium">ติด error เท่านั้น</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">ลักษณะแฟ้ม:</span>
              <select
                value={filterFileType}
                onChange={e => setFilterFileType(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด ({report?.files?.length ?? 0})</option>
                {fileTypes.map(t => (
                  <option key={t} value={t}>{fileTypeLabel(t)} ({report?.files?.filter(f => f.fileMeta?.fileType === t).length})</option>
                ))}
              </select>
            </div>
            <span className="text-xs text-gray-400 ml-auto">แสดง {allFiles.length} แฟ้ม</span>
          </div>

          {/* File table — OP-PP2010 style */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-700 text-white">
                <tr>
                  <th className="text-left px-3 py-2">FileName</th>
                  <th className="text-left px-3 py-2 min-w-[160px]">ลักษณะแฟ้ม</th>
                  <th className="text-right px-3 py-2">Record</th>
                  <th className="text-right px-3 py-2 text-green-200">ผ่าน (คน)</th>
                  <th className="text-right px-3 py-2 text-red-200">ไม่ผ่าน (คน)</th>
                  <th className="text-right px-3 py-2">ร้อยละ</th>
                  <th className="text-left px-3 py-2">คอลัมน์ขาด / ปัญหาหลัก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allFiles.map((f, i) => (
                  <tr
                    key={f.fileName}
                    className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${f.totalPersons > 0 ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                    onClick={() => f.totalPersons > 0 && setSelectedFile(f)}
                  >
                    <td className="px-3 py-1.5">
                      <SchemaTooltip
                        fields={f.schemaFields ?? []}
                        fileName={f.fileName}
                        description={f.description}
                        fileMeta={f.fileMeta ?? { fileNumber: 0, fileType: '', units: '', definition: '', scope: [], period: [], notes: [], related: [], hisGuide: null }}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-xs whitespace-nowrap">
                      {f.fileMeta?.fileType
                        ? <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${fileTypeBadge(f.fileMeta.fileType)}`}>
                            {fileTypeLabel(f.fileMeta.fileType)}
                          </span>
                        : <span className="text-gray-300">–</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right text-gray-700">{f.totalRows.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right">
                      {f.totalPersons > 0
                        ? <span className="text-green-700 font-semibold">{f.passPersons.toLocaleString()}</span>
                        : <span className="text-gray-400">–</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {f.failPersons > 0
                        ? <span className="text-red-700 font-semibold">{f.failPersons.toLocaleString()}</span>
                        : <span className="text-gray-400">0</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {f.totalPersons > 0
                        ? <span className={f.passPercent < 100 ? 'text-orange-600' : 'text-green-700'}>{f.passPercent.toFixed(2)}%</span>
                        : <span className="text-gray-400">–</span>}
                    </td>
                    <td className="px-3 py-1.5 text-xs">
                      {f.missingColumns.length > 0 && (
                        <span className="text-red-600">ขาด: {f.missingColumns.slice(0, 3).join(', ')}{f.missingColumns.length > 3 ? ` +${f.missingColumns.length - 3}` : ''}</span>
                      )}
                      {f.missingColumns.length === 0 && f.errors.length > 0 && (
                        <span className="text-orange-600">{[...new Set(f.errors.map(e => e.field))].slice(0, 3).join(', ')}</span>
                      )}
                      {f.status === 'PASS' && <span className="text-green-600">✓ ผ่าน</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 text-center">คลิกแถวที่มีข้อมูลเพื่อดูรายชื่อ (ผ่าน / ไม่ผ่าน)</p>

          {/* Error Group Summary */}
          {report.errorGroupSummary.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 bg-orange-600 text-white">
                <h4 className="font-bold text-sm">สรุป Error แยกตามแฟ้ม</h4>
                <p className="text-xs text-orange-100">แสดงเฉพาะแฟ้มที่มีปัญหา — field ที่พบบ่อยที่สุดในแต่ละแฟ้ม</p>
              </div>
              <div className="divide-y divide-gray-100">
                {report.errorGroupSummary.map(g => (
                  <div key={g.fileName} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-mono font-semibold text-sm text-gray-800">{g.fileName}</span>
                        <span className="ml-2 text-xs text-gray-500">{g.description}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-red-700 font-semibold">ไม่ผ่าน {g.failPersons.toLocaleString()} คน</span>
                        <span className={`font-semibold ${g.passPercent < 100 ? 'text-orange-600' : 'text-green-700'}`}>{g.passPercent.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {g.topErrors.map(e => (
                        <div key={e.field} className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-2 py-1">
                          <span className="font-mono text-xs font-semibold text-red-800">{e.field}</span>
                          <span className="text-xs text-gray-500">{e.caption}</span>
                          <span className="bg-red-200 text-red-800 text-[11px] px-1.5 py-0.5 rounded-full font-semibold">{e.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedFile && <FileDetailPanel file={selectedFile} hospcode={report?.hospcode ?? ''} onClose={() => setSelectedFile(null)} />}
    </div>
  )
}
