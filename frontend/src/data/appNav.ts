/**
 * Lightweight module-level pub/sub navigation bus.
 * Used by ValidatePage to request navigation to a config category,
 * and by App.tsx to respond and switch the active page + pre-select a category.
 */

export interface NavRequest {
  menu: string
  categoryKey?: string
}

type Cb = (r: NavRequest) => void

const subs = new Set<Cb>()

export function requestNavigate(r: NavRequest): void {
  subs.forEach(cb => cb(r))
}

export function onNavigate(cb: Cb): () => void {
  subs.add(cb)
  return () => {
    subs.delete(cb)
  }
}
