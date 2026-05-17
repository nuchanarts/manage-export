// frontend/tests/clientId.test.ts
// TDD: written to verify getOrCreateClientId pure logic.
import { getOrCreateClientId, CLIENT_ID_KEY } from '../src/utils/clientId'

function makeStorage(initial: Record<string, string> = {}): Pick<Storage, 'getItem' | 'setItem'> {
  const store: Record<string, string> = { ...initial }
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
  }
}

describe('getOrCreateClientId', () => {
  it('returns the stored id when one already exists', () => {
    const storage = makeStorage({ [CLIENT_ID_KEY]: 'existing-id-abc' })
    expect(getOrCreateClientId(storage)).toBe('existing-id-abc')
  })

  it('creates and persists a new id when none exists', () => {
    const storage = makeStorage()
    const id = getOrCreateClientId(storage)
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
    // Persisted under the correct key
    expect(storage.getItem(CLIENT_ID_KEY)).toBe(id)
  })

  it('returns the same id on subsequent calls (persisted)', () => {
    const storage = makeStorage()
    const first = getOrCreateClientId(storage)
    const second = getOrCreateClientId(storage)
    expect(first).toBe(second)
  })

  it('generates distinct ids for independent storages', () => {
    const s1 = makeStorage()
    const s2 = makeStorage()
    // Both empty → each creates a new id
    const id1 = getOrCreateClientId(s1)
    const id2 = getOrCreateClientId(s2)
    // The probability of collision is astronomically small (UUID v4 or timestamp+random)
    expect(id1).not.toBe(id2)
  })

  it('does not overwrite an existing id', () => {
    const storage = makeStorage({ [CLIENT_ID_KEY]: 'keep-me' })
    getOrCreateClientId(storage)
    getOrCreateClientId(storage)
    expect(storage.getItem(CLIENT_ID_KEY)).toBe('keep-me')
  })
})
