import { useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getArticle, nextArticle } from '../data/articles'
import { useTyping, type CharStatus } from '../hooks/useTyping'
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
  const target = article?.content ?? ''

  const typing = useTyping(target)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const currentCharRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    typing.reset()
    inputRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    currentCharRef.current?.scrollIntoView({ block: 'nearest' })
  }, [typing.typed])

  if (!article) {
    return (
      <div className="py-16 text-center text-stone-500">
        <p>{t('practice.notFound')}</p>
        <Link to="/articles" className="btn-primary mt-4">{t('practice.back')}</Link>
      </div>
    )
  }

  const progress = Math.min(typing.typed.length / target.length, 1)
  const next = nextArticle(article.id)

  const restart = () => {
    typing.reset()
    if (inputRef.current) inputRef.current.value = ''
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
            {Math.min(typing.typed.length, target.length)} / {target.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-200"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Original text with per-character feedback */}
      <div
        className="card mb-4 max-h-72 overflow-y-auto p-5 text-xl leading-loose tracking-wide sm:p-6"
        onClick={() => inputRef.current?.focus()}
      >
        {Array.from(target).map((ch, i) => {
          const status = typing.statusOf(i)
          return (
            <span
              key={i}
              ref={status === 'current' ? currentCharRef : undefined}
              className={CHAR_CLS[status]}
            >
              {ch}
            </span>
          )
        })}
      </div>

      {/* Input area */}
      <textarea
        ref={inputRef}
        rows={4}
        autoFocus
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        placeholder={t('practice.inputPlaceholder')}
        className="card w-full resize-none p-5 text-xl leading-loose tracking-wide outline-none focus:border-accent focus:ring-2 focus:ring-accent-light"
        onChange={(e) =>
          typing.onChange(e.target.value, (e.nativeEvent as InputEvent).isComposing ?? false)
        }
        onCompositionStart={(e) => typing.onCompositionStart(e.currentTarget.value.length)}
        onCompositionEnd={(e) => typing.onCompositionEnd(e.currentTarget.value)}
        onPaste={(e) => e.preventDefault()}
        disabled={typing.finished}
      />
      <p className="mt-2 text-xs text-stone-400">{t('practice.imeHint')}</p>

      {typing.finished && typing.stats && (
        <ResultModal
          stats={typing.stats}
          onRetry={restart}
          onNext={next && next.id !== article.id ? () => navigate(`/practice/${next.id}`) : undefined}
          onBack={() => navigate('/articles')}
        />
      )}
    </div>
  )
}
