import { useState } from 'react'
import { buildExportUrl } from '../../services/api'
import { SearchFormValues } from './SearchForm'

interface Props {
  filter: SearchFormValues | null
  total: number
}

export function ExportButton({ filter, total }: Props) {
  const [exporting, setExporting] = useState(false)

  if (!filter) return null

  const handleExport = async () => {
    if (total === 0) return
    setExporting(true)
    try {
      const url = buildExportUrl(filter)
      const a = document.createElement('a')
      a.href = url
      a.click()
    } finally {
      setTimeout(() => setExporting(false), 2000)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={total === 0 || exporting}
      className="flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-md text-sm transition-colors"
      title={total === 0 ? 'ไม่มีข้อมูลสำหรับ Export' : undefined}
    >
      {exporting
        ? <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> กำลัง Export...</>
        : <>⬇ Export Excel ({total.toLocaleString()} รายการ)</>
      }
    </button>
  )
}
