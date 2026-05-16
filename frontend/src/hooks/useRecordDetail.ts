import { useQuery } from '@tanstack/react-query'
import { getRecord } from '../services/api'

export function useRecordDetail(pid: string | null) {
  return useQuery({
    queryKey: ['record', pid],
    queryFn: () => getRecord(pid!),
    enabled: pid !== null,
    staleTime: 60_000,
  })
}
