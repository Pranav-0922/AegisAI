import { cn } from '@/lib/utils'

/**
 * AegisAI wordmark. A small "underline marking a word" glyph reinforces the
 * premise that language itself is the evidence.
 */
export function Logo({
  className,
  showText = true,
}: {
  className?: string
  showText?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* three "lines of text", the middle one annotated/underlined */}
        <line x1="4" y1="6" x2="20" y2="6" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="4" y1="12" x2="15" y2="12" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="4" y1="18" x2="18" y2="18" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M4 14.4 Q 9.5 16.2 15 14.4"
          stroke="var(--flag)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {showText && (
        <span className="font-serif text-lg font-semibold tracking-tight text-ink">
          Aegis<span className="text-flag">AI</span>
        </span>
      )}
    </span>
  )
}
