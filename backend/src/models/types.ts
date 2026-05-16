export interface HealthRecord {
  HOSPCODE: string
  PID: string
  CID: string
  HN: string
  SEQ: string
  DATE_SERV: string
  PRENAME: string
  NAME: string
  LNAME: string
  SEX: string
  BIRTH: string
  TYPEAREA: string
  AREACODE: string
}

export interface SearchFilter {
  dateFrom: string
  dateTo: string
  hospcode?: string
  birthFrom?: string
  birthTo?: string
  page: number
  pageSize: number
}

export interface SearchResult {
  data: HealthRecord[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiError {
  error: string
  message: string
  field?: string
}
