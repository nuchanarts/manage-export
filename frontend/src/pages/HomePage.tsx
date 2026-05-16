import { useState, useEffect } from 'react'
import { SearchForm, SearchFormValues } from '../components/search/SearchForm'
import { RecordsTable } from '../components/search/RecordsTable'
import { ExportButton } from '../components/search/ExportButton'
import { RecordDetailModal } from '../components/search/RecordDetailModal'
import { ErrorMessage } from '../components/shared/ErrorMessage'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'
import { useSearchRecords } from '../hooks/useSearchRecords'

function getDefaultDates(): { dateFrom: string; dateTo: string } {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return {
    dateFrom: `${yyyy}-${mm}-01`,
    dateTo: `${yyyy}-${mm}-${dd}`,
  }
}

export function HomePage() {
  const defaults = getDefaultDates()
  const [activeFilter, setActiveFilter] = useState<SearchFormValues>({
    dateFrom: defaults.dateFrom,
    dateTo: defaults.dateTo,
  })
  const [page, setPage] = useState(1)
  const [selectedPid, setSelectedPid] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useSearchRecords(
    { ...activeFilter, page, pageSize: 50 }
  )

  // Auto-search on first mount is handled by useSearchRecords being always enabled
  useEffect(() => {
    setPage(1)
  }, [activeFilter.dateFrom, activeFilter.dateTo])

  const handleSearch = (values: SearchFormValues) => {
    setActiveFilter(values)
    setPage(1)
  }

  const rawError = isError
    ? (error as { response?: { data?: { message?: string } }; message?: string })
    : null
  const isDbNotConfigured = rawError?.message?.includes('DATABASE_URL') ||
    rawError?.response?.data?.message?.includes('DATABASE_URL')
  const errorMessage = isError
    ? (rawError?.response?.data?.message ?? rawError?.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    : null

  return (
    <div className="space-y-4">
      <SearchForm
        onSearch={handleSearch}
        isLoading={isLoading}
        defaultValues={activeFilter}
      />

      {isLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {isDbNotConfigured ? (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-6 text-sm space-y-3">
          <p className="font-bold text-yellow-800 text-base">⚙️ ยังไม่ได้ตั้งค่าฐานข้อมูล</p>
          <p className="text-yellow-700">สร้างไฟล์ <code className="bg-yellow-100 px-1 rounded font-mono">backend/.env</code> และกรอก connection string ของ EHP CIS:</p>
          <pre className="bg-white border border-yellow-200 rounded-lg p-3 font-mono text-xs text-gray-800 overflow-x-auto">{`# MySQL (EHP CIS)
DATABASE_URL=mysql://username:password@localhost:3306/database_name
PORT=6000
NODE_ENV=development`}</pre>
          <p className="text-yellow-600 text-xs">ขอ username/password/database_name จาก DBA หรือดูใน EHPCISWebApplication → ตั้งค่าฐานข้อมูล</p>
        </div>
      ) : errorMessage ? (
        <ErrorMessage message={errorMessage} />
      ) : null}

      {data && !isLoading && (
        <>
          <div className="flex justify-end">
            <ExportButton filter={activeFilter} total={data.total} />
          </div>
          <RecordsTable
            result={data}
            onRowClick={setSelectedPid}
            page={page}
            onPageChange={setPage}
          />
        </>
      )}

      <RecordDetailModal pid={selectedPid} onClose={() => setSelectedPid(null)} />
    </div>
  )
}
