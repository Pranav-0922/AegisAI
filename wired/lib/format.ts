import type { SuspicionLevel } from './types'
import { suspicionLevel } from './types'

/** Tailwind text-color token for a suspicion level. */
export function levelTextClass(level: SuspicionLevel): string {
  switch (level) {
    case 'high':
      return 'text-evidence'
    case 'flagged':
      return 'text-flag'
    case 'clear':
      return 'text-verified'
  }
}

/** Tailwind background-color token for a suspicion level. */
export function levelBgClass(level: SuspicionLevel): string {
  switch (level) {
    case 'high':
      return 'bg-evidence'
    case 'flagged':
      return 'bg-flag'
    case 'clear':
      return 'bg-verified'
  }
}

export function levelLabel(level: SuspicionLevel): string {
  switch (level) {
    case 'high':
      return 'High suspicion'
    case 'flagged':
      return 'Flagged for review'
    case 'clear':
      return 'Clear'
  }
}

export { suspicionLevel }

/** 0–1 score rendered as an integer 0–100. */
export function scoreOutOf100(score: number): number {
  return Math.round(score * 100)
}

/** Confidence 0–1 rendered as "82%". */
export function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

/** ISO timestamp -> "09:04:12" (24h, UTC-stable for demo). */
export function clockTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  })
}

/** Elapsed time since a start ISO, as "1h 04m" / "12m 30s". */
export function elapsedSince(startIso: string, now: number = Date.now()): string {
  const start = new Date(startIso).getTime()
  const secs = Math.max(0, Math.floor((now - start) / 1000))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(s).padStart(2, '0')}s`
}