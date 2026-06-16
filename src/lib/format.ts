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

// Craft durations come from the API in seconds. Render as "1d 9h" / "17m".
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—'
  const totalMinutes = Math.round(seconds / 60)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (minutes && !days) parts.push(`${minutes}m`)
  return parts.join(' ') || '0m'
}
