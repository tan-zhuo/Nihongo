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
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md p-7 sm:p-9">
        <h2 className="mb-2 text-center font-serif text-2xl font-bold text-accent-deep">
          {t('practice.resultTitle')}
        </h2>
        {newBest ? (
          <p className="mb-5 text-center">
            <span className="inline-block rounded-full bg-accent-light px-3 py-1 text-xs font-semibold tracking-wide text-accent-deep">
              {t('practice.newBest')}
            </span>
          </p>
        ) : (
          <div className="mb-5" />
        )}
        <div className="mb-7 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-accent-light p-4">
            <div className="text-3xl font-bold text-accent-deep">
              {Math.round(stats.accuracy * 100)}%
            </div>
            <div className="mt-1 text-xs text-stone-500">{t('practice.accuracy')}</div>
          </div>
          <div className="rounded-xl bg-accent-light p-4">
            <div className="text-3xl font-bold text-accent-deep">{stats.cpm}</div>
            <div className="mt-1 text-xs text-stone-500">
              {t('practice.speed')} ({t('practice.speedUnit')})
            </div>
          </div>
          <div className="rounded-xl bg-stone-50 p-4">
            <div className="text-2xl font-bold">{formatTime(stats.elapsedMs)}</div>
            <div className="mt-1 text-xs text-stone-500">{t('practice.time')}</div>
          </div>
          <div className="rounded-xl bg-stone-50 p-4">
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
