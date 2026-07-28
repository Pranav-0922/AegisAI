export type EventType =
  | 'ai_text_probability'
  | 'semantic_match'
  | 'style_deviation'
  | 'multi_speaker'
  | 'coaching_phrase'

export type SourceModality = 'typed' | 'transcribed'

export interface Candidate {
  id: string
  name: string
  examId: string
  examTitle: string
  sessionStart: string
  runningScore: number // 0-1
}

export interface LinguisticEvent {
  id: string
  candidateId: string
  eventType: EventType
  sourceModality: SourceModality
  confidence: number // 0-1
  spanStart: number | null
  spanEnd: number | null
  timestamp: string
}

export interface EvidenceItem {
  eventId: string
  eventType: EventType
  sourceModality: SourceModality
  confidence: number
  spanStart: number | null
  spanEnd: number | null
  textExcerpt: string
  reason: string // plain-language explanation
}

export interface Report {
  candidateId: string
  finalScore: number
  evidence: EvidenceItem[]
  summaryText: string
  reviewedBy: string | null
}

export interface Session {
  candidate: Candidate
  answerText: string
  questionPrompt: string
  events: LinguisticEvent[]
  evidence: EvidenceItem[]
  report: Report
}

/** Human-readable label + short code for each event type. */
export const EVENT_META: Record<
  EventType,
  { label: string; short: string; description: string }
> = {
  ai_text_probability: {
    label: 'AI-generated text',
    short: 'ai-text',
    description: 'Statistical signature consistent with a language model.',
  },
  semantic_match: {
    label: 'Semantic match',
    short: 'semantic',
    description: 'High semantic overlap with a known external source.',
  },
  style_deviation: {
    label: 'Style deviation',
    short: 'style',
    description: "Sudden shift from the candidate's established writing style.",
  },
  multi_speaker: {
    label: 'Multiple speakers',
    short: 'speakers',
    description: 'Transcribed audio contains more than one distinct voice.',
  },
  coaching_phrase: {
    label: 'Coaching phrase',
    short: 'coaching',
    description: 'Phrasing associated with third-party prompting or coaching.',
  },
}

export type SuspicionLevel = 'clear' | 'flagged' | 'high'

export function suspicionLevel(score: number): SuspicionLevel {
  if (score >= 0.66) return 'high'
  if (score >= 0.33) return 'flagged'
  return 'clear'
}
