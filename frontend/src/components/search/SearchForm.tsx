import { useForm } from 'react-hook-form'

export interface SearchFormValues {
  dateFrom: string
  dateTo: string
  hospcode?: string
  birthFrom?: string
  birthTo?: string
}

interface Props {
  onSearch: (values: SearchFormValues) => void
  isLoading: boolean
  defaultValues?: Partial<SearchFormValues>
}

export function SearchForm({ onSearch, isLoading, defaultValues }: Props) {
  const { register, handleSubmit, formState: { errors }, getValues, setError } = useForm<SearchFormValues>({
    defaultValues,
  })

  const onSubmit = (values: SearchFormValues) => {
    if (values.dateTo < values.dateFrom) {
      setError('dateTo', { message: 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น' })
      return
    }
    const hasBirthFrom = !!values.birthFrom
    const hasBirthTo = !!values.birthTo
    if (hasBirthFrom !== hasBirthTo) {
      setError('birthFrom', { message: 'ต้องระบุวันเกิดเริ่มต้นและสิ้นสุดพร้อมกัน' })
      return
    }
    onSearch(values)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">ค้นหาข้อมูล</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            วันที่รับบริการ (เริ่มต้น) <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            {...register('dateFrom', { required: 'กรุณาระบุวันที่เริ่มต้น' })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.dateFrom && <p className="text-xs text-red-600 mt-1">{errors.dateFrom.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            วันที่รับบริการ (สิ้นสุด) <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            {...register('dateTo', { required: 'กรุณาระบุวันที่สิ้นสุด' })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.dateTo && <p className="text-xs text-red-600 mt-1">{errors.dateTo.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">รหัสหน่วยบริการ</label>
          <input
            type="text"
            {...register('hospcode')}
            placeholder="ตัวอย่าง: 12345"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วันเกิด (เริ่มต้น)</label>
            <input
              type="date"
              {...register('birthFrom')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.birthFrom && <p className="text-xs text-red-600 mt-1">{errors.birthFrom.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วันเกิด (สิ้นสุด)</label>
            <input
              type="date"
              {...register('birthTo')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-medium px-6 py-2 rounded-md text-sm transition-colors"
        >
          {isLoading && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
          ค้นหา
        </button>
      </div>
    </form>
  )
}
