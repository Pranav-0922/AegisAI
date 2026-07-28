import { cn } from '@/lib/utils'
import { EVENT_META, type EventType } from '@/lib/types'
import { pct } from '@/lib/format'

/** Maps a confidence value to a suspicion tone for tag coloring. */
function toneClass(confidence: number): string {
  if (confidence >= 0.66) return 'border-evidence/40 text-evidence'
  if (confidence >= 0.33) return 'border-flag/40 text-flag'
  return 'border-verified/40 text-verified'
}

/**
 * A small annotation tag: event type + confidence. Used inline in the review
 * margin and in timelines. Confidence is always a number, never color alone.
 */
export function EventBadge({
  eventType,
  confidence,
  modality,
  className,
}: {
  eventType: EventType
  confidence: number
  modality?: 'typed' | 'transcribed'
  className?: string
}) {
  const meta = EVENT_META[eventType]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border bg-card px-2 py-0.5 font-sans text-xs',
        toneClass(confidence),
        className,
      )}
    >
      <span className="font-medium lowercase">{meta.short}</span>
      <span aria-hidden="true" className="text-pencil/50">
        ·
      </span>
      <span className="font-mono tabular-nums">{pct(confidence)}</span>
      {modality === 'transcribed' && (
        <span
          className="ml-0.5 rounded-[2px] bg-accent px-1 text-[10px] uppercase tracking-wide text-pencil"
          title="Source: transcribed audio"
        >
          audio
        </span>
      )}
    </span>
  )
}
