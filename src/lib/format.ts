export function formatRub(n: number | null | undefined): string {
  if (n == null) return '—'
  return '₽' + n.toLocaleString('en-US')
}

export function formatShort(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(n >= 100_000 ? 0 : 1) + 'k'
  return String(n)
}
