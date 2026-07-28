import type { EvidenceItem, SuspicionLevel } from './types'
import { suspicionLevel } from './types'

export interface MarkedRange {
  key: string
  start: number
  end: number
  level: SuspicionLevel
  maxConfidence: number
  eventIds: string[]
}

export interface Segment {
  text: string
  range?: MarkedRange
}

export function spanKey(start: number, end: number): string {
  return `${start}-${end}`
}

/** Collapse evidence into unique marked ranges keyed by their span. */
export function buildRanges(evidence: EvidenceItem[]): MarkedRange[] {
  const byKey = new Map<string, MarkedRange>()
  for (const ev of evidence) {
    if (ev.spanStart == null || ev.spanEnd == null) continue
    const key = spanKey(ev.spanStart, ev.spanEnd)
    const existing = byKey.get(key)
    if (existing) {
      existing.eventIds.push(ev.eventId)
      if (ev.confidence > existing.maxConfidence) {
        existing.maxConfidence = ev.confidence
        existing.level = suspicionLevel(ev.confidence)
      }
    } else {
      byKey.set(key, {
        key,
        start: ev.spanStart,
        end: ev.spanEnd,
        level: suspicionLevel(ev.confidence),
        maxConfidence: ev.confidence,
        eventIds: [ev.eventId],
      })
    }
  }
  return [...byKey.values()].sort((a, b) => a.start - b.start)
}

/** Split text into plain + marked segments. Assumes ranges do not partially overlap. */
export function buildSegments(text: string, ranges: MarkedRange[]): Segment[] {
  const segments: Segment[] = []
  let cursor = 0
  for (const range of ranges) {
    if (range.start < cursor) continue // skip overlaps defensively
    if (range.start > cursor) {
      segments.push({ text: text.slice(cursor, range.start) })
    }
    segments.push({ text: text.slice(range.start, range.end), range })
    cursor = range.end
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) })
  }
  return segments
}
