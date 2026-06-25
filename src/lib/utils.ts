import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a number as Nigerian Naira. */
export function formatNaira(amount: number | null | undefined): string {
  const value = typeof amount === 'number' ? amount : 0
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Format an ISO date string into a readable form. */
export function formatDate(
  date: string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-NG', opts).format(d)
}

export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Initials for avatars, e.g. "John Doe" -> "JD". */
export function initials(name: string | null | undefined): string {
  if (!name) return 'U'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Short human-friendly reference, e.g. RSU-7F3A2B. */
export function shortRef(prefix = 'RSU'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s_-])(\w)/g, (_, sep, ch) => `${sep === '_' || sep === '-' ? ' ' : sep}${ch.toUpperCase()}`)
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
