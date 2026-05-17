/**
 * F9 — Frontend auth helpers.
 *
 * Token is stored in localStorage under well-known keys.
 * Helpers are pure (accept a storage param) so they are unit-testable without a browser.
 *
 * Side-effect: when a token is stored, we also set the axios default
 * Authorization header so all axios-based API calls carry it automatically.
 * This is done via initAxiosAuth() which is called on app mount.
 */

import axios from 'axios'

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const AUTH_TOKEN_KEY = 'bgs.authToken'
export const AUTH_USER_KEY = 'bgs.authUser'
export const AUTH_ROLE_KEY = 'bgs.authRole'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthState {
  token: string
  u: string
  role: string
}

// ─── Pure storage helpers ─────────────────────────────────────────────────────

/**
 * Read auth state from storage.
 * Returns null when no token is stored.
 */
export function getAuth(
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): AuthState | null {
  const token = storage.getItem(AUTH_TOKEN_KEY)
  const u = storage.getItem(AUTH_USER_KEY)
  const role = storage.getItem(AUTH_ROLE_KEY)
  if (!token || !u || !role) return null
  return { token, u, role }
}

/**
 * Persist auth state to storage and configure axios default header.
 */
export function setAuth(
  state: AuthState,
  storage: Pick<Storage, 'setItem'> = window.localStorage,
): void {
  storage.setItem(AUTH_TOKEN_KEY, state.token)
  storage.setItem(AUTH_USER_KEY, state.u)
  storage.setItem(AUTH_ROLE_KEY, state.role)
  // Set axios default so all subsequent axios calls carry the token.
  axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
}

/**
 * Clear all auth state from storage and remove the axios default header.
 */
export function clearAuth(
  storage: Pick<Storage, 'removeItem'> = window.localStorage,
): void {
  storage.removeItem(AUTH_TOKEN_KEY)
  storage.removeItem(AUTH_USER_KEY)
  storage.removeItem(AUTH_ROLE_KEY)
  delete axios.defaults.headers.common['Authorization']
}

/**
 * On app mount: if a token is already stored, configure axios to use it.
 * Call this once in App.tsx before rendering.
 */
export function initAxiosAuth(
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): void {
  const auth = getAuth(storage)
  if (auth) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${auth.token}`
  }
}
