import type { TextbookBook, TextbookLesson, TextbookWord } from '../../types'
import elementary1 from './elementary-1.json'
import elementary2 from './elementary-2.json'
import intermediate1 from './intermediate-1.json'
import intermediate2 from './intermediate-2.json'
import advanced1 from './advanced-1.json'
import advanced2 from './advanced-2.json'

export const books: TextbookBook[] = [
  elementary1 as TextbookBook,
  elementary2 as TextbookBook,
  intermediate1 as TextbookBook,
  intermediate2 as TextbookBook,
  advanced1 as TextbookBook,
  advanced2 as TextbookBook,
]

export function findBook(id: string | undefined): TextbookBook | undefined {
  return books.find((b) => b.id === id)
}

export function findLesson(
  book: TextbookBook | undefined,
  n: string | number | undefined,
): TextbookLesson | undefined {
  const num = typeof n === 'string' ? Number(n) : n
  if (!book || !num || Number.isNaN(num)) return undefined
  return book.lessons.find((l) => l.n === num)
}

export function bookWords(book: TextbookBook): TextbookWord[] {
  return book.lessons.flatMap((l) => l.words)
}

/** Every word in the six volumes — the distractor pool of last resort. */
export const allTextbookWords: TextbookWord[] = books.flatMap(bookWords)
