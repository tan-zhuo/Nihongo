import { useEffect } from 'react'
import { ORIGIN, PAGE_META, articleMeta } from '../lib/seo'
import type { Article } from '../types'

function setMeta(selector: string, attr: string, value: string) {
  const el = document.head.querySelector<HTMLElement>(selector)
  if (el) el.setAttribute(attr, value)
}

function apply(title: string, desc: string, path: string) {
  const url = ORIGIN + (path === '/' ? '/' : path)
  document.title = title
  setMeta('meta[name="description"]', 'content', desc)
  setMeta('link[rel="canonical"]', 'href', url)
  setMeta('meta[property="og:title"]', 'content', title)
  setMeta('meta[property="og:description"]', 'content', desc)
  setMeta('meta[property="og:url"]', 'content', url)
}

/**
 * Keeps title / description / canonical / og: tags in sync during client-side
 * navigation. Prerendered HTML carries the same values for crawlers.
 */
export function usePageMeta(path: keyof typeof PAGE_META) {
  useEffect(() => {
    const m = PAGE_META[path]
    apply(m.title, m.desc, path)
  }, [path])
}

export function useArticlePageMeta(article: Article | undefined) {
  useEffect(() => {
    if (!article) return
    const m = articleMeta(article)
    apply(m.title, m.desc, `/practice/${article.id}`)
  }, [article])
}
