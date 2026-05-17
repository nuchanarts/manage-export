// backend/tests/unit/validateExport.test.ts
// TDD: RED → GREEN for buildErrorExportRows pure function

import { buildErrorExportRows, ValidationReportInput } from '../../src/services/validateExport'

const minimalReport = (): ValidationReportInput => ({
  hospcode: 'HOSP001',
  files: [],
})

describe('buildErrorExportRows', () => {
  describe('empty files array', () => {
    it('returns empty summaryRows and detailRows', () => {
      const result = buildErrorExportRows(minimalReport())
      expect(result.summaryRows).toEqual([])
      expect(result.detailRows).toEqual([])
      expect(result.truncated).toBe(false)
    })
  })

  describe('file with no errors', () => {
    it('produces one summary row with zeros and no detail rows', () => {
      const report: ValidationReportInput = {
        files: [
          {
            fileName: 'PERSON.txt',
            fileMeta: { fileType: 'สะสม' },
            totalRows: 100,
            passPersons: 100,
            failPersons: 0,
            passPercent: 100,
            missingColumns: [],
            errors: [],
            personErrors: [],
          },
        ],
      }
      const result = buildErrorExportRows(report)
      expect(result.summaryRows).toHaveLength(1)
      expect(result.summaryRows[0]).toMatchObject({
        fileName: 'PERSON.txt',
        fileType: 'สะสม',
        totalRows: 100,
        passPersons: 100,
        failPersons: 0,
        passPercent: 100,
        missingColumns: '',
        mainProblems: '',
      })
      expect(result.detailRows).toHaveLength(0)
      expect(result.truncated).toBe(false)
    })
  })

  describe('file with field-level errors', () => {
    it('produces correct summary and detail rows from errors array', () => {
      const report: ValidationReportInput = {
        files: [
          {
            fileName: 'DRUG.txt',
            fileMeta: { fileType: 'บริการ' },
            totalRows: 50,
            passPersons: 48,
            failPersons: 2,
            passPercent: 96,
            missingColumns: ['DRUGTYPE', 'DNAME'],
            errors: [
              {
                row: 3,
                field: 'DRUGTYPE',
                caption: 'ประเภทยา',
                type: 'NULL_REQUIRED',
                value: '',
                message: 'ค่าว่าง',
                pid: 'P001',
                cid: '1234567890123',
              },
              {
                row: 7,
                field: 'DNAME',
                caption: 'ชื่อยา',
                type: 'EXCEEDS_WIDTH',
                value: 'very long name',
                message: 'ยาวเกิน',
                pid: 'P002',
                cid: '9876543210987',
              },
            ],
            personErrors: [],
          },
        ],
      }
      const result = buildErrorExportRows(report)

      // Summary
      expect(result.summaryRows).toHaveLength(1)
      const summary = result.summaryRows[0]!
      expect(summary.fileName).toBe('DRUG.txt')
      expect(summary.missingColumns).toBe('DRUGTYPE, DNAME')
      expect(summary.failPersons).toBe(2)
      expect(summary.passPercent).toBe(96)

      // Detail
      expect(result.detailRows).toHaveLength(2)
      const detail0 = result.detailRows[0]!
      expect(detail0.fileName).toBe('DRUG.txt')
      expect(detail0.row).toBe(3)
      expect(detail0.pid).toBe('P001')
      expect(detail0.cid).toBe('1234567890123')
      expect(detail0.field).toBe('DRUGTYPE')
      expect(detail0.errorType).toBe('NULL_REQUIRED')
      expect(detail0.message).toBe('ค่าว่าง')

      const detail1 = result.detailRows[1]!
      expect(detail1.row).toBe(7)
      expect(detail1.field).toBe('DNAME')
    })
  })

  describe('file with personErrors', () => {
    it('flattens personErrors into detailRows with empty row', () => {
      const report: ValidationReportInput = {
        files: [
          {
            fileName: 'ANC.txt',
            fileMeta: { fileType: 'บริการกึ่งสำรวจ' },
            totalRows: 10,
            passPersons: 8,
            failPersons: 2,
            passPercent: 80,
            missingColumns: [],
            errors: [],
            personErrors: [
              {
                pid: 'PID01',
                cid: 'CID01',
                hn: 'HN001',
                name: 'นาย Test',
                errors: [
                  { field: 'GRAVIDA', caption: 'ครรภ์ที่', type: 'NULL_REQUIRED' },
                  { field: 'ANC', caption: 'ฝากครรภ์', type: 'NULL_REQUIRED' },
                ],
              },
            ],
          },
        ],
      }
      const result = buildErrorExportRows(report)
      expect(result.detailRows).toHaveLength(2)
      expect(result.detailRows[0]!.pid).toBe('PID01')
      expect(result.detailRows[0]!.row).toBe('')
      expect(result.detailRows[0]!.field).toBe('GRAVIDA')
      expect(result.detailRows[1]!.field).toBe('ANC')
    })
  })

  describe('missingColumns joined', () => {
    it('joins multiple missingColumns with comma-space', () => {
      const report: ValidationReportInput = {
        files: [
          {
            fileName: 'TEST.txt',
            missingColumns: ['COL_A', 'COL_B', 'COL_C'],
            errors: [],
            personErrors: [],
          },
        ],
      }
      const result = buildErrorExportRows(report)
      expect(result.summaryRows[0]!.missingColumns).toBe('COL_A, COL_B, COL_C')
    })

    it('is empty string when no missing columns', () => {
      const report: ValidationReportInput = {
        files: [
          {
            fileName: 'TEST.txt',
            missingColumns: [],
            errors: [],
            personErrors: [],
          },
        ],
      }
      const result = buildErrorExportRows(report)
      expect(result.summaryRows[0]!.missingColumns).toBe('')
    })
  })

  describe('errorGroupSummary mainProblems', () => {
    it('maps topErrors captions to mainProblems column for matching file', () => {
      const report: ValidationReportInput = {
        files: [
          {
            fileName: 'DIAG.txt',
            errors: [],
            personErrors: [],
          },
        ],
        errorGroupSummary: [
          {
            fileName: 'DIAG.txt',
            topErrors: [
              { field: 'DIAGTYPE', caption: 'ประเภทการวินิจฉัย', count: 42 },
              { field: 'ICDTERM', caption: 'รหัส ICD', count: 10 },
            ],
          },
        ],
      }
      const result = buildErrorExportRows(report)
      expect(result.summaryRows[0]!.mainProblems).toBe('DIAGTYPE(42), ICDTERM(10)')
    })

    it('leaves mainProblems empty when file not in errorGroupSummary', () => {
      const report: ValidationReportInput = {
        files: [{ fileName: 'OTHER.txt', errors: [], personErrors: [] }],
        errorGroupSummary: [
          { fileName: 'DIAG.txt', topErrors: [{ field: 'X', caption: 'Y', count: 1 }] },
        ],
      }
      const result = buildErrorExportRows(report)
      expect(result.summaryRows[0]!.mainProblems).toBe('')
    })
  })

  describe('row cap / truncation', () => {
    it('caps at 50000 detail rows and sets truncated=true', () => {
      // Build a report with 50001 errors in one file
      const errors = Array.from({ length: 50001 }, (_, i) => ({
        row: i + 1,
        field: 'FIELD',
        caption: 'Caption',
        type: 'NULL_REQUIRED',
        message: `error ${i}`,
        pid: `P${i}`,
        cid: `C${i}`,
      }))
      const report: ValidationReportInput = {
        files: [
          {
            fileName: 'BIG.txt',
            errors,
            personErrors: [],
          },
        ],
      }
      const result = buildErrorExportRows(report)
      expect(result.detailRows.length).toBe(50000)
      expect(result.truncated).toBe(true)
    })

    it('does not truncate when exactly at the limit', () => {
      const errors = Array.from({ length: 50000 }, (_, i) => ({
        row: i + 1,
        field: 'FIELD',
        caption: 'Caption',
        type: 'NULL_REQUIRED',
        message: `error ${i}`,
      }))
      const report: ValidationReportInput = {
        files: [{ fileName: 'EXACT.txt', errors, personErrors: [] }],
      }
      const result = buildErrorExportRows(report)
      expect(result.detailRows.length).toBe(50000)
      expect(result.truncated).toBe(false)
    })
  })

  describe('multiple files', () => {
    it('produces one summary row per file', () => {
      const report: ValidationReportInput = {
        files: [
          { fileName: 'A.txt', errors: [], personErrors: [] },
          { fileName: 'B.txt', errors: [], personErrors: [] },
          { fileName: 'C.txt', errors: [], personErrors: [] },
        ],
      }
      const result = buildErrorExportRows(report)
      expect(result.summaryRows).toHaveLength(3)
      expect(result.summaryRows.map((r) => r.fileName)).toEqual(['A.txt', 'B.txt', 'C.txt'])
    })
  })

  describe('fileMeta null/undefined fallbacks', () => {
    it('handles null fileMeta gracefully', () => {
      const report: ValidationReportInput = {
        files: [
          {
            fileName: 'NOFILE.txt',
            fileMeta: null,
            errors: [],
            personErrors: [],
          },
        ],
      }
      const result = buildErrorExportRows(report)
      expect(result.summaryRows[0]!.fileType).toBe('')
    })

    it('handles missing fileMeta gracefully', () => {
      const report: ValidationReportInput = {
        files: [{ fileName: 'NOFILE.txt', errors: [], personErrors: [] }],
      }
      const result = buildErrorExportRows(report)
      expect(result.summaryRows[0]!.fileType).toBe('')
    })
  })
})
