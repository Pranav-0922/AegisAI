/**
 * All real calls to the AegisAI backend live here. This is the ONLY file
 * that should know the backend's actual URL/shape -- everything else
 * (hooks, components) talks to lib/types.ts shapes and doesn't care
 * whether the data came from here or from mock-data.ts.
 */
import type {
  Candidate,
  EvidenceItem,
  LinguisticEvent,
  Report,
  Session,
} from './types'

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'

export const WS_BASE =
  process.env.NEXT_PUBLIC_WS_BASE ?? 'ws://localhost:8000'

// ---- Backend response shapes (snake_case, as FastAPI sends them) ----

interface ActiveSessionOut {
  candidate_id: string
  name: string
  exam_id: string
  exam_title: string
  session_start: string
  running_score: number
}

interface AnswerSegmentOut {
  id: string
  question_id: string | null
  text_content: string
  source: 'typed' | 'transcribed'
  timestamp: string
}

interface EventOut {
  id: string
  candidate_id: string
  event_type: LinguisticEvent['eventType']
  source_modality: LinguisticEvent['sourceModality']
  confidence: number
  span_start: number | null
  span_end: number | null
  timestamp: string
}

interface ReportOut {
  candidate_id: string
  final_score: number
  evidence: Array<{
    event_id: string
    event_type: EvidenceItem['eventType']
    confidence: number
    span_start: number | null
    span_end: number | null
    text_excerpt: string | null
    reason: string | null
    source_modality?: LinguisticEvent['sourceModality']
  }>
  summary_text: string | null
  reviewed_by: string | null
  created_at: string
}

// ---- Mappers: backend snake_case -> frontend camelCase types ----

function mapEvent(e: EventOut): LinguisticEvent {
  return {
    id: e.id,
    candidateId: e.candidate_id,
    eventType: e.event_type,
    sourceModality: e.source_modality,
    confidence: e.confidence,
    spanStart: e.span_start,
    spanEnd: e.span_end,
    timestamp: e.timestamp,
  }
}

function mapReport(r: ReportOut): Report {
  return {
    candidateId: r.candidate_id,
    finalScore: r.final_score,
    evidence: r.evidence.map((ev) => ({
      eventId: ev.event_id,
      eventType: ev.event_type,
      confidence: ev.confidence,
      spanStart: ev.span_start,
      spanEnd: ev.span_end,
      textExcerpt: ev.text_excerpt ?? '',
      reason: ev.reason ?? '',
      sourceModality: ev.source_modality ?? 'typed',
    })),
    summaryText: r.summary_text ?? '',
    reviewedBy: r.reviewed_by,
  }
}

// ---- Fetch helpers ----

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json()
}

/** Fetches the list of active candidates for the Live Monitoring grid. */
export async function fetchActiveCandidates(): Promise<Candidate[]> {
  const rows = await getJson<ActiveSessionOut[]>('/session/active')
  return rows.map((r) => ({
    id: r.candidate_id,
    name: r.name,
    examId: r.exam_id,
    examTitle: r.exam_title,
    sessionStart: r.session_start,
    runningScore: r.running_score,
  }))
}

/**
 * Fetches everything needed to build a full Session object for the review
 * screen: answers, events, and the report (if one exists yet -- a 404 here
 * just means the threshold hasn't been crossed, which is normal).
 */
export async function fetchFullSession(candidate: Candidate): Promise<Session> {
  const [answers, events] = await Promise.all([
    getJson<AnswerSegmentOut[]>(`/session/${candidate.id}/answers`),
    getJson<EventOut[]>(`/session/${candidate.id}/events`),
  ])

  let report: Report | null = null
  try {
    const raw = await getJson<ReportOut>(`/session/${candidate.id}/report`)
    report = mapReport(raw)
  } catch {
    // No report yet -- threshold not crossed. Not an error.
  }

  return {
    candidate,
    answerText: answers.map((a) => a.text_content).join('\n\n'),
    questionPrompt: answers[0]?.question_id ?? 'No question recorded yet.',
    events: events.map(mapEvent),
    evidence: report?.evidence ?? [],
    report: report ?? {
      candidateId: candidate.id,
      finalScore: candidate.runningScore,
      evidence: [],
      summaryText: 'No anomalies have crossed the review threshold yet.',
      reviewedBy: null,
    },
  }
}

// ---- Live WebSocket connection ----

export type DashboardMessage =
  | { candidate_id: string; type: 'new_event'; event: EventOut }
  | {
      candidate_id: string
      type: 'score_update'
      score: { candidate_id: string; running_score: number; window_start: string; window_end: string }
    }

export function connectDashboardSocket(
  onMessage: (msg: DashboardMessage) => void,
  onOpen?: () => void,
  onClose?: () => void,
): () => void {
  const ws = new WebSocket(`${WS_BASE}/dashboard/live`)

  ws.onopen = () => onOpen?.()
  ws.onclose = () => onClose?.()
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as DashboardMessage
      onMessage(data)
    } catch {
      // ignore malformed frames
    }
  }

  // Return a cleanup function for useEffect.
  return () => ws.close()
}

export { mapEvent }
