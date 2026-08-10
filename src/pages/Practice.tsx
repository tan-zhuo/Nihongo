import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getArticle, nextArticle } from '../data/articles'
import { useLineTyping, type CharStatus } from '../hooks/useTyping'
import { parseFurigana, splitSegLines, sliceSegs } from '../lib/furigana'
import { sentenceSpans, sentenceAt } from '../lib/sentences'
import { useArticleAudio } from '../hooks/useArticleAudio'
import { lookupWordAt, type WordHit } from '../lib/lookup'
import { addArticleRecord, bestForArticle } from '../lib/storage'
import ResultModal from '../components/ResultModal'

const CHAR_CLS: Record<CharStatus, string> = {
  correct: 'text-emerald-600',
  wrong: 'text-red-500 bg-red-50 rounded-sm',
  current: 'typing-current rounded-sm',
  pending: 'text-stone-400 border-b-2 border-dotted border-stone-400',
  untyped: 'text-stone-400',
}

const FURIGANA_KEY = 'nihongotype.furigana'
const TRANSLATION_KEY = 'nihongotype.translation'

export default function Practice() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const article = useMemo(() => (id ? getArticle(id) : undefined), [id])
  const content = article?.content ?? ''

  const [maxLen] = useState(() => (window.innerWidth < 640 ? 13 : 22))
  const [showFurigana, setShowFurigana] = useState(
    () => localStorage.getItem(FURIGANA_KEY) !== 'off',
  )
  const [showTrans, setShowTrans] = useState(
    () => localStorage.getItem(TRANSLATION_KEY) !== 'off',
  )

  const spans = useMemo(() => sentenceSpans(article?.trans), [article])
  const segs = useMemo(() => parseFurigana(article?.furigana, content), [article, content])
  const ranges = useMemo(() => splitSegLines(content, segs, maxLen), [content, segs, maxLen])
  const lines = useMemo(() => ranges.map((r) => content.slice(r.start, r.end)), [ranges, content])
  const lineSegs = useMemo(() => ranges.map((r) => sliceSegs(segs, r.start, r.end)), [ranges, segs])

  const typing = useLineTyping(lines)
  const audio = useArticleAudio(article?.id, article?.trans ?? [])
  const inputRef = useRef<HTMLInputElement>(null)
  const activeLineRef = useRef<HTMLDivElement>(null)
  const savedRef = useRef(false)
  const [newBest, setNewBest] = useState(false)
  const [popup, setPopup] = useState<{ x: number; y: number; hit: WordHit | null } | null>(null)

  // Any click outside a word (spans stop propagation) closes the popup.
  useEffect(() => {
    if (!popup) return
    const close = () => setPopup(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('click', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [popup])

  const onCharClick = (e: React.MouseEvent, globalIdx: number) => {
    e.stopPropagation()
    const x = e.clientX
    const y = e.clientY
    lookupWordAt(content, globalIdx, article?.words).then((hit) => setPopup({ x, y, hit }))
  }

  useEffect(() => {
    typing.reset()
    setNewBest(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Re-arm saving only after the reset has actually flushed (finished=false).
  // Resetting savedRef on id change instead would save the *previous* run's
  // stats under the next article's id during the navigation commit, creating
  // phantom records for articles never practiced.
  useEffect(() => {
    if (!typing.finished) savedRef.current = false
  }, [typing.finished])

  useEffect(() => {
    if (!typing.finished) {
      inputRef.current?.focus()
      activeLineRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [typing.lineIdx, typing.finished])

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
    setNewBest(false)
    inputRef.current?.focus()
  }
  const toggleFurigana = () => {
    setShowFurigana((v) => {
      localStorage.setItem(FURIGANA_KEY, v ? 'off' : 'on')
      return !v
    })
  }
  const toggleTrans = () => {
    setShowTrans((v) => {
      localStorage.setItem(TRANSLATION_KEY, v ? 'off' : 'on')
      return !v
    })
  }

  // Translation follows the UI language; a Japanese UI falls back to English.
  const transLang: 'zh' | 'en' = (i18n.resolvedLanguage ?? 'en').startsWith('zh') ? 'zh' : 'en'
  const cursor = ranges[typing.lineIdx]
    ? ranges[typing.lineIdx].start + typing.current.length
    : content.length - 1
  const activeSentence = sentenceAt(spans, cursor)
  const playingSpan = audio.index >= 0 ? spans[audio.index] : undefined
  const RATES = [0.75, 1, 1.25]

  // Translations sit under the line where their sentence ENDS, so the whole
  // article reads as a parallel text rather than a moving one-line caption.
  const transByLine = useMemo(() => {
    const map: (typeof spans)[] = ranges.map(() => [])
    for (const s of spans) {
      const lastChar = s.end - 1
      const li = ranges.findIndex((r) => lastChar >= r.start && lastChar < r.end)
      if (li >= 0) map[li].push(s)
    }
    return map
  }, [spans, ranges])

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/articles" className="text-sm text-stone-400 transition-colors hover:text-accent-dark">
            ← {t('practice.back')}
          </Link>
          <h1 className="font-serif text-lg font-semibold">{article.title}</h1>
          <span className="rounded-md bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent-deep">
            {article.level}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {spans.length > 0 && (
            <>
              <button
                className={`btn gap-1.5 whitespace-nowrap px-3 text-xs ${
                  audio.playing
                    ? 'border border-accent-dark bg-accent-light text-accent-deep'
                    : 'border border-stone-200 bg-white text-stone-500 hover:text-ink'
                }`}
                onClick={audio.toggle}
                aria-label={t('practice.read')}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                  {audio.playing ? (
                    <path d="M8 5h3v14H8zM13 5h3v14h-3z" />
                  ) : (
                    <path d="M7 4.5v15l12-7.5z" />
                  )}
                </svg>
                {t('practice.read')}
              </button>
              {audio.playing && (
                <button
                  className="btn whitespace-nowrap border border-stone-200 bg-white px-2.5 text-xs text-stone-500 hover:text-ink"
                  onClick={() => audio.setRate(RATES[(RATES.indexOf(audio.rate) + 1) % RATES.length])}
                >
                  {audio.rate}×
                </button>
              )}
            </>
          )}
          <button
            className={`btn whitespace-nowrap px-3 text-xs ${
              showFurigana
                ? 'border border-accent-dark bg-accent-light text-accent-deep'
                : 'border border-stone-200 bg-white text-stone-400 hover:text-ink'
            }`}
            onClick={toggleFurigana}
          >
            {t('practice.furigana')}
          </button>
          {spans.length > 0 && (
            <button
              className={`btn whitespace-nowrap px-3 text-xs ${
                showTrans
                  ? 'border border-accent-dark bg-accent-light text-accent-deep'
                  : 'border border-stone-200 bg-white text-stone-400 hover:text-ink'
              }`}
              onClick={toggleTrans}
            >
              {t('practice.translation')}
            </button>
          )}
          <button className="btn-ghost whitespace-nowrap px-3 text-xs" onClick={restart}>
            {t('practice.restart')}
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-1.5 flex justify-between text-xs text-stone-400">
          <span>{t('practice.progress')}</span>
          <span>
            {Math.min(typing.typedTotal, typing.totalChars)} / {typing.totalChars}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-accent-dark transition-[width] duration-200"
            style={{ width: `${Math.min(typing.typedTotal / typing.totalChars, 1) * 100}%` }}
          />
        </div>
      </div>

      {/* Line pairs: original (with ruby) + input line directly beneath, full height */}
      <div onClick={() => inputRef.current?.focus()}>
        {lines.map((line, li) => {
          const isPast = li < typing.lineIdx
          const isActive = li === typing.lineIdx && !typing.finished
          return (
            <div
              key={li}
              ref={isActive ? activeLineRef : undefined}
              // No opacity dimming: untyped characters are already muted, and
              // fading whole lines would make the translations unreadable.
              className="mb-9"
            >
              {/* Original line with furigana; tap any word to look it up */}
              <div className="cursor-pointer text-xl leading-normal tracking-wide sm:text-2xl">
                {lineSegs[li].map((seg, si) => {
                  const chars = Array.from(seg.text).map((ch, ci) => {
                    const global = seg.start + ci
                    const inLine = global - ranges[li].start
                    const reading =
                      playingSpan && global >= playingSpan.start && global < playingSpan.end
                    return (
                      <span
                        key={ci}
                        className={`${CHAR_CLS[typing.statusOf(li, inLine)]}${
                          reading ? ' bg-amber-100/70 rounded-sm' : ''
                        }`}
                        onClick={(e) => onCharClick(e, global)}
                      >
                        {ch}
                      </span>
                    )
                  })
                  return seg.ruby && showFurigana ? (
                    <ruby key={si} className="[&>rt]:select-none [&>rt]:text-[0.55rem] [&>rt]:font-sans [&>rt]:text-stone-400">
                      {chars}
                      <rt>{seg.ruby}</rt>
                    </ruby>
                  ) : (
                    <span key={si}>{chars}</span>
                  )
                })}
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
                  placeholder={
                    typing.lineIdx === 0 && typing.current === ''
                      ? t('practice.inputPlaceholder')
                      : ''
                  }
                  className="mt-1.5 w-full border-b-2 border-accent-dark/70 bg-transparent py-1.5 text-xl leading-normal tracking-wide outline-none transition-colors placeholder:text-sm placeholder:text-stone-300 focus:border-accent-dark sm:text-2xl"
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
                <div className="mt-1.5 border-b border-stone-200 py-1.5 text-xl leading-normal tracking-wide sm:text-2xl">
                  {Array.from(typing.done[li] ?? '').map((ch, ci) => (
                    <span
                      key={ci}
                      className={
                        ch === line[ci] ? 'text-emerald-600' : 'text-red-500 bg-red-50 rounded-sm'
                      }
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              ) : (
                // Short placeholder: a full-height empty slot would push a line's
                // translation closer to the NEXT line than to its own.
                <div className="mt-2 h-7 border-b border-dashed border-stone-200" />
              )}
              {showTrans &&
                transByLine[li].map((s) => (
                  <p
                    key={s.start}
                    className={`mt-2.5 border-l-2 pl-3 text-sm leading-relaxed transition-colors ${
                      s === activeSentence
                        ? 'border-accent-dark text-stone-600'
                        : 'border-stone-200 text-stone-400'
                    }`}
                  >
                    {s[transLang]}
                  </p>
                ))}
            </div>
          )
        })}
      </div>
      <p className="pb-4 text-xs text-stone-400">
        {t('practice.tapWordHint')} {t('practice.imeHint')}
      </p>

      {popup && (
        <div
          className="card fixed z-30 w-64 p-4"
          style={{
            left: Math.max(8, Math.min(popup.x - 40, window.innerWidth - 272)),
            top: Math.min(popup.y + 16, window.innerHeight - 140),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {popup.hit ? (
            <>
              <p className="mb-1 font-serif text-lg font-bold">
                {popup.hit.w}
                <span className="ml-2 text-sm font-normal text-stone-400">{popup.hit.r}</span>
              </p>
              <p className="text-sm leading-relaxed">{popup.hit.zh}</p>
              <p className="text-sm leading-relaxed text-stone-500">{popup.hit.en}</p>
            </>
          ) : (
            <p className="text-sm text-stone-400">{t('practice.noEntry')}</p>
          )}
        </div>
      )}

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
