import { resolveComboCommit, StdOption } from '../src/data/basicConfigUtils'

const OPTIONS: StdOption[] = [
  { code: '0510', name: 'เกษตรกร' },
  { code: '0520', name: 'ประมง' },
  { code: 'E11', name: 'เบาหวาน' },
  { code: 'Z00', name: 'ตรวจสุขภาพ' },
]

describe('resolveComboCommit', () => {
  it('returns empty string for empty query (clear mapping)', () => {
    expect(resolveComboCommit('', OPTIONS)).toBe('')
    expect(resolveComboCommit('   ', OPTIONS)).toBe('')
  })

  it('returns the option code when query exactly matches an option code (case-insensitive)', () => {
    expect(resolveComboCommit('0510', OPTIONS)).toBe('0510')
    expect(resolveComboCommit('e11', OPTIONS)).toBe('E11')
    expect(resolveComboCommit('E11', OPTIONS)).toBe('E11')
  })

  it('returns the option code when query exactly matches an option name (normalised)', () => {
    expect(resolveComboCommit('เกษตรกร', OPTIONS)).toBe('0510')
    expect(resolveComboCommit('เบาหวาน', OPTIONS)).toBe('E11')
    expect(resolveComboCommit('  เบาหวาน  ', OPTIONS)).toBe('E11')
  })

  it('returns the raw trimmed query when it does not match any option (free-text / custom code)', () => {
    expect(resolveComboCommit('CUSTOM99', OPTIONS)).toBe('CUSTOM99')
    expect(resolveComboCommit('  รหัสใหม่  ', OPTIONS)).toBe('รหัสใหม่')
    expect(resolveComboCommit('9999', OPTIONS)).toBe('9999')
  })

  it('handles empty options list — returns raw trimmed query for non-empty input', () => {
    expect(resolveComboCommit('ABC', [])).toBe('ABC')
    expect(resolveComboCommit('', [])).toBe('')
  })

  it('code match takes priority over partial name match', () => {
    // '0510' is an exact code match, should return '0510' not some partial match
    expect(resolveComboCommit('0510', OPTIONS)).toBe('0510')
  })
})
