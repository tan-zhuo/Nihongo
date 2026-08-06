import type { Article } from '../../types'
import n5 from './n5.json'
import n4 from './n4.json'
import n3 from './n3.json'
import n2 from './n2.json'
import n1 from './n1.json'
import stories from './stories.json'

export const articles: Article[] = [
  ...(n5 as Article[]),
  ...(n4 as Article[]),
  ...(n3 as Article[]),
  ...(n2 as Article[]),
  ...(n1 as Article[]),
  ...(stories as Article[]),
]

export function getArticle(id: string): Article | undefined {
  return articles.find((a) => a.id === id)
}

export function nextArticle(id: string): Article | undefined {
  const current = getArticle(id)
  if (!current) return undefined
  // Stories cycle among stories; essays cycle within their level.
  const pool = current.kind === 'story'
    ? articles.filter((a) => a.kind === 'story')
    : articles.filter((a) => a.level === current.level && a.kind !== 'story')
  const idx = pool.findIndex((a) => a.id === id)
  return pool[(idx + 1) % pool.length]
}
