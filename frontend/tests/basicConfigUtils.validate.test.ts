// frontend/tests/basicConfigUtils.validate.test.ts
// TDD RED→GREEN for frontend validateStdValue mirror helper (F6)

import { validateStdValue, StdRule } from '../src/data/basicConfigUtils'

describe('validateStdValue (frontend mirror) — core logic', () => {
  it('returns ok:true when rule is undefined', () => {
    expect(validateStdValue(undefined, 'anything')).toEqual({ ok: true })
    expect(validateStdValue(undefined, '')).toEqual({ ok: true })
  })

  it('returns ok:true for empty string regardless of rule (clearing always allowed)', () => {
    const rule: StdRule = { pattern: '^[0-9]+$', message: 'digits only' }
    expect(validateStdValue(rule, '')).toEqual({ ok: true })
  })

  it('returns ok:true when value passes pattern', () => {
    const rule: StdRule = { pattern: '^[0-9]+$', message: 'digits only' }
    expect(validateStdValue(rule, '123')).toEqual({ ok: true })
  })

  it('returns ok:false with message when value fails pattern', () => {
    const rule: StdRule = { pattern: '^[0-9]+$', message: 'digits only' }
    expect(validateStdValue(rule, 'abc')).toEqual({ ok: false, message: 'digits only' })
  })

  it('returns ok:false when value is shorter than minLen', () => {
    const rule: StdRule = { minLen: 5, message: 'too short' }
    expect(validateStdValue(rule, 'abc')).toEqual({ ok: false, message: 'too short' })
  })

  it('returns ok:true when value equals minLen', () => {
    const rule: StdRule = { minLen: 3, message: 'too short' }
    expect(validateStdValue(rule, 'abc')).toEqual({ ok: true })
  })

  it('returns ok:false when value exceeds maxLen', () => {
    const rule: StdRule = { maxLen: 3, message: 'too long' }
    expect(validateStdValue(rule, 'abcde')).toEqual({ ok: false, message: 'too long' })
  })

  it('returns ok:true when value equals maxLen', () => {
    const rule: StdRule = { maxLen: 3, message: 'too long' }
    expect(validateStdValue(rule, 'abc')).toEqual({ ok: true })
  })

  it('passes all checks: minLen + maxLen + pattern all satisfied', () => {
    const rule: StdRule = { pattern: '^[A-Z][0-9].*$', minLen: 3, maxLen: 6, message: 'fail' }
    expect(validateStdValue(rule, 'E11')).toEqual({ ok: true })
    expect(validateStdValue(rule, 'A12.3')).toEqual({ ok: true })
  })

  it('handles minLen failing first (before pattern check)', () => {
    const rule: StdRule = { pattern: '^[0-9]+$', minLen: 5, message: 'fail' }
    expect(validateStdValue(rule, 'ab')).toEqual({ ok: false, message: 'fail' })
  })

  it('treats malformed regex as pass (never throws)', () => {
    const rule: StdRule = { pattern: '[invalid(regex', message: 'should not fail' }
    expect(() => validateStdValue(rule, 'anything')).not.toThrow()
    expect(validateStdValue(rule, 'anything')).toEqual({ ok: true })
  })

  it('handles rule with only message (no constraints) → always passes for non-empty', () => {
    const rule: StdRule = { message: 'fallback' }
    expect(validateStdValue(rule, 'anything')).toEqual({ ok: true })
  })
})

describe('validateStdValue (frontend) — chronic-disease ICD-10 rule', () => {
  const rule: StdRule = { pattern: '^[A-Za-z][0-9].*', message: 'รหัส ICD-10 ควรขึ้นต้นด้วยตัวอักษรตามด้วยตัวเลข' }

  it('E11 passes', () => {
    expect(validateStdValue(rule, 'E11')).toEqual({ ok: true })
  })

  it('Z00.0 passes', () => {
    expect(validateStdValue(rule, 'Z00.0')).toEqual({ ok: true })
  })

  it('all-digits 123 fails', () => {
    expect(validateStdValue(rule, '123').ok).toBe(false)
  })

  it('empty bypasses', () => {
    expect(validateStdValue(rule, '')).toEqual({ ok: true })
  })
})

describe('validateStdValue (frontend) — procedure ICD-9-CM rule', () => {
  const rule: StdRule = { pattern: '^[0-9.]+$', minLen: 2, message: 'รหัส ICD-9-CM ควรเป็นตัวเลข (อาจมีจุด)' }

  it('93.01 passes', () => {
    expect(validateStdValue(rule, '93.01')).toEqual({ ok: true })
  })

  it('99 passes (at minLen boundary)', () => {
    expect(validateStdValue(rule, '99')).toEqual({ ok: true })
  })

  it('single digit 9 fails minLen:2', () => {
    expect(validateStdValue(rule, '9').ok).toBe(false)
  })

  it('letters-only ABC fails pattern', () => {
    expect(validateStdValue(rule, 'ABC').ok).toBe(false)
  })

  it('empty bypasses', () => {
    expect(validateStdValue(rule, '')).toEqual({ ok: true })
  })
})

describe('validateStdValue (frontend) — drug-list 24-char rule', () => {
  const rule: StdRule = { pattern: '^[0-9A-Za-z]{24}$', message: 'รหัสยา 24 หลัก ต้องมี 24 ตัวอักษร/ตัวเลข' }

  it('24-char alphanumeric passes', () => {
    expect(validateStdValue(rule, 'A'.repeat(24))).toEqual({ ok: true })
  })

  it('5-char code fails', () => {
    expect(validateStdValue(rule, 'ABCDE').ok).toBe(false)
  })

  it('25-char code fails', () => {
    expect(validateStdValue(rule, 'A'.repeat(25)).ok).toBe(false)
  })

  it('empty bypasses', () => {
    expect(validateStdValue(rule, '')).toEqual({ ok: true })
  })
})
