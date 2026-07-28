'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Session } from '@/lib/types'
import { suspicionLevel } from '@/lib/types'
import {
  AI_PROBABILITY_DISTRIBUTION,
  FLAG_FREQUENCY,
  QUESTION_TYPE_COMPARISON,
} from '@/lib/mock-data'

const AXIS = '#6b6459'
const GRID = '#ddd6c9'

function tooltipStyle() {
  return {
    contentStyle: {
      background: '#fdfcf9',
      border: '1px solid #ddd6c9',
      borderRadius: 4,
      fontFamily: 'var(--font-inter)',
      fontSize: 12,
      color: '#1c1b19',
    },
    labelStyle: { color: '#1c1b19', fontWeight: 600 },
    cursor: { fill: 'rgba(107,100,89,0.08)' },
  }
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <p className="font-sans text-xs uppercase tracking-wide text-pencil">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-semibold text-ink tabular-nums">
        {value}
      </p>
      <p className="mt-1 font-sans text-xs text-pencil">{sub}</p>
    </div>
  )
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-md border border-border bg-card p-5">
      <h2 className="font-serif text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1 font-sans text-sm text-pencil">{description}</p>
      <div className="mt-4 h-72 w-full">{children}</div>
    </section>
  )
}

export function AnalyticsScreen({ sessions }: { sessions: Session[] }) {
  const totalSessions = 268
  const flaggedShare = Math.round(
    (FLAG_FREQUENCY.reduce((a, b) => a + b.count, 0) / (totalSessions * 2)) * 100,
  )
  const escalations = 21
  const liveFlagged = sessions.filter(
    (s) => suspicionLevel(s.candidate.runningScore) !== 'clear',
  ).length

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6">
      <div className="border-b border-border pb-6">
        <h1 className="font-serif text-2xl font-semibold text-ink">
          Cohort analytics
        </h1>
        <p className="mt-1 font-sans text-sm text-pencil">
          Meridian University · Summer 2026 examination window
        </p>
      </div>

      {/* Stat summary */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sessions analyzed" value={String(totalSessions)} sub="across 12 exams" />
        <StatCard label="Flagged share" value={`${flaggedShare}%`} sub="≥1 linguistic anomaly" />
        <StatCard label="Escalations" value={String(escalations)} sub="sent to committee" />
        <StatCard label="Live flagged now" value={String(liveFlagged)} sub="active sessions" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Flag frequency distribution */}
        <ChartCard
          title="Flag frequency by type"
          description="How often each linguistic signal fired across the cohort."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={FLAG_FREQUENCY}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" stroke={AXIS} tick={{ fontSize: 12, fill: AXIS }} />
              <YAxis
                type="category"
                dataKey="label"
                width={110}
                stroke={AXIS}
                tick={{ fontSize: 12, fill: AXIS }}
              />
              <Tooltip {...tooltipStyle()} />
              <Bar dataKey="count" name="Flags" radius={[0, 3, 3, 0]} fill="var(--chart-1)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* AI-text probability distribution */}
        <ChartCard
          title="AI-text probability distribution"
          description="Distribution of per-candidate AI-generation probability on the essay exam."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={AI_PROBABILITY_DISTRIBUTION}
              margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
            >
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis
                dataKey="bucket"
                stroke={AXIS}
                tick={{ fontSize: 10, fill: AXIS }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={54}
              />
              <YAxis stroke={AXIS} tick={{ fontSize: 12, fill: AXIS }} />
              <Tooltip {...tooltipStyle()} />
              <Bar dataKey="candidates" name="Candidates" radius={[3, 3, 0, 0]}>
                {AI_PROBABILITY_DISTRIBUTION.map((d, i) => {
                  // Tint the high-probability tail with the evidence color.
                  const color =
                    i >= 7 ? 'var(--evidence)' : i >= 4 ? 'var(--flag)' : 'var(--chart-1)'
                  return <Cell key={d.bucket} fill={color} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Comparison across question types */}
        <ChartCard
          title="Suspicion by question type"
          description="Average suspicion score and flag rate compared across question formats."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={QUESTION_TYPE_COMPARISON}
              margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
            >
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis
                dataKey="questionType"
                stroke={AXIS}
                tick={{ fontSize: 11, fill: AXIS }}
                interval={0}
                height={40}
              />
              <YAxis stroke={AXIS} tick={{ fontSize: 12, fill: AXIS }} />
              <Tooltip {...tooltipStyle()} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'var(--font-inter)' }} />
              <Bar dataKey="avgSuspicion" name="Avg. suspicion" radius={[3, 3, 0, 0]} fill="var(--chart-1)" />
              <Bar dataKey="flagRate" name="Flag rate %" radius={[3, 3, 0, 0]} fill="var(--chart-2)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Legend / reading note */}
        <section className="flex flex-col justify-center rounded-md border border-dashed border-border bg-card/60 p-5">
          <h2 className="font-serif text-lg font-semibold text-ink">
            Reading the numbers
          </h2>
          <p className="mt-2 font-sans text-sm leading-relaxed text-pencil">
            Definition and essay questions draw the most flags — short, closed
            prompts are easier to answer with pasted or generated text. High
            AI-probability scores cluster in a small tail of the cohort rather
            than being spread evenly, which is the pattern you would expect from
            a handful of individuals rather than widespread use.
          </p>
          <p className="mt-3 font-sans text-sm leading-relaxed text-pencil">
            Every figure here aggregates linguistic signals only. No webcam,
            biometric, or behavioral surveillance data is collected or shown.
          </p>
        </section>
      </div>
    </main>
  )
}
