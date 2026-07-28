import type {
  EvidenceItem,
  EventType,
  LinguisticEvent,
  Session,
} from './types'

/** Find the [start, end) char offsets of a phrase within a body of text. */
function span(text: string, phrase: string): [number, number] {
  const start = text.indexOf(phrase)
  if (start === -1) {
    // Fail loud in dev if a phrase drifts out of sync with the source text.
    console.log('[v0] span phrase not found:', phrase.slice(0, 40))
    return [0, 0]
  }
  return [start, start + phrase.length]
}

let eventCounter = 0
function evt(
  candidateId: string,
  eventType: EventType,
  sourceModality: 'typed' | 'transcribed',
  confidence: number,
  offsets: [number, number] | null,
  timestamp: string,
): LinguisticEvent {
  eventCounter += 1
  return {
    id: `evt-${candidateId}-${eventCounter}`,
    candidateId,
    eventType,
    sourceModality,
    confidence,
    spanStart: offsets ? offsets[0] : null,
    spanEnd: offsets ? offsets[1] : null,
    timestamp,
  }
}

/* ------------------------------------------------------------------ */
/* Session 1 — HIGH suspicion                                          */
/* ------------------------------------------------------------------ */

const answer1 = `The French Revolution was not a single event but a decade-long rupture in the social and political order of France. It began in 1789 with the calling of the Estates-General and the storming of the Bastille, and it ended with the rise of Napoleon Bonaparte in 1799.

Furthermore, it is important to note that the revolution fundamentally reshaped the relationship between the citizen and the state. The abolition of feudal privileges, the Declaration of the Rights of Man, and the eventual execution of Louis XVI collectively signaled the definitive end of the ancien régime and the emergence of modern republican governance.

In conclusion, the revolution's legacy is multifaceted and continues to influence political thought to this day. Its emphasis on liberty, equality, and fraternity laid the groundwork for subsequent democratic movements across Europe and beyond.

my nan always said the king had it coming and honestly the bread prices tell you everything you need to know about why people snapped.`

const s1p1 = span(
  answer1,
  'Furthermore, it is important to note that the revolution fundamentally reshaped the relationship between the citizen and the state.',
)
const s1p2 = span(
  answer1,
  'The abolition of feudal privileges, the Declaration of the Rights of Man, and the eventual execution of Louis XVI collectively signaled the definitive end of the ancien régime and the emergence of modern republican governance.',
)
const s1p3 = span(
  answer1,
  'my nan always said the king had it coming and honestly the bread prices tell you everything you need to know about why people snapped.',
)
const s1p4 = span(answer1, 'liberty, equality, and fraternity')

const events1: LinguisticEvent[] = [
  evt('c1', 'style_deviation', 'typed', 0.82, s1p1, '2026-07-24T09:04:12Z'),
  evt('c1', 'ai_text_probability', 'typed', 0.94, s1p2, '2026-07-24T09:07:48Z'),
  evt('c1', 'semantic_match', 'typed', 0.91, s1p2, '2026-07-24T09:08:02Z'),
  evt('c1', 'style_deviation', 'typed', 0.88, s1p3, '2026-07-24T09:15:31Z'),
  evt('c1', 'coaching_phrase', 'transcribed', 0.71, s1p4, '2026-07-24T09:18:56Z'),
]

const evidence1: EvidenceItem[] = [
  {
    eventId: events1[0].id,
    eventType: 'style_deviation',
    sourceModality: 'typed',
    confidence: 0.82,
    spanStart: s1p1[0],
    spanEnd: s1p1[1],
    textExcerpt:
      'Furthermore, it is important to note that the revolution fundamentally reshaped the relationship between the citizen and the state.',
    reason:
      "This sentence shows a 40-point style deviation from the candidate's earlier answers — sentence length, connective phrasing, and vocabulary density jump sharply from the plain register used moments before.",
  },
  {
    eventId: events1[1].id,
    eventType: 'ai_text_probability',
    sourceModality: 'typed',
    confidence: 0.94,
    spanStart: s1p2[0],
    spanEnd: s1p2[1],
    textExcerpt:
      'The abolition of feudal privileges, the Declaration of the Rights of Man, and the eventual execution of Louis XVI…',
    reason:
      'This passage carries a 94% probability of being machine-generated: uniform token distribution, textbook parallelism, and an absence of the self-corrections present elsewhere in the answer.',
  },
  {
    eventId: events1[2].id,
    eventType: 'semantic_match',
    sourceModality: 'typed',
    confidence: 0.91,
    spanStart: s1p2[0],
    spanEnd: s1p2[1],
    textExcerpt:
      '…the definitive end of the ancien régime and the emergence of modern republican governance.',
    reason:
      'A 91% semantic match to a widely indexed online encyclopedia summary of the French Revolution. The meaning is near-identical even though the wording is lightly paraphrased.',
  },
  {
    eventId: events1[3].id,
    eventType: 'style_deviation',
    sourceModality: 'typed',
    confidence: 0.88,
    spanStart: s1p3[0],
    spanEnd: s1p3[1],
    textExcerpt:
      'my nan always said the king had it coming and honestly the bread prices…',
    reason:
      "An 88-point drop toward a colloquial register. This is likely the candidate's authentic voice, which makes the formal passages above stand out as inconsistent authorship.",
  },
  {
    eventId: events1[4].id,
    eventType: 'coaching_phrase',
    sourceModality: 'transcribed',
    confidence: 0.71,
    spanStart: s1p4[0],
    spanEnd: s1p4[1],
    textExcerpt: 'liberty, equality, and fraternity',
    reason:
      'The transcribed audio around this span contains a low background voice supplying the phrase moments before it was typed — consistent with third-party coaching.',
  },
]

const session1: Session = {
  candidate: {
    id: 'c1',
    name: 'Marcus Vale',
    examId: 'HIST-204',
    examTitle: 'European History — Final Essay',
    // Relative to load time so elapsed timers count up correctly.
    sessionStart: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    runningScore: 0.87,
  },
  questionPrompt:
    'Assess the causes and long-term consequences of the French Revolution (1789–1799).',
  answerText: answer1,
  events: events1,
  evidence: evidence1,
  report: {
    candidateId: 'c1',
    finalScore: 0.87,
    evidence: evidence1,
    summaryText:
      "This session contains multiple high-confidence linguistic anomalies. Two central paragraphs read as machine-generated and closely mirror an online source, while the surrounding text swings between a polished academic register and the candidate's markedly more casual authentic voice. The combination of an AI-text signature, a 91% semantic match, and a coaching phrase captured on audio warrants escalation.",
    reviewedBy: null,
  },
}

/* ------------------------------------------------------------------ */
/* Session 2 — MEDIUM suspicion                                        */
/* ------------------------------------------------------------------ */

const answer2 = `Photosynthesis is the process by which green plants convert light energy into chemical energy stored in glucose. It takes place mainly in the leaves, inside organelles called chloroplasts, which contain the pigment chlorophyll.

The process can be divided into two stages. In the light-dependent reactions, water is split and energy carriers such as ATP and NADPH are produced. It is well established that these reactions occur in the thylakoid membranes of the chloroplast.

In the second stage, known as the Calvin cycle, carbon dioxide is fixed into glucose using the ATP and NADPH generated earlier. I think this stage happens in the stroma but I'm not totally sure we covered that part in class.`

const s2p1 = span(
  answer2,
  'It is well established that these reactions occur in the thylakoid membranes of the chloroplast.',
)
const s2p2 = span(
  answer2,
  "I think this stage happens in the stroma but I'm not totally sure we covered that part in class.",
)

const events2: LinguisticEvent[] = [
  evt('c2', 'semantic_match', 'typed', 0.58, s2p1, '2026-07-24T10:22:04Z'),
  evt('c2', 'style_deviation', 'typed', 0.44, s2p1, '2026-07-24T10:22:19Z'),
]

const evidence2: EvidenceItem[] = [
  {
    eventId: events2[0].id,
    eventType: 'semantic_match',
    sourceModality: 'typed',
    confidence: 0.58,
    spanStart: s2p1[0],
    spanEnd: s2p1[1],
    textExcerpt:
      'It is well established that these reactions occur in the thylakoid membranes of the chloroplast.',
    reason:
      'A moderate 58% semantic match to standard textbook phrasing. This is common for factual science content and is not conclusive on its own — flagged for a human judgment call rather than as a confirmed violation.',
  },
  {
    eventId: events2[1].id,
    eventType: 'style_deviation',
    sourceModality: 'typed',
    confidence: 0.44,
    spanStart: s2p1[0],
    spanEnd: s2p1[1],
    textExcerpt: 'It is well established that these reactions occur…',
    reason:
      'A mild register shift toward formal phrasing for one sentence. The surrounding text, including a candid admission of uncertainty, reads as consistent authentic authorship.',
  },
]

const session2: Session = {
  candidate: {
    id: 'c2',
    name: 'Priya Anand',
    examId: 'BIO-101',
    examTitle: 'Introductory Biology — Short Answer',
    // Relative to load time so elapsed timers count up correctly.
    sessionStart: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    runningScore: 0.41,
  },
  questionPrompt:
    'Describe the process of photosynthesis, including where each stage occurs.',
  answerText: answer2,
  events: events2,
  evidence: evidence2,
  report: {
    candidateId: 'c2',
    finalScore: 0.41,
    evidence: evidence2,
    summaryText:
      "One sentence shows a moderate semantic match to common textbook phrasing alongside a mild style shift. The rest of the answer — including an explicit admission of uncertainty — reads as consistent, authentic work. This is a borderline case best resolved by an examiner's judgment rather than treated as a confirmed violation.",
    reviewedBy: null,
  },
}

/* ------------------------------------------------------------------ */
/* Session 3 — CLEAR                                                   */
/* ------------------------------------------------------------------ */

const answer3 = `A binary search works by repeatedly dividing a sorted array in half. You start by comparing the target value to the middle element. If they match, you're done. If the target is smaller, you search the left half; if it's larger, you search the right half.

You keep halving the search range until you either find the value or the range becomes empty. Because the range shrinks by half each step, the algorithm runs in logarithmic time, O(log n), which is much faster than checking every element one by one.

One thing I always mix up is the off-by-one on the boundaries, so I usually write low and high as inclusive indices and stop when low is greater than high.`

const events3: LinguisticEvent[] = []
const evidence3: EvidenceItem[] = []

const session3: Session = {
  candidate: {
    id: 'c3',
    name: 'Devon Clarke',
    examId: 'CS-150',
    examTitle: 'Algorithms — Concept Check',
    // Relative to load time so elapsed timers count up correctly.
    sessionStart: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    runningScore: 0.08,
  },
  questionPrompt:
    'Explain how a binary search works and state its time complexity.',
  answerText: answer3,
  events: events3,
  evidence: evidence3,
  report: {
    candidateId: 'c3',
    finalScore: 0.08,
    evidence: evidence3,
    summaryText:
      'No linguistic anomalies were detected in this session. Style, vocabulary, and register are consistent throughout, including a natural personal aside about boundary conditions. No external matches or machine-text signatures were found.',
    reviewedBy: 'You',
  },
}

export const SESSIONS: Session[] = [session1, session2, session3]

/* ------------------------------------------------------------------ */
/* Cohort analytics (institution admin)                                */
/* ------------------------------------------------------------------ */

export const FLAG_FREQUENCY: { type: string; label: string; count: number }[] =
  [
    { type: 'style_deviation', label: 'Style deviation', count: 148 },
    { type: 'semantic_match', label: 'Semantic match', count: 96 },
    { type: 'ai_text_probability', label: 'AI-generated text', count: 71 },
    { type: 'coaching_phrase', label: 'Coaching phrase', count: 34 },
    { type: 'multi_speaker', label: 'Multiple speakers', count: 19 },
  ]

// AI-text-probability distribution across an exam (histogram buckets).
export const AI_PROBABILITY_DISTRIBUTION: {
  bucket: string
  candidates: number
}[] = [
  { bucket: '0–10%', candidates: 142 },
  { bucket: '10–20%', candidates: 88 },
  { bucket: '20–30%', candidates: 54 },
  { bucket: '30–40%', candidates: 31 },
  { bucket: '40–50%', candidates: 22 },
  { bucket: '50–60%', candidates: 16 },
  { bucket: '60–70%', candidates: 12 },
  { bucket: '70–80%', candidates: 9 },
  { bucket: '80–90%', candidates: 6 },
  { bucket: '90–100%', candidates: 4 },
]

// Comparison across question types.
export const QUESTION_TYPE_COMPARISON: {
  questionType: string
  avgSuspicion: number
  flagRate: number
}[] = [
  { questionType: 'Essay', avgSuspicion: 38, flagRate: 24 },
  { questionType: 'Short answer', avgSuspicion: 21, flagRate: 12 },
  { questionType: 'Definition', avgSuspicion: 44, flagRate: 31 },
  { questionType: 'Problem set', avgSuspicion: 14, flagRate: 7 },
  { questionType: 'Oral (transcribed)', avgSuspicion: 29, flagRate: 18 },
]
