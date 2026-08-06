// Furigana annotations are stored as "{漢字|かんじ}" runs inside the article's
// `furigana` string; stripping the braces reproduces `content` exactly.

export interface RubySeg {
  text: string
  ruby?: string
  /** index of this segment's first character in the plain content */
  start: number
}

const RUN_RE = /\{([^|{}]+)\|([^|{}]+)\}/g

export function parseFurigana(furigana: string | undefined, content: string): RubySeg[] {
  if (!furigana) return content ? [{ text: content, start: 0 }] : []
  const segs: RubySeg[] = []
  let plainPos = 0
  let last = 0
  for (const m of furigana.matchAll(RUN_RE)) {
    if (m.index > last) {
      const text = furigana.slice(last, m.index)
      segs.push({ text, start: plainPos })
      plainPos += text.length
    }
    segs.push({ text: m[1], ruby: m[2], start: plainPos })
    plainPos += m[1].length
    last = m.index + m[0].length
  }
  if (last < furigana.length) {
    segs.push({ text: furigana.slice(last), start: plainPos })
  }
  return segs
}

/**
 * Split content into typing lines of at most `max` chars, preferring to break
 * after punctuation and never inside a ruby (kanji) segment.
 */
export function splitSegLines(
  content: string,
  segs: RubySeg[],
  max = 22,
): { start: number; end: number }[] {
  const PUNCT = '。、！？」）ー'
  // A cut may not fall inside a ruby run, and — following Japanese kinsoku
  // rules — the next line may not start with closing punctuation.
  const cutAllowed = (pos: number) =>
    !PUNCT.includes(content[pos]) &&
    !segs.some((s) => s.ruby && pos > s.start && pos < s.start + s.text.length)

  const ranges: { start: number; end: number }[] = []
  let start = 0
  while (content.length - start > max) {
    const limit = start + max
    let cut = -1
    for (let i = limit; i > start + Math.floor(max / 2); i--) {
      if (PUNCT.includes(content[i - 1]) && cutAllowed(i)) {
        cut = i
        break
      }
    }
    if (cut === -1) {
      for (let i = limit; i > start; i--) {
        if (cutAllowed(i)) {
          cut = i
          break
        }
      }
    }
    if (cut === -1) cut = limit
    ranges.push({ start, end: cut })
    start = cut
  }
  if (start < content.length) {
    // Avoid an orphan line of trailing punctuation.
    if (content.length - start <= 2 && ranges.length > 0) {
      ranges[ranges.length - 1].end = content.length
    } else {
      ranges.push({ start, end: content.length })
    }
  }
  return ranges
}

/** Segments overlapping [start, end), clipped to the range. Ruby segments never straddle it. */
export function sliceSegs(segs: RubySeg[], start: number, end: number): RubySeg[] {
  const out: RubySeg[] = []
  for (const s of segs) {
    const sEnd = s.start + s.text.length
    if (sEnd <= start || s.start >= end) continue
    const from = Math.max(s.start, start)
    const to = Math.min(sEnd, end)
    out.push({
      text: s.text.slice(from - s.start, to - s.start),
      ruby: from === s.start && to === sEnd ? s.ruby : undefined,
      start: from,
    })
  }
  return out
}
