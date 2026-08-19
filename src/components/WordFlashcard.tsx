import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { speak } from '../lib/tts'
import { boxOf, grade, MAX_BOX } from '../lib/srs'
import type { TextbookWord } from '../types'

export type CardDirection = 'ja2meaning' | 'meaning2ja'

interface Props {
  words: TextbookWord[]
  direction: CardDirection
  zhFirst: boolean
  onFinish: (result: { correct: number; total: number; missed: TextbookWord[] }) => void
}

function PosBadge({ word }: { word: TextbookWord }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-500">
      {t(`vocab.pos.${word.p}`, { defaultValue: word.p })}
      {word.g && <span className="font-medium text-accent-dark">{t('textbook.verbGroup', { n: word.g })}</span>}
    </span>
  )
}

/** Five dots showing how firmly a word is lodged in the Leitner boxes. */
function BoxDots({ box }: { box: number }) {
  return (
    <span className="inline-flex gap-1" aria-hidden>
      {Array.from({ length: MAX_BOX }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i < box ? 'bg-accent-dark' : 'bg-stone-200'}`}
        />
      ))}
    </span>
  )
}

export default function WordFlashcard({ words, direction, zhFirst, onFinish }: Props) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const correctRef = useRef(0)
  const missedRef = useRef<TextbookWord[]>([])

  const word = words[index]

  useEffect(() => {
    setIndex(0)
    setFlipped(false)
    correctRef.current = 0
    missedRef.current = []
  }, [words])

  const say = useCallback((w: TextbookWord) => speak(w.r), [])

  const flip = useCallback(() => {
    setFlipped((f) => {
      if (!f && word) say(word)
      return !f
    })
  }, [word, say])

  const answer = useCallback(
    (ok: boolean) => {
      if (!word) return
      grade(word.id, ok)
      if (ok) correctRef.current++
      else missedRef.current.push(word)
      if (index + 1 >= words.length) {
        onFinish({ correct: correctRef.current, total: words.length, missed: missedRef.current })
      } else {
        setFlipped(false)
        setIndex((i) => i + 1)
      }
    },
    [word, index, words.length, onFinish],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (flipped) answer(true)
        else flip()
      } else if (flipped && (e.key === '1' || e.key === '2')) {
        e.preventDefault()
        answer(e.key === '2')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, flip, answer])

  if (!word) return null

  const front = direction === 'ja2meaning'
    ? <span className="font-serif text-5xl font-bold leading-tight sm:text-6xl">{word.w}</span>
    : (
      <span className="text-3xl font-semibold leading-snug sm:text-4xl">
        {zhFirst ? word.zh : word.en}
      </span>
    )

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-stone-400">
        <span>{index + 1} / {words.length}</span>
        <BoxDots box={boxOf(word.id)} />
      </div>
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${(index / words.length) * 100}%` }}
        />
      </div>

      <div className="flip-scene">
        <div
          className={`flip-card ${flipped ? 'is-flipped' : ''}`}
          onClick={flip}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault()
          }}
        >
          {/* front */}
          <div className="flip-face card flex min-h-[19rem] cursor-pointer select-none flex-col items-center justify-center gap-4 p-8 text-center sm:min-h-[22rem]">
            {front}
            <PosBadge word={word} />
            <span className="mt-2 text-xs text-stone-300">{t('textbook.tapToFlip')}</span>
          </div>

          {/* back */}
          <div className="flip-face flip-face-back card flex min-h-[19rem] cursor-pointer select-none flex-col items-center justify-center gap-2 p-8 text-center sm:min-h-[22rem]">
            <span className="font-serif text-4xl font-bold sm:text-5xl">{word.w}</span>
            {word.r !== word.w && <span className="text-lg text-stone-500">{word.r}</span>}
            <span className="mt-2 text-xl font-medium">{zhFirst ? word.zh : word.en}</span>
            <span className="text-sm text-stone-400">{zhFirst ? word.en : word.zh}</span>
            <span className="mt-2">
              <PosBadge word={word} />
            </span>
            <button
              className="mt-1 text-xs text-accent-dark underline decoration-accent-light underline-offset-4 hover:text-accent-deep"
              onClick={(e) => {
                e.stopPropagation()
                say(word)
              }}
            >
              {t('vocab.playAudio')} ♪
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-center gap-3">
        {flipped ? (
          <>
            <button className="btn-ghost min-w-32 text-red-600" onClick={() => answer(false)}>
              {t('textbook.missed')}
            </button>
            <button className="btn-primary min-w-32" onClick={() => answer(true)}>
              {t('textbook.gotIt')}
            </button>
          </>
        ) : (
          <button className="btn-primary min-w-40" onClick={flip}>
            {t('textbook.showAnswer')}
          </button>
        )}
      </div>
      <p className="mt-4 hidden text-center text-xs text-stone-300 sm:block">
        {flipped ? t('textbook.cardHintGrade') : t('textbook.cardHintFlip')}
      </p>
    </div>
  )
}
