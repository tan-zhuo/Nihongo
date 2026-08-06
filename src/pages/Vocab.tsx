import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { vocab } from '../data/vocab'
import LevelFilter from '../components/LevelFilter'
import { KANA_ROWS, rowOfReading, meaningMatches, type RowKey } from '../lib/kana'
import type { Level, VocabWord } from '../types'

const SESSION_SIZE = 20

type Mode = 'toJa' | 'toMeaning'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function kataToHira(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
}

export default function Vocab() {
  const { t, i18n } = useTranslation()
  const [level, setLevel] = useState<Level | 'all'>('all')
  const [row, setRow] = useState<RowKey | 'all'>('all')
  const [mode, setMode] = useState<Mode>('toJa')
  const [seed, setSeed] = useState(0)

  const pool = useMemo(() => {
    let list = vocab
    if (level !== 'all') list = list.filter((w) => w.level === level)
    if (row !== 'all') list = list.filter((w) => rowOfReading(w.reading) === row)
    return list
  }, [level, row])

  const session = useMemo(
    () => shuffle(pool).slice(0, SESSION_SIZE),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, mode, seed],
  )

  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<'ok' | 'ng' | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIndex(0)
    setInput('')
    setFeedback(null)
    setCorrectCount(0)
    inputRef.current?.focus()
  }, [session])

  const word: VocabWord | undefined = session[index]
  const done = session.length > 0 && index >= session.length
  const zhFirst = (i18n.resolvedLanguage ?? 'en').startsWith('zh')

  const check = () => {
    if (!word || !input.trim()) return
    let ok: boolean
    if (mode === 'toJa') {
      const given = kataToHira(input.trim())
      ok = given === kataToHira(word.word) || given === kataToHira(word.reading)
    } else {
      ok = meaningMatches(input, word.meaning_zh, word.meaning_en)
    }
    if (ok) setCorrectCount((c) => c + 1)
    setFeedback(ok ? 'ok' : 'ng')
  }

  const advance = () => {
    setIndex((i) => i + 1)
    setInput('')
    setFeedback(null)
    inputRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    e.preventDefault()
    if (feedback) advance()
    else check()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{t('vocab.title')}</h1>

      {/* Mode toggle */}
      <div className="mb-4 flex gap-2">
        {(['toJa', 'toMeaning'] as Mode[]).map((m) => (
          <button key={m} className={mode === m ? 'chip-on' : 'chip-off'} onClick={() => setMode(m)}>
            {t(m === 'toJa' ? 'vocab.modeToJa' : 'vocab.modeToMeaning')}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-2 flex items-center gap-2 text-sm text-stone-500">
        <span className="w-20 shrink-0">{t('vocab.level')}</span>
        <LevelFilter value={level} onChange={setLevel} />
      </div>
      <div className="mb-6 flex items-start gap-2 text-sm text-stone-500">
        <span className="mt-1 w-20 shrink-0">{t('vocab.row')}</span>
        <div className="flex flex-wrap gap-2">
          <button className={row === 'all' ? 'chip-on' : 'chip-off'} onClick={() => setRow('all')}>
            {t('vocab.all')}
          </button>
          {KANA_ROWS.map((r) => (
            <button key={r.key} className={row === r.key ? 'chip-on' : 'chip-off'} onClick={() => setRow(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {session.length === 0 ? (
        <p className="py-12 text-center text-stone-400">{t('vocab.empty')}</p>
      ) : done ? (
        <div className="card p-8 text-center">
          <h2 className="mb-2 text-xl font-bold text-accent-dark">{t('vocab.sessionDone')}</h2>
          <p className="mb-6 text-3xl font-bold">
            {t('vocab.scoreOf', { correct: correctCount, total: session.length })}
          </p>
          <button className="btn-primary" onClick={() => setSeed((s) => s + 1)}>
            {t('vocab.again')}
          </button>
        </div>
      ) : word ? (
        <div className="card p-6 sm:p-8">
          <div className="mb-1 flex items-center justify-between text-xs text-stone-400">
            <span>
              {index + 1} / {session.length}
            </span>
            <span>
              {t('vocab.score')}: {correctCount}
            </span>
          </div>

          {/* Prompt */}
          <div className="my-6 text-center">
            {mode === 'toJa' ? (
              <>
                <div className="mb-2 text-2xl font-bold sm:text-3xl">
                  {zhFirst ? word.meaning_zh : word.meaning_en}
                </div>
                <div className="text-sm text-stone-400">
                  {zhFirst ? word.meaning_en : word.meaning_zh} ·{' '}
                  {t(`vocab.pos.${word.pos}`, { defaultValue: word.pos })}
                </div>
                <p className="mt-4 text-xs text-stone-400">{t('vocab.promptToJa')}</p>
              </>
            ) : (
              <>
                <div className="mb-2 text-3xl font-bold sm:text-4xl">{word.word}</div>
                <div className="text-stone-500">{word.reading}</div>
                <p className="mt-4 text-xs text-stone-400">{t('vocab.promptToMeaning')}</p>
              </>
            )}
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`mb-4 rounded-lg p-3 text-center text-sm ${
                feedback === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
              }`}
            >
              <span className="font-bold">
                {feedback === 'ok' ? t('vocab.correct') : t('vocab.incorrect')}
              </span>
              {'　'}
              {t('vocab.answer')}: {word.word}（{word.reading}）
              {mode === 'toMeaning' && ` — ${zhFirst ? word.meaning_zh : word.meaning_en}`}
            </div>
          )}

          <input
            ref={inputRef}
            value={input}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            placeholder={t('vocab.inputPlaceholder')}
            className="mb-4 w-full rounded-lg border border-stone-300 p-3 text-center text-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent-light"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={(e) => e.preventDefault()}
            readOnly={feedback !== null}
          />
          <div className="flex justify-center gap-2">
            {feedback ? (
              <button className="btn-primary" onClick={advance}>{t('vocab.nextWord')}</button>
            ) : (
              <>
                <button className="btn-primary" onClick={check}>{t('vocab.check')}</button>
                <button
                  className="btn-ghost"
                  onClick={() => setFeedback('ng')}
                >
                  {t('vocab.skip')}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
