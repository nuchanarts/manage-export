/**
 * Pure transformation: ValidationReport → summary + detail rows for Excel export.
 * No I/O; fully unit-testable.
 */

export interface ValidationReportInput {
  hospcode?: string
  generatedAt?: string
  errorGroupSummary?: Array<{
    fileName: string
    topErrors?: Array<{ field: string; caption: string; count: number }>
  }>
  files: Array<{
    fileName: string
    fileMeta?: { fileType?: string } | null
    totalRows?: number
    passPersons?: number
    failPersons?: number
    passPercent?: number
    missingColumns?: string[]
    errors?: Array<{
      row: number
      field: string
      caption: string
      type: string
      value?: string
      message?: string
      pid?: string
      cid?: string
    }>
    personErrors?: Array<{
      pid: string
      cid?: string
      hn?: string
      name?: string
      errors: Array<{ field: string; caption: string; type: string; value?: string }>
    }>
  }>
}

export interface SummaryRow {
  fileName: string
  fileType: string
  totalRows: number
  passPersons: number
  failPersons: number
  passPercent: number
  missingColumns: string
  mainProblems: string
}

export interface DetailRow {
  fileName: string
  row: number | string
  pid: string
  cid: string
  field: string
  errorType: string
  message: string
}

export interface ErrorExportRows {
  summaryRows: SummaryRow[]
  detailRows: DetailRow[]
  truncated: boolean
}

const DETAIL_ROW_LIMIT = 50_000

/**
 * Build summary and detail rows from a validation report.
 * @param report - The validation report (or minimal subset).
 * @returns { summaryRows, detailRows, truncated }
 */
export function buildErrorExportRows(report: ValidationReportInput): ErrorExportRows {
  const summaryRows: SummaryRow[] = []
  const detailRows: DetailRow[] = []
  let truncated = false

  // Build a map of topErrors captions keyed by fileName from errorGroupSummary
  const topErrorsMap = new Map<string, string>()
  if (Array.isArray(report.errorGroupSummary)) {
    for (const g of report.errorGroupSummary) {
      const captions = (g.topErrors ?? []).map((e) => `${e.field}(${e.count})`).join(', ')
      topErrorsMap.set(g.fileName, captions)
    }
  }

  for (const file of report.files) {
    const fileName = file.fileName ?? ''
    const fileType = file.fileMeta?.fileType ?? ''
    const totalRows = file.totalRows ?? 0
    const passPersons = file.passPersons ?? 0
    const failPersons = file.failPersons ?? 0
    const passPercent = file.passPercent ?? 0
    const missingCols = file.missingColumns ?? []
    const missingColumns = missingCols.join(', ')
    const mainProblems = topErrorsMap.get(fileName) ?? ''

    summaryRows.push({
      fileName,
      fileType,
      totalRows,
      passPersons,
      failPersons,
      passPercent,
      missingColumns,
      mainProblems,
    })

    // Detail rows: from file.errors (field-level) flattened
    const fileErrors = file.errors ?? []
    for (const err of fileErrors) {
      if (detailRows.length >= DETAIL_ROW_LIMIT) { truncated = true; break }
      detailRows.push({
        fileName,
        row: err.row,
        pid: err.pid ?? '',
        cid: err.cid ?? '',
        field: err.field ?? '',
        errorType: err.type ?? '',
        message: err.message ?? err.value ?? '',
      })
    }

    if (truncated) break

    // Additional detail rows: from personErrors (person-level errors)
    const personErrors = file.personErrors ?? []
    for (const person of personErrors) {
      for (const pe of person.errors) {
        if (detailRows.length >= DETAIL_ROW_LIMIT) { truncated = true; break }
        detailRows.push({
          fileName,
          row: '',
          pid: person.pid ?? '',
          cid: person.cid ?? '',
          field: pe.field ?? '',
          errorType: pe.type ?? '',
          message: pe.value ?? '',
        })
      }
      if (truncated) break
    }

    if (truncated) break
  }

  return { summaryRows, detailRows, truncated }
}
