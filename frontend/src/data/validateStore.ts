/**
 * Module-level singleton that persists the last validation session across
 * menu-tab switches within the app session.
 *
 * Pattern mirrors appNav.ts: plain module state, no React, no dependencies.
 * ValidatePage reads from this store on mount (lazy initialiser) and writes
 * back whenever report / fileName change.
 */

// Re-export the ValidationReport shape so ValidatePage can share the type
// without duplicating it.  Keep it in one place; ValidatePage imports from here.

export interface FieldError {
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

export interface PersonError {
  pid: string
  cid: string
  hn: string
  name: string
  errors: { field: string; caption: string; type: string; value?: string }[]
}

export interface SchemaFieldSummary {
  name: string
  caption: string
  type: string
  width: number
  notNull: boolean
  pk: boolean
}

export interface HisGuide {
  menu: string
  path: string[]
  screen: string
  note?: string
  keyFields: string[]
}

export interface FileMetaFull {
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

export interface FileResult {
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

export interface ErrorGroupSummary {
  fileName: string
  description: string
  totalPersons: number
  failPersons: number
  passPercent: number
  topErrors: { field: string; caption: string; count: number }[]
}

export interface ValidationReport {
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

export interface ValidateSession {
  report: ValidationReport | null
  fileName: string | null
}

let _s: ValidateSession = { report: null, fileName: null }

export function getValidateSession(): ValidateSession {
  return _s
}

export function setValidateSession(s: ValidateSession): void {
  _s = s
}
