// frontend/tests/basicConfigUtils.revertBanner.test.ts
// RED → GREEN: tests for formatRevertBanner helper (F2 undo)

import { formatRevertBanner } from '../src/data/basicConfigUtils'

describe('formatRevertBanner', () => {
  it('formats correctly when to is a non-empty string', () => {
    expect(formatRevertBanner('05', '0100')).toBe('ย้อนแล้ว: 05 กลับเป็น 0100')
  })

  it('formats correctly when to is null (reverted to empty)', () => {
    expect(formatRevertBanner('05', null)).toBe('ย้อนแล้ว: 05 กลับเป็น (ว่าง)')
  })

  it('formats correctly when to is an empty string (reverted to empty)', () => {
    expect(formatRevertBanner('CLI01', '')).toBe('ย้อนแล้ว: CLI01 กลับเป็น (ว่าง)')
  })

  it('includes the code in the output', () => {
    const result = formatRevertBanner('I001', 'BC99')
    expect(result).toContain('I001')
    expect(result).toContain('BC99')
  })

  it('handles Thai codes correctly', () => {
    expect(formatRevertBanner('ไม่มียาในบัญชียา', 'EZ')).toBe('ย้อนแล้ว: ไม่มียาในบัญชียา กลับเป็น EZ')
  })
})
