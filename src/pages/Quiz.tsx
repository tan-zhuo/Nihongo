import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { quizQuestions } from '../data/quiz'
import LevelFilter from '../components/LevelFilter'
import { addQuizRecord, loadRecords } from '../lib/storage'
import { usePageMeta } from '../hooks/usePageMeta'
import { LEVELS, type Level, type QuizQuestion, type QuizSection } from '../types'

const SESSION_SIZE = 20

type SectionFilter = 'all' | QuizSection

const SECTIONS: SectionFilter[] = ['all', 'vocab', 'grammar', 'reading']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const CIRCLED = ['①', '②', '③', '④']

/** Highlight 【target】 spans in a stem. */
function Stem({ text }: { text: string }) {
  const parts = text.split(/(【[^】]*】)/)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('【') ? (
          <span key={i} className="font-semibold text-accent-deep underline decoration-accent decoration-2 underline-offset-4">
            {p.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

export default function Quiz() {
  usePageMeta('/quiz')
  const { t, i18n } = useTranslation()
  const zhFirst = (i18n.resolvedLanguage ?? 'en').startsWith('zh')
  const [level, setLevel] = useState<Level | 'all'>('N5')
  const [section, setSection] = useState<SectionFilter>('all')
  const [seed, setSeed] = useState(0)

  const pool = useMemo(() => {
    let list = quizQuestions
    if (level !== 'all') list = list.filter((q) => q.level === level)
    if (section !== 'all') list = list.filter((q) => q.section === section)
    return list
  }, [level, section])

  const session = useMemo(
    () => shuffle(pool).slice(0, SESSION_SIZE),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, seed],
  )

  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const savedRef = useRef(false)

  useEffect(() => {
    setIndex(0)
    setPicked(null)
    setCorrectCount(0)
    savedRef.current = false
  }, [session])

  const q: QuizQuestion | undefined = session[index]
  const done = session.length > 0 && index >= session.length

  useEffect(() => {
    if (!done || savedRef.current) return
    savedRef.current = true
    addQuizRecord({ ts: Date.now(), level, section, correct: correctCount, total: session.length })
  }, [done, level, section, correctCount, session.length])

  // Lifetime accuracy per level, so progress toward the next level is visible.
  const mastery = useMemo(() => {
    const recs = loadRecords().quiz
    return LEVELS.map((lv) => {
      const list = recs.filter((r) => r.level === lv)
      const total = list.reduce((n, r) => n + r.total, 0)
      const correct = list.reduce((n, r) => n + r.correct, 0)
      return { level: lv, total, pct: total > 0 ? correct / total : null }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, session])

  const pick = (i: number) => {
    if (!q || picked !== null) return
    setPicked(i)
    if (i === q.answer) setCorrectCount((c) => c + 1)
  }

  const advance = () => {
    setPicked(null)
    setIndex((i) => i + 1)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (picked === null && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        pick(Number(e.key) - 1)
      } else if (picked !== null && e.key === 'Enter') {
        e.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, q])

  const instKey = q ? `quiz.inst_${q.type.replace(/-/g, '_')}` : ''

  const optionCls = (i: number) => {
    if (picked === null)
      return 'border-stone-200 bg-white hover:border-accent hover:bg-accent-light/40'
    if (i === q!.answer) return 'border-emerald-400 bg-emerald-50'
    if (i === picked) return 'border-red-300 bg-red-50'
    return 'border-stone-200 bg-white opacity-60'
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 font-serif text-2xl font-bold">{t('quiz.title')}</h1>
      <p className="mb-6 text-sm leading-relaxed text-stone-500">{t('quiz.subtitle')}</p>

      {/* Filters */}
      <div className="mb-3 flex flex-col gap-1.5 text-sm text-stone-500 sm:flex-row sm:items-center sm:gap-2">
        <span className="text-xs sm:w-20 sm:shrink-0 sm:text-sm">{t('quiz.level')}</span>
        <LevelFilter value={level} onChange={setLevel} />
      </div>
      <div className="mb-6 flex flex-col gap-1.5 text-sm text-stone-500 sm:flex-row sm:items-center sm:gap-2">
        <span className="text-xs sm:w-20 sm:shrink-0 sm:text-sm">{t('quiz.section')}</span>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <button
              key={s}
              className={section === s ? 'chip-on' : 'chip-off'}
              onClick={() => setSection(s)}
            >
              {t(`quiz.sec_${s}`)}
            </button>
          ))}
        </div>
      </div>

      {session.length === 0 && (
        <p className="py-10 text-center text-stone-400">{t('quiz.empty')}</p>
      )}

      {q && !done && (
        <div className="card p-6 sm:p-8">
          <div className="mb-4 flex items-center justify-between text-xs text-stone-400">
            <span>{t('quiz.questionOf', { n: index + 1, total: session.length })}</span>
            <span className="rounded-full bg-accent-light px-2.5 py-0.5 font-medium text-accent-deep">
              {q.level} · {t(`quiz.sec_${q.section}`)}
            </span>
          </div>

          <p className="mb-3 text-sm font-medium text-stone-500">{t(instKey)}</p>

          {q.passage && (
            <div className="mb-4 whitespace-pre-wrap rounded-lg border border-stone-200 bg-stone-50 p-4 text-[15px] leading-loose">
              {q.passage}
            </div>
          )}

          <p className="mb-6 text-lg leading-loose">
            <Stem text={q.question} />
          </p>

          <div className="flex flex-col gap-2.5">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={picked !== null}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left leading-relaxed transition-colors duration-150 ${optionCls(i)}`}
              >
                <span
                  className={`mt-0.5 shrink-0 text-sm font-semibold ${
                    picked !== null && i === q.answer ? 'text-emerald-600' : 'text-stone-400'
                  }`}
                >
                  {CIRCLED[i]}
                </span>
                <span>{opt}</span>
              </button>
            ))}
          </div>

          {picked !== null && (
            <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p
                className={`mb-2 text-sm font-semibold ${
                  picked === q.answer ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {picked === q.answer ? t('quiz.correct') : t('quiz.incorrect')}
                {picked !== q.answer && (
                  <span className="ml-2 font-normal text-stone-500">
                    {t('quiz.answerLabel')}: {CIRCLED[q.answer]} {q.options[q.answer]}
                  </span>
                )}
              </p>
              <p className="text-sm leading-relaxed text-stone-600">
                <span className="mr-1 font-medium text-stone-400">{t('quiz.explanation')}:</span>
                {zhFirst ? q.expl_zh : q.expl_en}
              </p>
              <button className="btn-primary mt-4 text-sm" onClick={advance}>
                {index + 1 >= session.length ? t('quiz.finish') : t('quiz.next')}
              </button>
            </div>
          )}

          <p className="mt-5 hidden text-center text-xs text-stone-300 sm:block">{t('quiz.keyHint')}</p>
        </div>
      )}

      {done && (
        <div className="card p-8 text-center">
          <h2 className="mb-2 font-serif text-xl font-bold">{t('quiz.sessionDone')}</h2>
          <p className="mb-6 text-3xl font-bold text-accent-deep">
            {correctCount} <span className="text-lg font-normal text-stone-400">/ {session.length}</span>
          </p>
          <button className="btn-primary" onClick={() => setSeed((n) => n + 1)}>
            {t('quiz.again')}
          </button>
        </div>
      )}

      {/* Per-level lifetime accuracy */}
      {mastery.some((m) => m.pct !== null) && (
        <div className="card mt-8 p-6">
          <h2 className="mb-1 font-serif text-base font-bold">{t('quiz.mastery')}</h2>
          <p className="mb-4 text-xs text-stone-400">{t('quiz.masteryHint')}</p>
          <div className="flex flex-col gap-2.5">
            {mastery.map((m) => (
              <div key={m.level} className="flex items-center gap-3 text-sm">
                <span className="w-8 shrink-0 font-medium text-stone-500">{m.level}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                  {m.pct !== null && (
                    <div
                      className={`h-full rounded-full ${m.pct >= 0.8 ? 'bg-emerald-400' : 'bg-accent'}`}
                      style={{ width: `${Math.round(m.pct * 100)}%` }}
                    />
                  )}
                </div>
                <span className="w-12 shrink-0 text-right text-xs text-stone-400">
                  {m.pct !== null ? `${Math.round(m.pct * 100)}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
