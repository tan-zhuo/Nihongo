import type { Sentence } from '../types'

export interface SentenceSpan extends Sentence {
  start: number
  end: number
}

/** Sentences with their character offsets into the article content. */
export function sentenceSpans(trans: Sentence[] | undefined): SentenceSpan[] {
  if (!trans?.length) return []
  const spans: SentenceSpan[] = []
  let pos = 0
  for (const s of trans) {
    spans.push({ ...s, start: pos, end: pos + s.ja.length })
    pos += s.ja.length
  }
  return spans
}

/** The sentence containing `index`, or the last one once typing runs past the end. */
export function sentenceAt(spans: SentenceSpan[], index: number): SentenceSpan | undefined {
  if (!spans.length) return undefined
  for (const s of spans) {
    if (index < s.end) return s
  }
  return spans[spans.length - 1]
}
