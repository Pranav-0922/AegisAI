'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Session } from '@/lib/types'
import { EVENT_META, suspicionLevel } from '@/lib/types'
import {
  levelLabel,
  levelTextClass,
  pct,
  scoreOutOf100,
} from '@/lib/format'
import { ScoreBar } from './score-bar'
import {
  ArrowLeft,
  Check,
  CircleAlert,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react'

type Action = 'reviewed' | 'escalated' | 'dismissed'

export function ReportScreen({
  session,
  examiner,
  onBack,
  onDone,
}: {
  session: Session
  examiner: string
  onBack: () => void
  onDone: () => void
}) {
  const { candidate, report } = session
  const [action, setAction] = useState<Action | null>(
    report.reviewedBy ? 'reviewed' : null,
  )
  const level = suspicionLevel(report.finalScore)

  const actions: {
    key: Action
    label: string
    icon: typeof Check
    className: string
  }[] = [
    {
      key: 'reviewed',
      label: 'Mark reviewed',
      icon: Check,
      className: 'border-verified text-verified hover:bg-verified/10',
    },
    {
      key: 'escalated',
      label: 'Escalate',
      icon: TriangleAlert,
      className: 'border-evidence text-evidence hover:bg-evidence/10',
    },
    {
      key: 'dismissed',
      label: 'Dismiss',
      icon: X,
      className: 'border-border text-pencil hover:bg-accent',
    },
  ]

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-sm font-sans text-sm text-pencil transition-colors hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to review
      </button>

      {/* Masthead */}
      <header className="mt-5 border-b-2 border-ink pb-5">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-pencil">
          Evidence report · Academic Integrity Office
        </p>
        <h1 className="mt-2 text-balance font-serif text-3xl font-semibold leading-tight text-ink">
          {candidate.name}
        </h1>
        <p className="mt-1 font-sans text-sm text-pencil">
          {candidate.examId} · {candidate.examTitle}
        </p>
      </header>

      {/* Final score */}
      <section className="mt-6 flex flex-col gap-4 rounded-md border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-sans text-xs uppercase tracking-wide text-pencil">
            Final suspicion score
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-serif text-4xl font-semibold text-ink tabular-nums">
              {scoreOutOf100(report.finalScore)}
            </span>
            <span className="font-mono text-sm text-pencil">/ 100</span>
          </p>
          <p className={cn('mt-1 font-sans text-sm font-medium', levelTextClass(level))}>
            {levelLabel(level)}
          </p>
        </div>
        <div className="w-full sm:w-56">
          <ScoreBar score={report.finalScore} />
          <p className="mt-2 font-sans text-xs text-pencil">
            {report.evidence.length} flagged{' '}
            {report.evidence.length === 1 ? 'passage' : 'passages'}
          </p>
        </div>
      </section>

      {/* Summary */}
      <section className="mt-6">
        <h2 className="font-serif text-lg font-semibold text-ink">
          Examiner summary
        </h2>
        <p className="mt-2 text-pretty font-sans text-[15px] leading-relaxed text-ink/90">
          {report.summaryText}
        </p>
      </section>

      {/* Flagged passages */}
      <section className="mt-6">
        <h2 className="font-serif text-lg font-semibold text-ink">
          Flagged passages
        </h2>

        {report.evidence.length === 0 ? (
          <div className="mt-3 flex items-start gap-3 rounded-md border border-dashed border-verified/40 bg-verified/[0.04] p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-verified" aria-hidden="true" />
            <p className="font-sans text-sm leading-relaxed text-ink">
              No linguistic anomalies detected in this session. Nothing requires
              examiner action.
            </p>
          </div>
        ) : (
          <ol className="mt-3 flex flex-col gap-4">
            {report.evidence.map((ev, i) => {
              const meta = EVENT_META[ev.eventType]
              const evLevel = suspicionLevel(ev.confidence)
              return (
                <li
                  key={ev.eventId}
                  className="rounded-md border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs text-pencil">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="font-sans text-sm font-medium text-ink">
                        {meta.label}
                      </span>
                    </span>
                    <span className={cn('font-mono text-sm tabular-nums', levelTextClass(evLevel))}>
                      {pct(ev.confidence)} confidence
                    </span>
                  </div>

                  <blockquote
                    className="mt-3 border-l-2 py-1 pl-3 font-mono text-sm leading-relaxed text-ink/90"
                    style={{
                      borderLeftColor:
                        evLevel === 'high'
                          ? 'var(--evidence)'
                          : evLevel === 'flagged'
                            ? 'var(--flag)'
                            : 'var(--verified)',
                    }}
                  >
                    “{ev.textExcerpt}”
                  </blockquote>

                  <p className="mt-3 flex gap-2 font-sans text-sm leading-relaxed text-pencil">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{ev.reason}</span>
                  </p>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {/* Examiner action row */}
      <section className="mt-8 rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-lg font-semibold text-ink">
          Examiner decision
        </h2>
        <p className="mt-1 font-sans text-sm text-pencil">
          Your judgment is recorded on the session. AegisAI surfaces evidence; the
          call is yours.
        </p>

        <div
          className="mt-4 flex flex-wrap gap-3"
          role="group"
          aria-label="Examiner decision"
        >
          {actions.map(({ key, label, icon: Icon, className }) => {
            const selected = action === key
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                onClick={() => setAction(key)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-sm border px-4 py-2 font-sans text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                  className,
                  selected && 'ring-2 ring-ring ring-offset-2 ring-offset-card',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </div>

        {action && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-sm bg-accent/60 px-4 py-3">
            <p className="font-sans text-sm text-ink" aria-live="polite">
              Marked{' '}
              <span className="font-medium">
                {action === 'reviewed'
                  ? 'reviewed'
                  : action === 'escalated'
                    ? 'escalated to the integrity committee'
                    : 'dismissed'}
              </span>{' '}
              by {examiner}.
            </p>
            <button
              type="button"
              onClick={onDone}
              className="inline-flex items-center gap-1.5 rounded-sm bg-ink px-3.5 py-1.5 font-sans text-sm font-medium text-primary-foreground transition-colors hover:bg-ink/90 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-accent"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Done
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
