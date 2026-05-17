// frontend/tests/basicConfigUtils.importSummary.test.ts
import { buildImportSummary } from '../src/data/basicConfigUtils'

describe('buildImportSummary', () => {
  it('formats correctly', () => {
    expect(buildImportSummary(5, 2, 0)).toBe('อัปเดต 5 · ข้าม 2 · ผิดพลาด 0')
  })

  it('handles all zeros', () => {
    expect(buildImportSummary(0, 0, 0)).toBe('อัปเดต 0 · ข้าม 0 · ผิดพลาด 0')
  })

  it('handles errors', () => {
    expect(buildImportSummary(3, 1, 7)).toBe('อัปเดต 3 · ข้าม 1 · ผิดพลาด 7')
  })
})
