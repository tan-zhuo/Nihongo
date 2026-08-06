import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { loadRecords, clearRecords } from '../lib/storage'
import { getArticle } from '../data/articles'
import TrendChart from '../components/TrendChart'

function formatTime(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`
}

export default function Stats() {
  const { t, i18n } = useTranslation()
  const [version, setVersion] = useState(0)
  const records = useMemo(() => loadRecords(), [version])
  const lang = i18n.resolvedLanguage ?? 'en'

  const articleStats = useMemo(() => {
    const list = records.articles
    if (list.length === 0) return null
    return {
      count: list.length,
      avgAccuracy: list.reduce((n, r) => n + r.accuracy, 0) / list.length,
      bestCpm: Math.max(...list.map((r) => r.cpm)),
    }
  }, [records])

  const vocabStats = useMemo(() => {
    const list = records.vocab
    if (list.length === 0) return null
    const total = list.reduce((n, r) => n + r.total, 0)
    const correct = list.reduce((n, r) => n + r.correct, 0)
    return { sessions: list.length, total, accuracy: total > 0 ? correct / total : 0 }
  }, [records])

  const kanaStats = useMemo(() => {
    const list = records.kana
    if (list.length === 0) return null
    const total = list.reduce((n, r) => n + r.total, 0)
    const correct = list.reduce((n, r) => n + r.correct, 0)
    return { sessions: list.length, total, accuracy: total > 0 ? correct / total : 0 }
  }, [records])

  const recent = useMemo(
    () => [...records.articles].sort((a, b) => b.ts - a.ts).slice(0, 20),
    [records],
  )

  const dateLabel = (ts: number) =>
    new Date(ts).toLocaleDateString(lang, { month: 'numeric', day: 'numeric' })

  const trend = useMemo(() => {
    const asc = [...records.articles].sort((a, b) => a.ts - b.ts).slice(-30)
    return {
      cpm: asc.map((r) => r.cpm),
      acc: asc.map((r) => Math.round(r.accuracy * 100)),
      labels: asc.map((r) => dateLabel(r.ts)),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, lang])

  const sessionTrend = (list: { ts: number; correct: number; total: number }[]) => {
    const asc = [...list].sort((a, b) => a.ts - b.ts).slice(-30)
    return {
      acc: asc.map((r) => Math.round((r.correct / (r.total || 1)) * 100)),
      labels: asc.map((r) => dateLabel(r.ts)),
    }
  }
  const vocabTrend = sessionTrend(records.vocab)
  const kanaTrend = sessionTrend(records.kana)

  const clear = () => {
    if (window.confirm(t('stats.clearConfirm'))) {
      clearRecords()
      setVersion((v) => v + 1)
    }
  }

  if (!articleStats && !vocabStats && !kanaStats) {
    return (
      <div className="py-16 text-center text-stone-500">
        <p className="mb-6">{t('stats.empty')}</p>
        <Link to="/articles" className="btn-primary">{t('nav.articles')}</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold">{t('stats.title')}</h1>
        <button className="btn-ghost text-xs text-red-500" onClick={clear}>
          {t('stats.clear')}
        </button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articleStats && (
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-stone-500">{t('stats.articleSection')}</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-accent-dark">{articleStats.count}</div>
                <div className="mt-1 text-xs text-stone-400">{t('stats.totalPractices')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-dark">
                  {Math.round(articleStats.avgAccuracy * 100)}%
                </div>
                <div className="mt-1 text-xs text-stone-400">{t('stats.avgAccuracy')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-dark">{articleStats.bestCpm}</div>
                <div className="mt-1 text-xs text-stone-400">
                  {t('stats.bestSpeed')} ({t('practice.speedUnit')})
                </div>
              </div>
            </div>
          </div>
        )}
        {vocabStats && (
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-stone-500">{t('stats.vocabSection')}</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-accent-dark">{vocabStats.sessions}</div>
                <div className="mt-1 text-xs text-stone-400">{t('stats.sessions')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-dark">{vocabStats.total}</div>
                <div className="mt-1 text-xs text-stone-400">{t('stats.wordsAnswered')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-dark">
                  {Math.round(vocabStats.accuracy * 100)}%
                </div>
                <div className="mt-1 text-xs text-stone-400">{t('stats.avgAccuracy')}</div>
              </div>
            </div>
          </div>
        )}
        {kanaStats && (
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-stone-500">{t('stats.kanaSection')}</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-accent-dark">{kanaStats.sessions}</div>
                <div className="mt-1 text-xs text-stone-400">{t('stats.sessions')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-dark">{kanaStats.total}</div>
                <div className="mt-1 text-xs text-stone-400">{t('stats.wordsAnswered')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-dark">
                  {Math.round(kanaStats.accuracy * 100)}%
                </div>
                <div className="mt-1 text-xs text-stone-400">{t('stats.avgAccuracy')}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {trend.cpm.length >= 2 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <TrendChart
            title={`${t('stats.speedTrend')} (${t('practice.speedUnit')})`}
            values={trend.cpm}
            labels={trend.labels}
          />
          <TrendChart
            title={t('stats.accuracyTrend')}
            values={trend.acc}
            labels={trend.labels}
            unit="%"
            yMin={Math.max(0, Math.floor((Math.min(...trend.acc) - 5) / 10) * 10)}
            yMax={100}
          />
        </div>
      )}

      {(vocabTrend.acc.length >= 2 || kanaTrend.acc.length >= 2) && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {vocabTrend.acc.length >= 2 && (
            <TrendChart
              title={`${t('stats.vocabSection')} · ${t('stats.accuracyTrend')}`}
              values={vocabTrend.acc}
              labels={vocabTrend.labels}
              unit="%"
              yMin={Math.max(0, Math.floor((Math.min(...vocabTrend.acc) - 10) / 10) * 10)}
              yMax={100}
            />
          )}
          {kanaTrend.acc.length >= 2 && (
            <TrendChart
              title={`${t('stats.kanaSection')} · ${t('stats.accuracyTrend')}`}
              values={kanaTrend.acc}
              labels={kanaTrend.labels}
              unit="%"
              yMin={Math.max(0, Math.floor((Math.min(...kanaTrend.acc) - 10) / 10) * 10)}
              yMax={100}
            />
          )}
        </div>
      )}

      {recent.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="border-b border-stone-100 p-4 text-sm font-semibold text-stone-500">
            {t('stats.recent')}
          </h2>
          <table className="w-full text-sm">
            <tbody>
              {recent.map((r, i) => {
                const article = getArticle(r.articleId)
                return (
                  <tr key={i} className="border-b border-stone-100 last:border-0">
                    <td className="p-3">
                      <Link
                        to={`/practice/${r.articleId}`}
                        className="font-medium hover:text-accent-dark"
                      >
                        {article?.title ?? r.articleId}
                      </Link>
                      <span className="ml-2 rounded bg-accent-light px-1.5 py-0.5 text-xs font-semibold text-accent-dark">
                        {r.level}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium text-emerald-600">
                      {Math.round(r.accuracy * 100)}%
                    </td>
                    <td className="p-3 text-right">
                      {r.cpm} {t('practice.speedUnit')}
                    </td>
                    <td className="hidden p-3 text-right text-stone-400 sm:table-cell">
                      {formatTime(r.timeMs)}
                    </td>
                    <td className="p-3 text-right text-xs text-stone-400">
                      {new Date(r.ts).toLocaleString(lang, {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
