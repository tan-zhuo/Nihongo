import type { Level } from '../types'

export interface ArticleRecord {
  articleId: string
  level: Level
  ts: number
  accuracy: number // 0..1
  cpm: number
  timeMs: number
  errors: number
}

export interface VocabRecord {
  ts: number
  mode: 'toJa' | 'toMeaning'
  level: Level | 'all'
  correct: number
  total: number
}

export interface KanaRecord {
  ts: number
  script: 'hiragana' | 'katakana'
  set: string
  correct: number
  total: number
  /** Absent on records written before the conversion drill existed. */
  mode?: 'romaji' | 'convert'
}

export interface QuizRecord {
  ts: number
  level: Level | 'all'
  section: 'all' | 'vocab' | 'grammar' | 'reading'
  correct: number
  total: number
}

interface Records {
  articles: ArticleRecord[]
  vocab: VocabRecord[]
  kana: KanaRecord[]
  quiz: QuizRecord[]
}

const KEY = 'nihongotype.records.v1'
const MAX_ENTRIES = 500

export function loadRecords(): Records {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        articles: Array.isArray(parsed.articles) ? parsed.articles : [],
        vocab: Array.isArray(parsed.vocab) ? parsed.vocab : [],
        kana: Array.isArray(parsed.kana) ? parsed.kana : [],
        quiz: Array.isArray(parsed.quiz) ? parsed.quiz : [],
      }
    }
  } catch {
    // corrupted or unavailable storage → start fresh
  }
  return { articles: [], vocab: [], kana: [], quiz: [] }
}

function save(records: Records) {
  try {
    localStorage.setItem(KEY, JSON.stringify(records))
  } catch {
    // storage full/unavailable → silently skip; records are best-effort
  }
}

export function addArticleRecord(record: ArticleRecord) {
  const records = loadRecords()
  records.articles.push(record)
  if (records.articles.length > MAX_ENTRIES) {
    records.articles = records.articles.slice(-MAX_ENTRIES)
  }
  save(records)
}

export function addVocabRecord(record: VocabRecord) {
  const records = loadRecords()
  records.vocab.push(record)
  if (records.vocab.length > MAX_ENTRIES) {
    records.vocab = records.vocab.slice(-MAX_ENTRIES)
  }
  save(records)
}

export function addKanaRecord(record: KanaRecord) {
  const records = loadRecords()
  records.kana.push(record)
  if (records.kana.length > MAX_ENTRIES) {
    records.kana = records.kana.slice(-MAX_ENTRIES)
  }
  save(records)
}

export function addQuizRecord(record: QuizRecord) {
  const records = loadRecords()
  records.quiz.push(record)
  if (records.quiz.length > MAX_ENTRIES) {
    records.quiz = records.quiz.slice(-MAX_ENTRIES)
  }
  save(records)
}

export function clearRecords() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

/** Best attempt for an article: highest accuracy, cpm as tie-breaker. */
export function bestForArticle(articleId: string, records?: ArticleRecord[]): ArticleRecord | undefined {
  const list = (records ?? loadRecords().articles).filter((r) => r.articleId === articleId)
  if (list.length === 0) return undefined
  return list.reduce((best, r) =>
    r.accuracy > best.accuracy || (r.accuracy === best.accuracy && r.cpm > best.cpm) ? r : best,
  )
}
