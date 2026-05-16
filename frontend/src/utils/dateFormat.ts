export function formatThaiDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd
  const year = parseInt(yyyymmdd.slice(0, 4)) + 543
  const month = yyyymmdd.slice(4, 6)
  const day = yyyymmdd.slice(6, 8)
  return `${day}/${month}/${year}`
}

export function isoToDisplay(isoDate: string): string {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${parseInt(y!) + 543}`
}
