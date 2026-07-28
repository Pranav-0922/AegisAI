'use client'

import { useEffect, useRef, useState } from 'react'
import { SESSIONS } from '@/lib/mock-data'
import type { EventType, Session } from '@/lib/types'

/**
 * useSessions
 *
 * Single source of truth for the examiner console. Today it serves hardcoded
 * mock sessions and simulates a push-based feed by nudging running scores and
 * appending events on an interval.
 *
 * To go live, replace the body of this hook with a WebSocket subscription to
 * `/dashboard/live`: seed state from the initial snapshot, then apply each
 * pushed message to the matching session. The returned shape stays identical,
 * so every consumer keeps working unchanged.
 */

const LIVE_EVENT_TYPES: EventType[] = [
  'style_deviation',
  'semantic_match',
  'ai_text_probability',
  'coaching_phrase',
]

function clone(sessions: Session[]): Session[] {
  return sessions.map((s) => ({
    ...s,
    candidate: { ...s.candidate },
    events: [...s.events],
    evidence: [...s.evidence],
    report: { ...s.report, evidence: [...s.report.evidence] },
  }))
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>(() => clone(SESSIONS))
  const [connected, setConnected] = useState(false)
  const [lastTick, setLastTick] = useState<number>(() => Date.now())
  const tickRef = useRef(0)

  useEffect(() => {
    // Simulate connection handshake.
    const connectTimer = setTimeout(() => setConnected(true), 600)

    const interval = setInterval(() => {
      tickRef.current += 1
      setSessions((prev) => {
        const next = clone(prev)
        // Nudge the two active (non-final) sessions; leave the cleared one.
        for (const s of next) {
          if (s.report.reviewedBy) continue
          const drift = (Math.random() - 0.35) * 0.04
          const target = Math.min(1, Math.max(0, s.candidate.runningScore + drift))
          s.candidate.runningScore = Number(target.toFixed(3))
        }

        // Occasionally push a new event onto the highest-scoring active session.
        if (tickRef.current % 3 === 0) {
          const active = next
            .filter((s) => !s.report.reviewedBy)
            .sort((a, b) => b.candidate.runningScore - a.candidate.runningScore)[0]
          if (active) {
            const type =
              LIVE_EVENT_TYPES[Math.floor(Math.random() * LIVE_EVENT_TYPES.length)]
            active.events = [
              ...active.events,
              {
                id: `evt-live-${active.candidate.id}-${tickRef.current}`,
                candidateId: active.candidate.id,
                eventType: type,
                sourceModality: Math.random() > 0.7 ? 'transcribed' : 'typed',
                confidence: Number((0.4 + Math.random() * 0.5).toFixed(2)),
                spanStart: null,
                spanEnd: null,
                timestamp: new Date().toISOString(),
              },
            ]
          }
        }
        return next
      })
      setLastTick(Date.now())
    }, 3500)

    return () => {
      clearTimeout(connectTimer)
      clearInterval(interval)
    }
  }, [])

  return { sessions, connected, lastTick }
}

/** Convenience selector for a single session by candidate id. */
export function useSession(candidateId: string | null) {
  const { sessions, connected, lastTick } = useSessions()
  const session = sessions.find((s) => s.candidate.id === candidateId) ?? null
  return { session, connected, lastTick }
}
