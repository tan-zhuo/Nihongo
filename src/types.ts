export type Level = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

export const LEVELS: Level[] = ['N5', 'N4', 'N3', 'N2', 'N1']

export interface Article {
  id: string
  level: Level
  title: string
  content: string
  /** content with kanji runs annotated as {漢字|かんじ} for ruby display */
  furigana?: string
  /** 'story' = classic folktale (昔話); absent = regular essay */
  kind?: 'story'
  /** per-article glossary: surface form, reading, zh/en meanings */
  words?: ArticleWord[]
  /** sentence-aligned translations; joining every `ja` reproduces `content` */
  trans?: Sentence[]
  title_zh?: string
  title_en?: string
}

export interface Sentence {
  ja: string
  zh: string
  en: string
}

export interface GrammarExample {
  ja: string
  /** ja with kanji runs annotated as {漢字|かんじ} */
  furigana: string
  zh: string
  en: string
}

export interface GrammarPoint {
  id: string
  level: Level
  track: 'grammar' | 'keigo'
  group: string
  pattern: string
  meaning_zh: string
  meaning_en: string
  /** how the pattern attaches to the preceding word */
  formation: string
  explain_zh: string
  explain_en: string
  examples: GrammarExample[]
  note_zh?: string
  note_en?: string
}

export interface ArticleWord {
  w: string
  r: string
  zh: string
  en: string
}

export interface VocabWord {
  id: string
  word: string
  reading: string
  meaning_zh: string
  meaning_en: string
  level: Level
  pos: string
}

export type QuizSection = 'vocab' | 'grammar' | 'reading'

export type QuizType =
  | 'kanji-reading'
  | 'orthography'
  | 'context'
  | 'paraphrase'
  | 'usage'
  | 'grammar-form'
  | 'sentence-order'
  | 'reading'

export interface QuizQuestion {
  id: string
  level: Level
  section: QuizSection
  type: QuizType
  /** short reading passage, only for type 'reading' */
  passage?: string
  /** stem; target word wrapped in 【】, blanks as （　）, star slot as ★ */
  question: string
  options: string[]
  /** index into options */
  answer: number
  expl_zh: string
  expl_en: string
}
