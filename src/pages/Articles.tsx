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
      <h1 className="mb-4 text-2xl font-bold">{t('articles.title')}</h1>
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
                className="card group flex flex-col p-5 transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent-dark">
                    {a.level}
                  </span>
                  <span className="text-xs text-stone-400">
                    {t('articles.charCount', { count: a.content.length })}
                  </span>
                </div>
                <h2 className="mb-2 font-bold group-hover:text-accent-dark">{a.title}</h2>
                <p className="line-clamp-2 text-sm leading-relaxed text-stone-500">
                  {a.content.slice(0, 60)}…
                </p>
                {best && (
                  <p className="mt-3 text-xs font-medium text-amber-500">
                    ★ {t('articles.best')} {Math.round(best.accuracy * 100)}% · {best.cpm}{' '}
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
