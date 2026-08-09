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
