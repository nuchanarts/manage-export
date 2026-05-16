import { HealthRecord, SearchResult } from '../../types'
import { formatThaiDate } from '../../utils/dateFormat'

interface Props {
  result: SearchResult
  onRowClick: (pid: string) => void
  page: number
  onPageChange: (page: number) => void
}

const SEX_LABEL: Record<string, string> = { '1': 'ชาย', '2': 'หญิง' }

export function RecordsTable({ result, onRowClick, page, onPageChange }: Props) {
  const { data, total, totalPages } = result

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          พบข้อมูลทั้งหมด <strong className="text-gray-900">{total.toLocaleString()}</strong> รายการ
        </span>
        <span className="text-xs text-gray-500">หน้า {page} / {totalPages}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-blue-700 text-white">
            <tr>
              {['รหัสหน่วยบริการ', 'HN', 'เลขบัตร', 'ชื่อ-นามสกุล', 'เพศ', 'วันเกิด', 'วันรับบริการ'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">ไม่พบข้อมูล</td>
              </tr>
            ) : (
              data.map((record: HealthRecord) => (
                <tr
                  key={`${record.HOSPCODE}-${record.PID}-${record.SEQ}`}
                  onClick={() => onRowClick(record.PID)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2 text-gray-700">{record.HOSPCODE}</td>
                  <td className="px-4 py-2 text-gray-700">{record.HN}</td>
                  <td className="px-4 py-2 text-gray-600 font-mono text-xs">{record.CID}</td>
                  <td className="px-4 py-2 text-gray-900 font-medium">{record.PRENAME}{record.NAME} {record.LNAME}</td>
                  <td className="px-4 py-2 text-gray-700">{SEX_LABEL[record.SEX] ?? record.SEX}</td>
                  <td className="px-4 py-2 text-gray-700">{formatThaiDate(record.BIRTH)}</td>
                  <td className="px-4 py-2 text-gray-700">{formatThaiDate(record.DATE_SERV)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          >
            ก่อนหน้า
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          >
            ถัดไป
          </button>
        </div>
      )}
    </div>
  )
}
