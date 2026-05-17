/**
 * Unit tests for theme.ts pure logic — written BEFORE implementation (RED→GREEN TDD).
 */
import { THEMES, DEFAULT_THEME, isValidTheme, getStoredTheme, storeTheme } from '../src/theme/theme'

describe('THEMES constant', () => {
  it('has exactly 4 entries', () => {
    expect(THEMES).toHaveLength(4)
  })

  it('contains blue, teal, indigo, slate ids', () => {
    const ids = THEMES.map(t => t.id)
    expect(ids).toContain('blue')
    expect(ids).toContain('teal')
    expect(ids).toContain('indigo')
    expect(ids).toContain('slate')
  })

  it('all ids are unique', () => {
    const ids = THEMES.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('DEFAULT_THEME is blue and present in THEMES', () => {
    expect(DEFAULT_THEME).toBe('blue')
    expect(THEMES.some(t => t.id === DEFAULT_THEME)).toBe(true)
  })
})

describe('isValidTheme', () => {
  it('returns true for each valid theme id', () => {
    for (const t of THEMES) {
      expect(isValidTheme(t.id)).toBe(true)
    }
  })

  it('returns false for null', () => {
    expect(isValidTheme(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isValidTheme(undefined)).toBe(false)
  })

  it('returns false for an unknown string', () => {
    expect(isValidTheme('purple')).toBe(false)
    expect(isValidTheme('')).toBe(false)
    expect(isValidTheme('BLUE')).toBe(false)
  })
})

describe('getStoredTheme', () => {
  it('returns stored value when it is a valid theme', () => {
    const store = { getItem: () => 'teal' }
    expect(getStoredTheme(store)).toBe('teal')
  })

  it('returns DEFAULT_THEME when stored value is null', () => {
    const store = { getItem: () => null }
    expect(getStoredTheme(store)).toBe(DEFAULT_THEME)
  })

  it('returns DEFAULT_THEME when stored value is unknown', () => {
    const store = { getItem: () => 'neon-pink' }
    expect(getStoredTheme(store)).toBe(DEFAULT_THEME)
  })

  it('returns DEFAULT_THEME when stored value is empty string', () => {
    const store = { getItem: () => '' }
    expect(getStoredTheme(store)).toBe(DEFAULT_THEME)
  })

  it('returns stored value for indigo', () => {
    const store = { getItem: () => 'indigo' }
    expect(getStoredTheme(store)).toBe('indigo')
  })

  it('returns stored value for slate', () => {
    const store = { getItem: () => 'slate' }
    expect(getStoredTheme(store)).toBe('slate')
  })

  it('returns stored value for blue', () => {
    const store = { getItem: () => 'blue' }
    expect(getStoredTheme(store)).toBe('blue')
  })
})

describe('storeTheme', () => {
  it('calls setItem for a valid theme id', () => {
    const calls: Array<[string, string]> = []
    const store = { setItem: (k: string, v: string) => calls.push([k, v]) }
    storeTheme(store, 'teal')
    expect(calls).toHaveLength(1)
    expect(calls[0][1]).toBe('teal')
  })

  it('does NOT call setItem for an invalid theme id', () => {
    const calls: Array<[string, string]> = []
    const store = { setItem: (k: string, v: string) => calls.push([k, v]) }
    storeTheme(store, 'neon-pink')
    expect(calls).toHaveLength(0)
  })

  it('does NOT call setItem for an empty string', () => {
    const calls: Array<[string, string]> = []
    const store = { setItem: (k: string, v: string) => calls.push([k, v]) }
    storeTheme(store, '')
    expect(calls).toHaveLength(0)
  })

  it('calls setItem for each valid theme', () => {
    for (const t of THEMES) {
      const calls: Array<[string, string]> = []
      const store = { setItem: (k: string, v: string) => calls.push([k, v]) }
      storeTheme(store, t.id)
      expect(calls).toHaveLength(1)
      expect(calls[0][1]).toBe(t.id)
    }
  })

  it('stores under the correct key bgs.theme', () => {
    const calls: Array<[string, string]> = []
    const store = { setItem: (k: string, v: string) => calls.push([k, v]) }
    storeTheme(store, 'indigo')
    expect(calls[0][0]).toBe('bgs.theme')
  })
})
