export type Level = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

export const LEVELS: Level[] = ['N5', 'N4', 'N3', 'N2', 'N1']

export interface Article {
  id: string
  level: Level
  title: string
  content: string
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
