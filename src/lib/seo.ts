import type { Article } from '../types'

export const ORIGIN = 'https://www.nihongo.ink'

export interface PageMeta {
  title: string
  desc: string
  noindex?: boolean
}

// Single source of truth for per-route SEO meta. Used by usePageMeta at
// runtime and by scripts/prerender.mjs at build time (via vite ssrLoadModule).
export const PAGE_META: Record<string, PageMeta> = {
  '/': {
    title:
      'nihongo.ink — Japanese Typing Practice | 日本語タイピング練習 · 日语打字练习',
    desc: 'Free Japanese typing practice. 52 JLPT N5–N1 graded articles and classic folktales, 4,200 vocabulary words, kana drills, grammar and keigo — with furigana, translations and audio.',
  },
  '/articles': {
    title: 'Japanese Articles for Typing Practice (JLPT N5–N1) — nihongo.ink',
    desc: 'Practice typing 52 graded Japanese articles: 40 original essays from JLPT N5 to N1 plus 12 classic folktales — 桃太郎, 浦島太郎, かぐや姫 and more. Furigana, translations and audio included.',
  },
  '/vocab': {
    title: 'Japanese Vocabulary Typing Practice — 4,200 JLPT Words — nihongo.ink',
    desc: 'Type 4,200 common Japanese words from JLPT N5 to N1. Two modes: see the meaning and type the Japanese, or see the Japanese and type the meaning. Filter by level and kana row.',
  },
  '/kana': {
    title: 'Hiragana & Katakana Typing Practice (五十音) — nihongo.ink',
    desc: 'Learn to type the Japanese kana. Hiragana and katakana drills across the 五十音 gojūon rows, with native audio for every character.',
  },
  '/grammar': {
    title: 'Japanese Grammar Typing Practice (JLPT N5–N1 + Keigo) — nihongo.ink',
    desc: 'Type example sentences for JLPT N5–N1 grammar points and keigo (honorific Japanese), with furigana, translations and audio.',
  },
  '/stats': {
    title: 'My Stats — nihongo.ink',
    desc: 'Your typing practice history and progress on nihongo.ink.',
    noindex: true,
  },
}

function clip(s: string, n = 158): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function firstSentence(a: Article): string {
  return a.trans?.[0]?.ja ?? a.content.split('。')[0] + '。'
}

export function articleMeta(a: Article): PageMeta {
  const en = a.title_en ? ` (${a.title_en})` : ''
  if (a.kind === 'story') {
    return {
      title: `${a.title}${en} — Japanese Folktale Typing Practice | nihongo.ink`,
      desc: clip(
        `Type the classic Japanese folktale ${a.title}${en}. ${firstSentence(a)} With furigana, Chinese and English translations, and audio.`,
      ),
    }
  }
  return {
    title: `${a.title}${en} — JLPT ${a.level} Japanese Typing Practice | nihongo.ink`,
    desc: clip(
      `Type the JLPT ${a.level} Japanese article ${a.title}${en}. ${firstSentence(a)} With furigana, Chinese and English translations, and audio.`,
    ),
  }
}
