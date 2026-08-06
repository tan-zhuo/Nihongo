import type { ArticleWord } from '../types'

export interface WordHit {
  w: string
  r: string
  zh: string
  en: string
}

function scanFor(content: string, index: number, entries: ArticleWord[]): WordHit | null {
  let best: WordHit | null = null
  for (const e of entries) {
    if (best && e.w.length <= best.w.length) continue
    let from = 0
    while (true) {
      const i = content.indexOf(e.w, from)
      if (i === -1 || i > index) break
      if (index < i + e.w.length) {
        best = e
        break
      }
      from = i + 1
    }
  }
  return best
}

/**
 * Find the longest word covering the character at `index`. The article's own
 * glossary (context-correct) wins; the global 4200-word vocabulary is the
 * fallback, loaded lazily so the practice page stays light.
 */
export async function lookupWordAt(
  content: string,
  index: number,
  articleWords?: ArticleWord[],
): Promise<WordHit | null> {
  if (articleWords?.length) {
    const hit = scanFor(content, index, articleWords)
    if (hit) return hit
  }
  const { vocab } = await import('../data/vocab')
  return scanFor(
    content,
    index,
    vocab.map((v) => ({ w: v.word, r: v.reading, zh: v.meaning_zh, en: v.meaning_en })),
  )
}
