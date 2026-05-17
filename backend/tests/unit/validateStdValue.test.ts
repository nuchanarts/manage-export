// backend/tests/unit/validateStdValue.test.ts
// TDD RED→GREEN for validateStdValue helper and seeded registry rules (F6)

import {
  validateStdValue,
  getCategory,
  listCategories,
  StdRule,
} from '../../src/services/categoryRegistry'

describe('validateStdValue — core logic', () => {
  it('returns ok:true when rule is undefined', () => {
    expect(validateStdValue(undefined, 'anything')).toEqual({ ok: true })
    expect(validateStdValue(undefined, '')).toEqual({ ok: true })
    expect(validateStdValue(undefined, 'BADVALUE')).toEqual({ ok: true })
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

  it('returns ok:true when value is longer than minLen', () => {
    const rule: StdRule = { minLen: 3, message: 'too short' }
    expect(validateStdValue(rule, 'abcde')).toEqual({ ok: true })
  })

  it('returns ok:false when value exceeds maxLen', () => {
    const rule: StdRule = { maxLen: 3, message: 'too long' }
    expect(validateStdValue(rule, 'abcde')).toEqual({ ok: false, message: 'too long' })
  })

  it('returns ok:true when value equals maxLen', () => {
    const rule: StdRule = { maxLen: 3, message: 'too long' }
    expect(validateStdValue(rule, 'abc')).toEqual({ ok: true })
  })

  it('returns ok:true when value is shorter than maxLen', () => {
    const rule: StdRule = { maxLen: 5, message: 'too long' }
    expect(validateStdValue(rule, 'ab')).toEqual({ ok: true })
  })

  it('checks minLen before pattern', () => {
    // If minLen fails, returns immediately without checking pattern
    const rule: StdRule = { pattern: '^[0-9]+$', minLen: 5, message: 'fail' }
    // 'ab' is shorter than 5 AND fails pattern — should still return the message
    expect(validateStdValue(rule, 'ab')).toEqual({ ok: false, message: 'fail' })
  })

  it('checks maxLen before pattern', () => {
    const rule: StdRule = { pattern: '^[0-9]+$', maxLen: 2, message: 'fail' }
    // '12345' is longer than 2 — fails maxLen check
    expect(validateStdValue(rule, '12345')).toEqual({ ok: false, message: 'fail' })
  })

  it('passes all checks when minLen+maxLen+pattern all satisfied', () => {
    const rule: StdRule = { pattern: '^[A-Z][0-9].*$', minLen: 3, maxLen: 6, message: 'fail' }
    expect(validateStdValue(rule, 'E11')).toEqual({ ok: true })
    expect(validateStdValue(rule, 'A12.3')).toEqual({ ok: true })
  })

  it('fails pattern when pattern anchored with ^…$ and value has extra chars', () => {
    const rule: StdRule = { pattern: '^[0-9]{24}$', message: 'must be 24 digits' }
    expect(validateStdValue(rule, '1234567890123456789012')).toEqual({ ok: false, message: 'must be 24 digits' })
    expect(validateStdValue(rule, '123456789012345678901234')).toEqual({ ok: true })
  })

  it('treats malformed regex pattern as pass (never throws)', () => {
    const rule: StdRule = { pattern: '[invalid(regex', message: 'should not fail' }
    // Bad regex → treated as pass
    expect(() => validateStdValue(rule, 'anything')).not.toThrow()
    expect(validateStdValue(rule, 'anything')).toEqual({ ok: true })
  })

  it('handles rule with only message (no pattern/minLen/maxLen) → always passes', () => {
    const rule: StdRule = { message: 'fallback' }
    expect(validateStdValue(rule, 'anything')).toEqual({ ok: true })
  })
})

describe('validateStdValue — chronic-disease rule (ICD-10)', () => {
  const c = getCategory('chronic-disease')!

  it('chronic-disease has a stdRule defined', () => {
    expect(c.stdRule).toBeDefined()
  })

  it('chronic-disease stdRule has the expected pattern', () => {
    expect(c.stdRule?.pattern).toBe('^[A-Za-z][0-9].*')
  })

  it('valid ICD-10 E11 passes', () => {
    expect(validateStdValue(c.stdRule, 'E11')).toEqual({ ok: true })
  })

  it('valid ICD-10 Z00.0 passes', () => {
    expect(validateStdValue(c.stdRule, 'Z00.0')).toEqual({ ok: true })
  })

  it('valid ICD-10 lowercase e11 passes (case-insensitive pattern)', () => {
    expect(validateStdValue(c.stdRule, 'e11')).toEqual({ ok: true })
  })

  it('all-digits code 123 fails ICD-10 rule', () => {
    const result = validateStdValue(c.stdRule, '123')
    expect(result.ok).toBe(false)
    expect(result.message).toBe(c.stdRule!.message)
  })

  it('empty value bypasses ICD-10 rule', () => {
    expect(validateStdValue(c.stdRule, '')).toEqual({ ok: true })
  })
})

describe('validateStdValue — procedure rule (ICD-9-CM)', () => {
  const c = getCategory('procedure')!

  it('procedure has a stdRule defined', () => {
    expect(c.stdRule).toBeDefined()
  })

  it('procedure stdRule has minLen:2', () => {
    expect(c.stdRule?.minLen).toBe(2)
  })

  it('valid code 93.01 passes', () => {
    expect(validateStdValue(c.stdRule, '93.01')).toEqual({ ok: true })
  })

  it('valid 2-char code 99 passes (at minLen boundary)', () => {
    expect(validateStdValue(c.stdRule, '99')).toEqual({ ok: true })
  })

  it('single digit 9 fails (below minLen 2)', () => {
    const result = validateStdValue(c.stdRule, '9')
    expect(result.ok).toBe(false)
  })

  it('letters-only value ABC fails', () => {
    const result = validateStdValue(c.stdRule, 'ABC')
    expect(result.ok).toBe(false)
  })

  it('empty value bypasses ICD-9-CM rule', () => {
    expect(validateStdValue(c.stdRule, '')).toEqual({ ok: true })
  })
})

describe('validateStdValue — drug-list rule (24-char TMT)', () => {
  const c = getCategory('drug-list')!

  it('drug-list has a stdRule defined', () => {
    expect(c.stdRule).toBeDefined()
  })

  it('drug-list stdRule has pattern matching exactly 24 chars', () => {
    expect(c.stdRule?.pattern).toContain('{24}')
  })

  it('valid 24-char alphanumeric code passes', () => {
    const v = '100000000XXXXXX000000001'  // 24 chars
    expect(validateStdValue(c.stdRule, v)).toEqual({ ok: true })
  })

  it('5-char code fails (too short)', () => {
    const result = validateStdValue(c.stdRule, 'ABCDE')
    expect(result.ok).toBe(false)
    expect(result.message).toBe(c.stdRule!.message)
  })

  it('25-char code fails (too long)', () => {
    const result = validateStdValue(c.stdRule, 'A'.repeat(25))
    expect(result.ok).toBe(false)
  })

  it('empty value bypasses drug-list rule', () => {
    expect(validateStdValue(c.stdRule, '')).toEqual({ ok: true })
  })
})

describe('listCategories — stdRule exposed in meta (F6)', () => {
  it('listCategories includes stdRule for chronic-disease', () => {
    const list = listCategories()
    const entry = list.find(c => c.key === 'chronic-disease')!
    expect(entry.stdRule).toBeDefined()
    expect(entry.stdRule?.message).toBeTruthy()
  })

  it('listCategories includes stdRule for procedure', () => {
    const list = listCategories()
    const entry = list.find(c => c.key === 'procedure')!
    expect(entry.stdRule).toBeDefined()
  })

  it('listCategories includes stdRule for drug-list', () => {
    const list = listCategories()
    const entry = list.find(c => c.key === 'drug-list')!
    expect(entry.stdRule).toBeDefined()
  })

  it('listCategories does NOT include stdRule for occupation (rule-less category)', () => {
    const list = listCategories()
    const entry = list.find(c => c.key === 'occupation')!
    expect(entry.stdRule).toBeUndefined()
  })

  it('listCategories does NOT include stdRule for religion (rule-less category)', () => {
    const list = listCategories()
    const entry = list.find(c => c.key === 'religion')!
    expect(entry.stdRule).toBeUndefined()
  })
})
