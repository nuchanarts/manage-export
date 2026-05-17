/** Key used to persist the client id in localStorage. */
export const CLIENT_ID_KEY = 'bgs.clientId'

/**
 * Return the persistent client id from the given storage, creating a fresh
 * one if none exists yet.  The id is opaque to the backend — it is only used
 * for presence counting.
 *
 * A minimal storage interface is accepted so the function is unit-testable
 * without a real browser.
 */
export function getOrCreateClientId(storage: Pick<Storage, 'getItem' | 'setItem'>): string {
  const existing = storage.getItem(CLIENT_ID_KEY)
  if (existing) return existing

  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  storage.setItem(CLIENT_ID_KEY, id)
  return id
}
