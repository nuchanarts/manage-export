export interface ThemePreset { id: string; label: string }

export const THEMES: ThemePreset[] = [
  { id: 'blue',   label: 'น้ำเงิน (ค่าเริ่มต้น)' },
  { id: 'teal',   label: 'เขียวมรกต' },
  { id: 'indigo', label: 'คราม' },
  { id: 'slate',  label: 'เทาเข้ม' },
]

export const DEFAULT_THEME = 'blue'

const KEY = 'bgs.theme'

export function isValidTheme(id: string | null | undefined): boolean {
  return !!id && THEMES.some(t => t.id === id)
}

/** Returns stored theme if valid, else DEFAULT_THEME. */
export function getStoredTheme(store: Pick<Storage, 'getItem'>): string {
  const v = store.getItem(KEY)
  return isValidTheme(v) ? (v as string) : DEFAULT_THEME
}

export function storeTheme(store: Pick<Storage, 'setItem'>, id: string): void {
  if (isValidTheme(id)) store.setItem(KEY, id)
}
