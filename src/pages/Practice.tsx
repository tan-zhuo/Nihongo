import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getArticle, nextArticle } from '../data/articles'
import { useLineTyping, splitLines, type CharStatus } from '../hooks/useTyping'
import { addArticleRecord, bestForArticle } from '../lib/storage'
import ResultModal from '../components/ResultModal'

const CHAR_CLS: Record<CharStatus, string> = {
  correct: 'text-emerald-600',
  wrong: 'text-red-500 bg-red-50 rounded-sm',
  current: 'typing-current rounded-sm',
  pending: 'text-stone-400 border-b-2 border-dotted border-stone-400',
  untyped: 'text-stone-400',
}

export default function Practice() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const article = useMemo(() => (id ? getArticle(id) : undefined), [id])
  const lines = useMemo(() => splitLines(article?.content ?? ''), [article])

  const typing = useLineTyping(lines)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeLineRef = useRef<HTMLDivElement>(null)
  const savedRef = useRef(false)
  const [newBest, setNewBest] = useState(false)

  useEffect(() => {
    typing.reset()
    savedRef.current = false
    setNewBest(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Persist the result once per finished run.
  useEffect(() => {
    if (!typing.finished || !typing.stats || !article || savedRef.current) return
    savedRef.current = true
    const prev = bestForArticle(article.id)
    const { accuracy, cpm, elapsedMs, errors } = typing.stats
    setNewBest(
      !prev || accuracy > prev.accuracy || (accuracy === prev.accuracy && cpm > prev.cpm),
    )
    addArticleRecord({
      articleId: article.id,
      level: article.level,
      ts: Date.now(),
      accuracy,
      cpm,
      timeMs: elapsedMs,
      errors,
    })
  }, [typing.finished, typing.stats, article])

  // Keep focus on the active line's input and keep it in view.
  useEffect(() => {
    if (!typing.finished) {
      inputRef.current?.focus()
      activeLineRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [typing.lineIdx, typing.finished])

  if (!article) {
    return (
      <div className="py-16 text-center text-stone-500">
        <p>{t('practice.notFound')}</p>
        <Link to="/articles" className="btn-primary mt-4">{t('practice.back')}</Link>
      </div>
    )
  }

  const next = nextArticle(article.id)
  const restart = () => {
    typing.reset()
    savedRef.current = false
    setNewBest(false)
    inputRef.current?.focus()
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link to="/articles" className="text-sm text-stone-500 hover:text-accent">
            ← {t('practice.back')}
          </Link>
          <h1 className="text-lg font-bold">{article.title}</h1>
          <span className="rounded bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent-dark">
            {article.level}
          </span>
        </div>
        <button className="btn-ghost text-xs" onClick={restart}>
          {t('practice.restart')}
        </button>
      </div>

      <div className="mb-4">
        <div className="mb-1 flex justify-between text-xs text-stone-500">
          <span>{t('practice.progress')}</span>
          <span>
            {Math.min(typing.typedTotal, typing.totalChars)} / {typing.totalChars}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-200"
            style={{ width: `${Math.min(typing.typedTotal / typing.totalChars, 1) * 100}%` }}
          />
        </div>
      </div>

      {/* Line pairs: original line + input line directly beneath it */}
      <div
        className="card max-h-[60vh] overflow-y-auto p-5 sm:p-6"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line, li) => {
          const isPast = li < typing.lineIdx
          const isActive = li === typing.lineIdx && !typing.finished
          return (
            <div
              key={li}
              ref={isActive ? activeLineRef : undefined}
              className={`mb-4 last:mb-0 ${isActive ? '' : 'opacity-90'}`}
            >
              {/* Original line */}
              <div className="text-xl leading-relaxed tracking-wide">
                {Array.from(line).map((ch, ci) => (
                  <span key={ci} className={CHAR_CLS[typing.statusOf(li, ci)]}>
                    {ch}
                  </span>
                ))}
              </div>
              {/* Input line */}
              {isActive ? (
                <input
                  ref={inputRef}
                  value={typing.current}
                  autoFocus
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  placeholder={typing.lineIdx === 0 && typing.current === '' ? t('practice.inputPlaceholder') : ''}
                  className="w-full border-b-2 border-accent bg-accent-light/40 px-0.5 py-1 text-xl leading-relaxed tracking-wide outline-none placeholder:text-sm placeholder:text-stone-400"
                  onChange={(e) =>
                    typing.handleChange(
                      e.target.value,
                      (e.nativeEvent as InputEvent).isComposing ?? false,
                    )
                  }
                  onCompositionStart={(e) => typing.onCompositionStart(e.currentTarget.value.length)}
                  onCompositionEnd={(e) => typing.onCompositionEnd(e.currentTarget.value)}
                  onPaste={(e) => e.preventDefault()}
                />
              ) : isPast ? (
                <div className="border-b border-stone-200 px-0.5 py-1 text-xl leading-relaxed tracking-wide">
                  {Array.from(typing.done[li] ?? '').map((ch, ci) => (
                    <span
                      key={ci}
                      className={ch === line[ci] ? 'text-emerald-600' : 'text-red-500 bg-red-50 rounded-sm'}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="border-b border-dashed border-stone-200 py-1 text-xl leading-relaxed">
                  &nbsp;
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-stone-400">{t('practice.imeHint')}</p>

      {typing.finished && typing.stats && (
        <ResultModal
          stats={typing.stats}
          newBest={newBest}
          onRetry={restart}
          onNext={next && next.id !== article.id ? () => navigate(`/practice/${next.id}`) : undefined}
          onBack={() => navigate('/articles')}
        />
      )}
    </div>
  )
}
