import { useTranslation } from 'react-i18next'
import type { TypingStats } from '../hooks/useTyping'

interface Props {
  stats: TypingStats
  newBest?: boolean
  onRetry: () => void
  onNext?: () => void
  onBack: () => void
}

function formatTime(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function ResultModal({ stats, newBest, onRetry, onNext, onBack }: Props) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h2 className="mb-2 text-center text-2xl font-bold text-accent-dark">
          {t('practice.resultTitle')}
        </h2>
        {newBest && (
          <p className="mb-4 text-center text-sm font-semibold text-amber-500">
            🏆 {t('practice.newBest')}
          </p>
        )}
        {!newBest && <div className="mb-4" />}
        <div className="mb-6 grid grid-cols-2 gap-4 text-center">
          <div className="rounded-lg bg-accent-light p-4">
            <div className="text-3xl font-bold text-accent-dark">
              {Math.round(stats.accuracy * 100)}%
            </div>
            <div className="mt-1 text-xs text-stone-500">{t('practice.accuracy')}</div>
          </div>
          <div className="rounded-lg bg-accent-light p-4">
            <div className="text-3xl font-bold text-accent-dark">{stats.cpm}</div>
            <div className="mt-1 text-xs text-stone-500">
              {t('practice.speed')} ({t('practice.speedUnit')})
            </div>
          </div>
          <div className="rounded-lg bg-stone-100 p-4">
            <div className="text-2xl font-bold">{formatTime(stats.elapsedMs)}</div>
            <div className="mt-1 text-xs text-stone-500">{t('practice.time')}</div>
          </div>
          <div className="rounded-lg bg-stone-100 p-4">
            <div className="text-2xl font-bold">{stats.errors}</div>
            <div className="mt-1 text-xs text-stone-500">{t('practice.errors')}</div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button className="btn-primary" onClick={onRetry}>{t('practice.retry')}</button>
          {onNext && (
            <button className="btn-primary" onClick={onNext}>{t('practice.next')}</button>
          )}
          <button className="btn-ghost" onClick={onBack}>{t('practice.back')}</button>
        </div>
      </div>
    </div>
  )
}
