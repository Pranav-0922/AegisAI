'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Session } from '@/lib/types'
import { EVENT_META, suspicionLevel } from '@/lib/types'
import {
  clockTime,
  elapsedSince,
  levelLabel,
  levelTextClass,
} from '@/lib/format'
import { ScoreBar } from './score-bar'
import { ChevronRight, Keyboard, Mic } from 'lucide-react'

export function DashboardScreen({
  sessions,
  connected,
  lastTick,
  onOpen,
}: {
  sessions: Session[]
  connected: boolean
  lastTick: number
  onOpen: (candidateId: string) => void
}) {
  // Local 1s clock so elapsed times count smoothly between feed ticks.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const active = sessions.filter((s) => !s.report.reviewedBy)
  const flaggedCount = sessions.filter(
    (s) => suspicionLevel(s.candidate.runningScore) !== 'clear',
  ).length

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1 border-b border-border pb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-ink">
              Live monitoring
            </h1>
            <p className="mt-1 font-sans text-sm text-pencil">
              {active.length} active sessions · {flaggedCount} showing linguistic
              anomalies
            </p>
          </div>
          <p
            className="font-mono text-xs text-pencil"
            aria-live="polite"
          >
            {connected
              ? `feed updated ${clockTime(new Date(lastTick).toISOString())}`
              : 'connecting to /dashboard/live…'}
          </p>
        </div>
      </div>

      <ul
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="Active candidate sessions"
      >
        {sessions.map((s) => {
          const level = suspicionLevel(s.candidate.runningScore)
          const lastEvent = s.events[s.events.length - 1]
          const lastMeta = lastEvent ? EVENT_META[lastEvent.eventType] : null
          return (
            <li key={s.candidate.id}>
              <button
                type="button"
                onClick={() => onOpen(s.candidate.id)}
                className="group flex w-full flex-col gap-4 rounded-md border border-border bg-card p-5 text-left transition-colors hover:border-ink/30 hover:bg-card/80 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-serif text-lg font-medium text-ink">
                      {s.candidate.name}
                    </h2>
                    <p className="mt-0.5 font-sans text-xs text-pencil">
                      {s.candidate.examId} · {s.candidate.examTitle}
                    </p>
                  </div>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-pencil/50 transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span
                      className={cn(
                        'font-sans text-xs font-medium',
                        levelTextClass(level),
                      )}
                    >
                      {levelLabel(level)}
                    </span>
                    {s.report.reviewedBy && (
                      <span className="font-sans text-xs text-pencil">
                        reviewed
                      </span>
                    )}
                  </div>
                  <ScoreBar score={s.candidate.runningScore} />
                </div>

                <div className="flex items-center justify-between border-t border-border/70 pt-3 font-sans text-xs text-pencil">
                  <span className="tabular-nums">
                    {elapsedSince(s.candidate.sessionStart, now)} elapsed
                  </span>
                  <span className="flex items-center gap-1.5">
                    {lastEvent ? (
                      <>
                        {lastEvent.sourceModality === 'transcribed' ? (
                          <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span className="truncate">{lastMeta?.label}</span>
                      </>
                    ) : (
                      <span className="text-verified">no flags</span>
                    )}
                  </span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
