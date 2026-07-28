'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Session } from '@/lib/types'
import { EVENT_META, suspicionLevel } from '@/lib/types'
import {
  buildRanges,
  buildSegments,
  spanKey,
  type MarkedRange,
} from '@/lib/annotations'
import {
  clockTime,
  levelLabel,
  levelTextClass,
  pct,
  scoreOutOf100,
} from '@/lib/format'
import { ScoreBar } from './score-bar'
import {
  ArrowLeft,
  FileText,
  Keyboard,
  Mic,
  Quote,
  ShieldCheck,
} from 'lucide-react'

interface Connector {
  eventId: string
  rangeKey: string
  x1: number
  y1: number
  x2: number
  y2: number
  level: MarkedRange['level']
}

function strokeVar(level: MarkedRange['level']): string {
  if (level === 'high') return 'var(--evidence)'
  if (level === 'flagged') return 'var(--flag)'
  return 'var(--verified)'
}

function markClasses(level: MarkedRange['level'], active: boolean): string {
  const base =
    'rounded-[2px] underline decoration-2 underline-offset-[6px] cursor-pointer transition-colors outline-none'
  if (level === 'high')
    return cn(base, 'decoration-evidence', active ? 'bg-evidence/20' : 'bg-evidence/[0.07] hover:bg-evidence/15')
  if (level === 'flagged')
    return cn(base, 'decoration-flag', active ? 'bg-flag/20' : 'bg-flag/[0.07] hover:bg-flag/15')
  return cn(base, 'decoration-verified', active ? 'bg-verified/20' : 'bg-verified/[0.07] hover:bg-verified/15')
}

export function ReviewScreen({
  session,
  connected,
  onBack,
  onOpenReport,
}: {
  session: Session
  connected: boolean
  onBack: () => void
  onOpenReport: (candidateId: string) => void
}) {
  const { candidate, answerText, questionPrompt, events, evidence } = session
  const ranges = buildRanges(evidence)
  const segments = buildSegments(answerText, ranges)
  const hasFlags = evidence.length > 0

  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [connectors, setConnectors] = useState<Connector[]>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const spanRefs = useRef<Map<string, HTMLElement>>(new Map())
  const tagRefs = useRef<Map<string, HTMLElement>>(new Map())

  const recompute = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      setConnectors([])
      return
    }
    const cRect = container.getBoundingClientRect()
    const next: Connector[] = []
    for (const ev of evidence) {
      if (ev.spanStart == null || ev.spanEnd == null) continue
      const key = spanKey(ev.spanStart, ev.spanEnd)
      const spanEl = spanRefs.current.get(key)
      const tagEl = tagRefs.current.get(ev.eventId)
      if (!spanEl || !tagEl) continue
      const rects = spanEl.getClientRects()
      const sr = rects[rects.length - 1] ?? spanEl.getBoundingClientRect()
      const tr = tagEl.getBoundingClientRect()
      next.push({
        eventId: ev.eventId,
        rangeKey: key,
        x1: sr.right - cRect.left,
        y1: sr.top - cRect.top + sr.height / 2,
        x2: tr.left - cRect.left,
        y2: tr.top - cRect.top + tr.height / 2,
        level: suspicionLevel(ev.confidence),
      })
    }
    setConnectors(next)
  }, [evidence])

  useLayoutEffect(() => {
    recompute()
    const container = containerRef.current
    const ro = new ResizeObserver(() => recompute())
    if (container) ro.observe(container)
    window.addEventListener('resize', recompute)
    // Recompute after web fonts settle to avoid stale line anchors.
    const t = setTimeout(recompute, 250)
    if (document.fonts?.ready) document.fonts.ready.then(() => recompute())
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recompute)
      clearTimeout(t)
    }
  }, [recompute])

  function focusSpan(key: string) {
    setActiveKey(key)
    const el = spanRefs.current.get(key)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const level = suspicionLevel(candidate.runningScore)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-1.5 rounded-sm font-sans text-sm text-pencil transition-colors hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Live monitoring
        </button>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-semibold text-ink">
              {candidate.name}
            </h1>
            <p className="mt-1 font-sans text-sm text-pencil">
              {candidate.examId} · {candidate.examTitle}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-40">
              <div className="mb-1 flex items-center justify-between">
                <span className={cn('font-sans text-xs font-medium', levelTextClass(level))}>
                  {levelLabel(level)}
                </span>
                <span className="font-mono text-xs text-pencil">
                  {scoreOutOf100(candidate.runningScore)}/100
                </span>
              </div>
              <ScoreBar score={candidate.runningScore} size="sm" />
            </div>
            <button
              type="button"
              onClick={() => onOpenReport(candidate.id)}
              className="inline-flex items-center gap-2 rounded-sm bg-ink px-3.5 py-2 font-sans text-sm font-medium text-primary-foreground transition-colors hover:bg-ink/90 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Evidence report
            </button>
          </div>
        </div>
      </div>

      {/* Three-panel review */}
      <div
        ref={containerRef}
        className="relative mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[240px_minmax(0,1fr)_300px] lg:gap-8"
      >
        {/* SVG connector overlay (desktop only) */}
        <svg
          className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
          aria-hidden="true"
        >
          {connectors.map((c) => {
            const active = activeKey === c.rangeKey
            const dx = Math.max(30, (c.x2 - c.x1) / 2)
            return (
              <g key={c.eventId}>
                <path
                  d={`M ${c.x1} ${c.y1} C ${c.x1 + dx} ${c.y1}, ${c.x2 - dx} ${c.y2}, ${c.x2} ${c.y2}`}
                  fill="none"
                  stroke={strokeVar(c.level)}
                  strokeWidth={active ? 1.75 : 1}
                  strokeOpacity={active ? 0.9 : 0.4}
                />
                <circle cx={c.x1} cy={c.y1} r={active ? 3 : 2} fill={strokeVar(c.level)} />
              </g>
            )
          })}
        </svg>

        {/* Left rail — timeline */}
        <aside className="lg:col-start-1 lg:row-start-1">
          <div className="lg:sticky lg:top-20">
            <h2 className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wide text-pencil">
              Session timeline
            </h2>
            {sortedEvents.length === 0 ? (
              <p className="mt-3 font-sans text-sm leading-relaxed text-pencil">
                No events recorded.
              </p>
            ) : (
              <ol className="mt-3 flex flex-col gap-1 border-l border-border pl-3">
                {sortedEvents.map((ev) => {
                  const meta = EVENT_META[ev.eventType]
                  const key =
                    ev.spanStart != null && ev.spanEnd != null
                      ? spanKey(ev.spanStart, ev.spanEnd)
                      : null
                  const evLevel = suspicionLevel(ev.confidence)
                  const clickable = key != null
                  return (
                    <li key={ev.id}>
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => key && focusSpan(key)}
                        className={cn(
                          'group -ml-3 flex w-full flex-col gap-0.5 rounded-sm border-l-2 py-1.5 pl-2.5 pr-1 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          clickable ? 'cursor-pointer hover:bg-accent/60' : 'cursor-default',
                          key && activeKey === key
                            ? 'border-l-ink bg-accent/60'
                            : 'border-l-transparent',
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs tabular-nums text-pencil">
                            {clockTime(ev.timestamp)}
                          </span>
                          {ev.sourceModality === 'transcribed' ? (
                            <Mic className="h-3 w-3 text-pencil" aria-label="Transcribed audio" />
                          ) : (
                            <Keyboard className="h-3 w-3 text-pencil" aria-label="Typed" />
                          )}
                        </span>
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="font-sans text-sm text-ink">{meta.label}</span>
                          <span className={cn('font-mono text-xs tabular-nums', levelTextClass(evLevel))}>
                            {pct(ev.confidence)}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </aside>

        {/* Center — the answer under examination */}
        <section className="lg:col-start-2 lg:row-start-1" aria-label="Candidate answer">
          <div className="rounded-md border border-border bg-card">
            <div className="border-b border-border px-5 py-3">
              <p className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wide text-pencil">
                <Quote className="h-3.5 w-3.5" aria-hidden="true" />
                Prompt
              </p>
              <p className="mt-1 font-serif text-base leading-relaxed text-ink">
                {questionPrompt}
              </p>
            </div>
            <div className="px-5 py-6 sm:px-7">
              <p className="mb-4 font-sans text-xs uppercase tracking-wide text-pencil">
                Candidate response · exhibit
              </p>
              <div className="whitespace-pre-wrap font-mono text-[15px] leading-[2] text-ink">
                {segments.map((seg, i) => {
                  if (!seg.range) return <span key={i}>{seg.text}</span>
                  const r = seg.range
                  const active = activeKey === r.key
                  return (
                    <mark
                      key={i}
                      id={`span-${r.key}`}
                      ref={(el) => {
                        if (el) spanRefs.current.set(r.key, el)
                        else spanRefs.current.delete(r.key)
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={active}
                      onClick={() => setActiveKey(active ? null : r.key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setActiveKey(active ? null : r.key)
                        }
                      }}
                      className={cn(
                        'bg-transparent text-ink focus-visible:ring-2 focus-visible:ring-ring',
                        markClasses(r.level, active),
                      )}
                    >
                      {seg.text}
                    </mark>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Right margin — evidence tags */}
        <aside className="lg:col-start-3 lg:row-start-1" aria-label="Evidence annotations">
          <div className="lg:sticky lg:top-20">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-wide text-pencil">
              Margin annotations
            </h2>

            {!hasFlags ? (
              <div className="mt-3 flex flex-col items-start gap-3 rounded-md border border-dashed border-verified/40 bg-verified/[0.04] p-4">
                <ShieldCheck className="h-5 w-5 text-verified" aria-hidden="true" />
                <p className="font-serif text-base leading-relaxed text-ink">
                  No linguistic anomalies detected in this session.
                </p>
                <p className="font-sans text-sm leading-relaxed text-pencil">
                  Style, vocabulary, and register stayed consistent throughout the
                  response.
                </p>
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {evidence.map((ev) => {
                  const meta = EVENT_META[ev.eventType]
                  const key =
                    ev.spanStart != null && ev.spanEnd != null
                      ? spanKey(ev.spanStart, ev.spanEnd)
                      : ''
                  const evLevel = suspicionLevel(ev.confidence)
                  const active = activeKey === key
                  return (
                    <button
                      key={ev.eventId}
                      type="button"
                      ref={(el) => {
                        if (el) tagRefs.current.set(ev.eventId, el)
                        else tagRefs.current.delete(ev.eventId)
                      }}
                      onClick={() => key && focusSpan(key)}
                      className={cn(
                        'flex flex-col gap-1.5 rounded-sm border border-l-2 bg-card p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                        active ? 'border-ink/30 bg-accent/50' : 'border-border hover:bg-accent/40',
                      )}
                      style={{ borderLeftColor: strokeVar(evLevel) }}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className={cn('font-mono text-sm lowercase', levelTextClass(evLevel))}>
                          {meta.short} · {pct(ev.confidence)}
                        </span>
                        {ev.sourceModality === 'transcribed' ? (
                          <Mic className="h-3.5 w-3.5 text-pencil" aria-label="Transcribed audio" />
                        ) : (
                          <Keyboard className="h-3.5 w-3.5 text-pencil" aria-label="Typed" />
                        )}
                      </span>
                      <span className="font-sans text-xs italic leading-relaxed text-pencil">
                        {ev.reason}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      <p className="mt-6 text-center font-mono text-xs text-pencil/70">
        {connected ? 'live feed connected · ' : ''}
        reading interface · click any highlight or annotation to link them
      </p>
    </main>
  )
}
