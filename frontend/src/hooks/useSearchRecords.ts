import { useQuery } from '@tanstack/react-query'
import { searchRecords } from '../services/api'
import { SearchFilter } from '../types'

type FilterInput = Omit<SearchFilter, 'page' | 'pageSize'> & { page?: number; pageSize?: number }

export function useSearchRecords(filter: FilterInput) {
  return useQuery({
    queryKey: ['records', filter],
    queryFn: () => searchRecords(filter),
    enabled: !!(filter.dateFrom && filter.dateTo),
    staleTime: 30_000,
  })
}
