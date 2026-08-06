import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { articles } from '../data/articles'
import LevelFilter from '../components/LevelFilter'
import { loadRecords, bestForArticle } from '../lib/storage'
import type { Level } from '../types'

export default function Articles() {
  const { t } = useTranslation()
  const [level, setLevel] = useState<Level | 'all'>('all')
  const records = useMemo(() => loadRecords().articles, [])
  const list = level === 'all' ? articles : articles.filter((a) => a.level === level)

  return (
    <div>
      <h1 className="mb-5 font-serif text-2xl font-bold">{t('articles.title')}</h1>
      <div className="mb-6">
        <LevelFilter value={level} onChange={setLevel} />
      </div>
      {list.length === 0 ? (
        <p className="py-12 text-center text-stone-400">{t('articles.empty')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => {
            const best = bestForArticle(a.id, records)
            return (
              <Link
                key={a.id}
                to={`/practice/${a.id}`}
                className="card group flex flex-col p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-md bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent-deep">
                    {a.level}
                  </span>
                  <span className="text-xs text-stone-400">
                    {t('articles.charCount', { count: a.content.length })}
                  </span>
                </div>
                <h2 className="mb-2 font-serif text-lg font-semibold group-hover:text-accent-deep">
                  {a.title}
                </h2>
                <p className="line-clamp-2 text-sm leading-relaxed text-stone-400">
                  {a.content.slice(0, 60)}…
                </p>
                {best && (
                  <p className="mt-4 border-t border-stone-100 pt-3 text-xs font-medium text-stone-500">
                    {t('articles.best')}
                    <span className="ml-2 font-semibold text-accent-deep">
                      {Math.round(best.accuracy * 100)}%
                    </span>
                    <span className="mx-1.5 text-stone-300">·</span>
                    <span className="font-semibold text-accent-deep">{best.cpm}</span>{' '}
                    {t('practice.speedUnit')}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
