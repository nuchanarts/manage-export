import {
  getValidateSession,
  setValidateSession,
  type ValidationReport,
  type ValidateSession,
} from '../src/data/validateStore'

describe('validateStore', () => {
  // Reset to clean state before each test so tests are isolated
  beforeEach(() => {
    setValidateSession({ report: null, fileName: null })
  })

  it('initial session has null report and null fileName', () => {
    const s = getValidateSession()
    expect(s.report).toBeNull()
    expect(s.fileName).toBeNull()
  })

  it('setValidateSession stores a session and getValidateSession returns it', () => {
    const mockReport: ValidationReport = {
      hospcode: '12345',
      totalFiles: 43,
      passCount: 40,
      failCount: 3,
      warnCount: 0,
      totalPersonsAll: 100,
      passPersonsAll: 95,
      failPersonsAll: 5,
      passPercentAll: 95.0,
      errorGroupSummary: [],
      missingFiles: [],
      unknownFiles: [],
      files: [],
      generatedAt: '2026-05-18T00:00:00.000Z',
    }

    setValidateSession({ report: mockReport, fileName: 'export.zip' })

    const s = getValidateSession()
    expect(s.report).toEqual(mockReport)
    expect(s.fileName).toBe('export.zip')
  })

  it('setValidateSession with null report clears the report', () => {
    const mockReport: ValidationReport = {
      hospcode: '99999',
      totalFiles: 1,
      passCount: 1,
      failCount: 0,
      warnCount: 0,
      totalPersonsAll: 0,
      passPersonsAll: 0,
      failPersonsAll: 0,
      passPercentAll: 100,
      errorGroupSummary: [],
      missingFiles: [],
      unknownFiles: [],
      files: [],
      generatedAt: '2026-05-18T00:00:00.000Z',
    }

    setValidateSession({ report: mockReport, fileName: 'test.zip' })
    setValidateSession({ report: null, fileName: 'test.zip' })

    expect(getValidateSession().report).toBeNull()
    expect(getValidateSession().fileName).toBe('test.zip')
  })

  it('round-trip: set then get returns identical reference', () => {
    const session: ValidateSession = {
      report: null,
      fileName: '📁 my-folder (43 ไฟล์ .txt)',
    }

    setValidateSession(session)
    expect(getValidateSession()).toBe(session)
  })

  it('successive sets overwrite previous session', () => {
    setValidateSession({ report: null, fileName: 'first.zip' })
    setValidateSession({ report: null, fileName: 'second.zip' })

    expect(getValidateSession().fileName).toBe('second.zip')
  })
})
