import { useRecordDetail } from '../../hooks/useRecordDetail'
import { formatThaiDate } from '../../utils/dateFormat'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { ErrorMessage } from '../shared/ErrorMessage'

interface Props {
  pid: string | null
  onClose: () => void
}

const SEX_LABEL: Record<string, string> = { '1': 'ชาย', '2': 'หญิง' }

const FIELD_LABELS: { key: string; label: string; format?: (v: string) => string }[] = [
  { key: 'HOSPCODE', label: 'รหัสหน่วยบริการ' },
  { key: 'PID', label: 'ทะเบียนบุคคล' },
  { key: 'CID', label: 'เลขบัตรประชาชน' },
  { key: 'HN', label: 'เลขผู้ป่วยนอก (HN)' },
  { key: 'SEQ', label: 'ลำดับบริการ' },
  { key: 'DATE_SERV', label: 'วันที่รับบริการ', format: formatThaiDate },
  { key: 'PRENAME', label: 'คำนำหน้า' },
  { key: 'NAME', label: 'ชื่อ' },
  { key: 'LNAME', label: 'นามสกุล' },
  { key: 'SEX', label: 'เพศ', format: (v) => SEX_LABEL[v] ?? v },
  { key: 'BIRTH', label: 'วันเกิด', format: formatThaiDate },
  { key: 'TYPEAREA', label: 'สถานะบุคคล' },
  { key: 'AREACODE', label: 'รหัสพื้นที่' },
]

export function RecordDetailModal({ pid, onClose }: Props) {
  const { data, isLoading, isError } = useRecordDetail(pid)

  if (!pid) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">รายละเอียดข้อมูล</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl leading-none">&times;</button>
        </div>

        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
          )}
          {isError && (
            <ErrorMessage message="ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่" />
          )}
          {data && (
            <dl className="divide-y divide-gray-100">
              {FIELD_LABELS.map(({ key, label, format }) => {
                const value = (data as Record<string, string>)[key] ?? ''
                return (
                  <div key={key} className="py-2 grid grid-cols-2 gap-2">
                    <dt className="text-sm text-gray-500">{label}</dt>
                    <dd className="text-sm text-gray-900 font-medium">{format ? format(value) : value || '-'}</dd>
                  </div>
                )
              })}
            </dl>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}
