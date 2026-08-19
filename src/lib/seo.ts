import type { Article, TextbookBook, TextbookLesson } from '../types'

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
  '/kana/convert': {
    title: 'Hiragana → Katakana Practice (ひらがな⇄カタカナ) — nihongo.ink',
    desc: 'Drill kana conversion both ways: see a hiragana and pick or hand-write the katakana, and back again. Look-alike distractors (シ/ツ, ソ/ン), a writing pad, and native audio for every character.',
  },
  '/grammar': {
    title: 'Japanese Grammar Typing Practice (JLPT N5–N1 + Keigo) — nihongo.ink',
    desc: 'Type example sentences for JLPT N5–N1 grammar points and keigo (honorific Japanese), with furigana, translations and audio.',
  },
  '/quiz': {
    title: 'JLPT Practice Quiz (N5–N1) — 模擬試験 · 模拟刷题 — nihongo.ink',
    desc: 'Free JLPT practice questions for N5–N1 in the official exam format: kanji reading, orthography, context, paraphrase, usage, grammar, sentence order and reading comprehension — with explanations.',
  },
  '/textbook': {
    title: '标准日本语单词卡片 · 初级/中级/高级分课背单词 — nihongo.ink',
    desc: '《新版中日交流标准日本语》初级上下册、中级上下册、高级上下册，按课整理的单词表。翻卡记忆 + 四选一选择题，中日英三语释义、发音朗读，进度自动保存。',
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


export function textbookBookMeta(book: TextbookBook): PageMeta {
  const words = book.lessons.reduce((n, l) => n + l.words.length, 0)
  return {
    title: `标准日本语${book.title_zh} 分课单词表（第${book.lessons[0]?.n ?? 1}–${
      book.lessons[book.lessons.length - 1]?.n ?? 1
    }课）— nihongo.ink`,
    desc: clip(
      `《新版中日交流标准日本语》${book.title_zh}共 ${book.lessons.length} 课、${words} 个单词，按课分组。卡片翻背 + 选择题自测，附假名读音、词性和中英释义。`,
    ),
  }
}

export function textbookLessonMeta(book: TextbookBook, lesson: TextbookLesson): PageMeta {
  return {
    title: `标日${book.title_zh} 第${lesson.n}课 ${lesson.title} 单词表 — nihongo.ink`,
    desc: clip(
      `《标准日本语》${book.title_zh}第${lesson.n}课「${lesson.title}」（${lesson.title_zh}）的 ${lesson.words.length} 个单词：${lesson.words
        .slice(0, 8)
        .map((w) => w.w)
        .join('、')}… 卡片记忆与选择题练习，带读音和中英释义。`,
    ),
  }
}
