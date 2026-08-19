import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { speak } from '../lib/tts'
import { grade } from '../lib/srs'
import type { ChoiceQuestion } from '../lib/wordquiz'
import type { TextbookWord } from '../types'

const KEYS = ['1', '2', '3', '4', '5', '6']

interface Props {
  questions: ChoiceQuestion[]
  zhFirst: boolean
  onFinish: (result: { correct: number; total: number; missed: TextbookWord[] }) => void
}

/** Right answers move on by themselves; wrong ones stop and show the answer. */
export default function WordChoice({ questions, zhFirst, onFinish }: Props) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const correctRef = useRef(0)
  const missedRef = useRef<TextbookWord[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const q = questions[index]

  useEffect(() => {
    setIndex(0)
    setPicked(null)
    correctRef.current = 0
    missedRef.current = []
  }, [questions])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const advance = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (index + 1 >= questions.length) {
      onFinish({ correct: correctRef.current, total: questions.length, missed: missedRef.current })
    } else {
      setPicked(null)
      setIndex((i) => i + 1)
    }
  }, [index, questions.length, onFinish])

  const pick = useCallback(
    (i: number) => {
      if (!q || picked !== null) return
      const ok = i === q.answer
      setPicked(i)
      grade(q.word.id, ok)
      speak(q.word.r)
      if (ok) {
        correctRef.current++
        timerRef.current = setTimeout(advance, 650)
      } else {
        missedRef.current.push(q.word)
      }
    },
    [q, picked, advance],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (picked === null) {
        const i = KEYS.indexOf(e.key)
        if (i !== -1 && q && i < q.options.length) {
          e.preventDefault()
          pick(i)
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [picked, pick, advance, q])

  if (!q) return null

  const wrong = picked !== null && picked !== q.answer
  const promptClass =
    q.kind === 'meaning2ja'
      ? 'text-2xl font-semibold leading-snug sm:text-3xl'
      : 'font-serif text-4xl font-bold sm:text-5xl'

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-stone-400">
        <span>{index + 1} / {questions.length}</span>
        <span>{t(`textbook.kind.${q.kind}`)}</span>
      </div>
      <div className="mb-5 h-1 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>

      <div className="card p-6 sm:p-8">
        <div className="mb-7 text-center">
          <div className={promptClass}>{q.prompt}</div>
          {q.kind === 'ja2meaning' && q.word.r !== q.word.w && picked !== null && (
            <div className="mt-2 text-sm text-stone-400">{q.word.r}</div>
          )}
        </div>

        <div className="grid gap-2.5">
          {q.options.map((opt, i) => {
            const isAnswer = i === q.answer
            const isPicked = i === picked
            let cls = 'border-stone-200 bg-white hover:border-accent hover:bg-accent-light/40'
            if (picked !== null) {
              if (isAnswer) cls = 'border-emerald-400 bg-emerald-50 text-emerald-800'
              else if (isPicked) cls = 'border-red-300 bg-red-50 text-red-700'
              else cls = 'border-stone-200 bg-white text-stone-400'
            }
            return (
              <button
                key={i}
                disabled={picked !== null}
                onClick={() => pick(i)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-150 ${cls}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-stone-100 text-xs font-medium text-stone-500">
                  {i + 1}
                </span>
                <span className={q.kind === 'ja2meaning' ? 'text-base' : 'font-serif text-lg'}>
                  {opt}
                </span>
              </button>
            )
          })}
        </div>

        {wrong && (
          <div className="mt-5 rounded-xl bg-stone-50 p-4 text-center text-sm">
            <div className="font-serif text-xl font-bold">{q.word.w}</div>
            {q.word.r !== q.word.w && <div className="text-stone-500">{q.word.r}</div>}
            <div className="mt-1">{zhFirst ? q.word.zh : q.word.en}</div>
            <button className="btn-primary mt-4" onClick={advance}>
              {t('textbook.next')}
            </button>
          </div>
        )}
      </div>

      <p className="mt-4 hidden text-center text-xs text-stone-300 sm:block">
        {t('textbook.choiceHint')}
      </p>
    </div>
  )
}
