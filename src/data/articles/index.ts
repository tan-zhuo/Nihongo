import type { Article } from '../../types'
import n5 from './n5.json'
import n4 from './n4.json'
import n3 from './n3.json'
import n2 from './n2.json'
import n1 from './n1.json'

export const articles: Article[] = [
  ...(n5 as Article[]),
  ...(n4 as Article[]),
  ...(n3 as Article[]),
  ...(n2 as Article[]),
  ...(n1 as Article[]),
]

export function getArticle(id: string): Article | undefined {
  return articles.find((a) => a.id === id)
}

export function nextArticle(id: string): Article | undefined {
  const current = getArticle(id)
  if (!current) return undefined
  const sameLevel = articles.filter((a) => a.level === current.level)
  const idx = sameLevel.findIndex((a) => a.id === id)
  return sameLevel[(idx + 1) % sameLevel.length]
}
