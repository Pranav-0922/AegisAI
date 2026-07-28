'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@/lib/types'
import {
  connectDashboardSocket,
  fetchActiveCandidates,
  fetchFullSession,
  type DashboardMessage,
} from '@/lib/api'

/**
 * useSessions -- now backed by the real AegisAI backend.
 *
 * On mount: fetches the active candidate list, then fetches a full Session
 * bundle (answers + events + report) for each. Then opens a WebSocket to
 * /dashboard/live and merges incoming new_event / score_update messages
 * into the matching session as they arrive.
 *
 * Return shape is UNCHANGED from the mock version -- dashboard-screen.tsx,
 * review-screen.tsx etc. all keep working with no edits.
 */
export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [connected, setConnected] = useState(false)
  const [lastTick, setLastTick] = useState<number>(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      const candidates = await fetchActiveCandidates()
      const full = await Promise.all(candidates.map(fetchFullSession))
      setSessions(full)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    const disconnect = connectDashboardSocket(
      (msg: DashboardMessage) => {
        setSessions((prev) => {
          const idx = prev.findIndex((s) => s.candidate.id === msg.candidate_id)
          // Message for a candidate we haven't loaded yet (e.g. a session
          // that started after initial load) -- just refetch the full list.
          if (idx === -1) {
            loadAll()
            return prev
          }

          const next = [...prev]
          const target = { ...next[idx], candidate: { ...next[idx].candidate } }

          if (msg.type === 'new_event') {
            target.events = [
              ...target.events,
              {
                id: msg.event.id,
                candidateId: msg.event.candidate_id,
                eventType: msg.event.event_type,
                sourceModality: msg.event.source_modality,
                confidence: msg.event.confidence,
                spanStart: msg.event.span_start,
                spanEnd: msg.event.span_end,
                timestamp: msg.event.timestamp,
              },
            ]
          }

          if (msg.type === 'score_update') {
            target.candidate.runningScore = msg.score.running_score
          }

          next[idx] = target
          return next
        })
        setLastTick(Date.now())
      },
      () => setConnected(true),
      () => setConnected(false),
    )
    return disconnect
  }, [loadAll])

  return { sessions, connected, lastTick, loading, error, refetch: loadAll }
}

/** Convenience selector for a single session by candidate id. */
export function useSession(candidateId: string | null) {
  const { sessions, connected, lastTick, loading, error } = useSessions()
  const session = sessions.find((s) => s.candidate.id === candidateId) ?? null
  return { session, connected, lastTick, loading, error }
}
