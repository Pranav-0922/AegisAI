import { cn } from '@/lib/utils'
import { levelBgClass, levelLabel, scoreOutOf100, suspicionLevel } from '@/lib/format'

/**
 * Running suspicion score as a horizontal bar. Per the accessibility rule,
 * the score is ALWAYS shown as a number as well as a color.
 */
export function ScoreBar({
  score,
  size = 'md',
  className,
}: {
  score: number // 0-1
  size?: 'sm' | 'md'
  className?: string
}) {
  const level = suspicionLevel(score)
  const value = scoreOutOf100(score)
  const trackH = size === 'sm' ? 'h-1.5' : 'h-2'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'relative flex-1 overflow-hidden rounded-full bg-accent',
          trackH,
        )}
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Suspicion score ${value} of 100, ${levelLabel(level)}`}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-700', levelBgClass(level))}
          style={{ width: `${value}%` }}
        />
      </div>
      <span
        className={cn(
          'font-mono tabular-nums text-ink',
          size === 'sm' ? 'text-xs' : 'text-sm',
        )}
      >
        {value}
      </span>
    </div>
  )
}
