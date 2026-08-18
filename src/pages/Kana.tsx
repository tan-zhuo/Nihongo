import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SECTIONS, allCells, type KanaCell, type KanaSection } from '../data/kana'
import { addKanaRecord } from '../lib/storage'
import { speakKana, playKanaSequence } from '../lib/tts'
import manifest from '../data/audio-manifest.json'
import { usePageMeta } from '../hooks/usePageMeta'

const KANA_AUDIO: readonly string[] = manifest.kana ?? []

type Script = 'hiragana' | 'katakana'

const SESSION_SIZE = 20
const SCRIPT_KEY = 'nihongotype.kana.script'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Kana() {
  usePageMeta('/kana')
  const { t } = useTranslation()
  const [script, setScript] = useState<Script>(
    () => (localStorage.getItem(SCRIPT_KEY) === 'katakana' ? 'katakana' : 'hiragana'),
  )
  const [practicing, setPracticing] = useState(false)
  const [practiceSet, setPracticeSet] = useState<KanaSection | 'all'>('all')
  const [seed, setSeed] = useState(0)
  const [playingRow, setPlayingRow] = useState<string | null>(null)
  const [playingIdx, setPlayingIdx] = useState(-1)
  const cancelRow = useRef<(() => void) | null>(null)

  // Never let a row keep playing after leaving the chart.
  useEffect(() => () => cancelRow.current?.(), [])

  const playRow = (name: string, cells: KanaCell[]) => {
    cancelRow.current?.()
    if (playingRow === name) {
      setPlayingRow(null)
      return
    }
    setPlayingRow(name)
    cancelRow.current = playKanaSequence(
      cells.map((c) => ({ kana: script === 'hiragana' ? c.h : c.k, key: c.r[0] })),
      KANA_AUDIO,
      (i) => {
        setPlayingIdx(i)
        if (i === -1) setPlayingRow(null)
      },
    )
  }

  const setScriptPersist = (s: Script) => {
    setScript(s)
    localStorage.setItem(SCRIPT_KEY, s)
  }

  // ---- practice state ----
  const session = useMemo(
    () =>
      shuffle(allCells(practiceSet === 'all' ? undefined : [practiceSet])).slice(0, SESSION_SIZE),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [practiceSet, practicing, seed],
  )
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<'ok' | 'ng' | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const savedRef = useRef(false)

  useEffect(() => {
    setIndex(0)
    setInput('')
    setFeedback(null)
    setCorrectCount(0)
    savedRef.current = false
    inputRef.current?.focus()
  }, [session])

  const cell: KanaCell | undefined = session[index]
  const done = session.length > 0 && index >= session.length

  // Persist the session result once when it completes.
  useEffect(() => {
    if (!done || savedRef.current) return
    savedRef.current = true
    addKanaRecord({ ts: Date.now(), script, set: practiceSet, correct: correctCount, total: session.length })
  }, [done, script, practiceSet, correctCount, session.length])
  const glyph = (kc: KanaCell) => (script === 'hiragana' ? kc.h : kc.k)

  const check = () => {
    if (!cell || !input.trim()) return
    const ok = cell.r.includes(input.trim().toLowerCase())
    if (ok) setCorrectCount((n) => n + 1)
    setFeedback(ok ? 'ok' : 'ng')
    speakKana(glyph(cell), cell.r[0], KANA_AUDIO)
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

  const scriptToggle = (
    <div className="flex gap-2">
      {(['hiragana', 'katakana'] as Script[]).map((s) => (
        <button
          key={s}
          className={`${script === s ? 'chip-on' : 'chip-off'} flex-1 justify-center whitespace-nowrap sm:flex-none`}
          onClick={() => setScriptPersist(s)}
        >
          {t(`kana.${s}`)}
        </button>
      ))}
    </div>
  )

  // ---- practice view ----
  if (practicing) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="font-serif text-2xl font-bold">{t('kana.practice')}</h1>
          <div className="flex gap-2">
            <Link to="/kana/convert" className="btn-ghost text-xs">
              {t('kana.convertEntry')}
            </Link>
            <button className="btn-ghost text-xs" onClick={() => setPracticing(false)}>
              {t('kana.backToChart')}
            </button>
          </div>
        </div>
        <div className="mb-3">{scriptToggle}</div>
        <div className="mb-6 flex flex-wrap gap-2">
          {(['all', 'seion', 'dakuon', 'yoon'] as const).map((s) => (
            <button
              key={s}
              className={practiceSet === s ? 'chip-on' : 'chip-off'}
              onClick={() => setPracticeSet(s)}
            >
              {s === 'all' ? t('vocab.all') : t(`kana.${s}`)}
            </button>
          ))}
        </div>

        {done ? (
          <div className="card p-8 text-center">
            <h2 className="mb-2 font-serif text-xl font-bold text-accent-deep">
              {t('vocab.sessionDone')}
            </h2>
            <p className="mb-6 text-3xl font-bold">
              {t('vocab.scoreOf', { correct: correctCount, total: session.length })}
            </p>
            <button className="btn-primary" onClick={() => setSeed((n) => n + 1)}>
              {t('vocab.again')}
            </button>
          </div>
        ) : cell ? (
          <div className="card p-6 sm:p-8">
            <div className="mb-1 flex items-center justify-between text-xs text-stone-400">
              <span>
                {index + 1} / {session.length}
              </span>
              <span>
                {t('vocab.score')}: {correctCount}
              </span>
            </div>
            <div className="my-8 text-center">
              <button
                className="font-serif text-7xl font-bold transition-colors hover:text-accent-deep"
                onClick={() => speakKana(glyph(cell), cell.r[0], KANA_AUDIO)}
              >
                {glyph(cell)}
              </button>
              <p className="mt-4 text-xs text-stone-400">{t('kana.prompt')}</p>
            </div>
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
                {glyph(cell)} = {cell.r[0]}
              </div>
            )}
            <input
              ref={inputRef}
              value={input}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              placeholder={t('vocab.inputPlaceholder')}
              className="mb-4 w-full rounded-lg border border-stone-300 p-3 text-center text-lg lowercase outline-none focus:border-accent focus:ring-2 focus:ring-accent-light"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              readOnly={feedback !== null}
            />
            <div className="flex justify-center gap-2">
              {feedback ? (
                <button className="btn-primary" onClick={advance}>{t('vocab.nextWord')}</button>
              ) : (
                <>
                  <button className="btn-primary" onClick={check}>{t('vocab.check')}</button>
                  <button className="btn-ghost" onClick={() => { setFeedback('ng'); speakKana(glyph(cell), cell.r[0], KANA_AUDIO) }}>
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

  // ---- chart view ----
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold">{t('kana.title')}</h1>
        <div className="flex gap-2">
          <Link to="/kana/convert" className="btn-ghost text-sm">
            {t('kana.convertEntry')}
          </Link>
          <button className="btn-primary text-sm" onClick={() => setPracticing(true)}>
            {t('kana.practice')}
          </button>
        </div>
      </div>
      <div className="mb-2">{scriptToggle}</div>
      <p className="mb-8 text-xs text-stone-400">{t('kana.tapHint')}</p>

      {SECTIONS.map((section) => (
        <section key={section.key} className="mb-10">
          <h2 className="mb-4 font-serif text-lg font-semibold text-accent-deep">
            {t(`kana.${section.key}`)}
          </h2>
          <div className="flex flex-col gap-2">
            {section.rows.map((row) => {
              const filled = row.cells.filter((c): c is KanaCell => c !== null)
              const isRowPlaying = playingRow === row.name
              return (
                <div key={row.name} className="flex items-center gap-2">
                  <button
                    className={`shrink-0 rounded-lg border p-1.5 transition-colors ${
                      isRowPlaying
                        ? 'border-accent-dark bg-accent-light text-accent-deep'
                        : 'border-stone-200 bg-white text-stone-300 hover:text-accent-dark'
                    }`}
                    onClick={() => playRow(row.name, filled)}
                    title={t('kana.playRow')}
                    aria-label={`${row.name} ${t('kana.playRow')}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                      {isRowPlaying ? <path d="M7 6h4v12H7zM13 6h4v12h-4z" /> : <path d="M7 4.5v15l12-7.5z" />}
                    </svg>
                  </button>
                  <div
                    className={`grid flex-1 gap-2 ${
                      row.cells.length === 3 ? 'grid-cols-3 sm:max-w-[19rem]' : 'grid-cols-5'
                    }`}
                  >
                    {row.cells.map((kc, i) =>
                      kc ? (
                        <button
                          key={i}
                          onClick={() => speakKana(script === 'hiragana' ? kc.h : kc.k, kc.r[0], KANA_AUDIO)}
                          className={`card flex flex-col items-center py-2.5 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent hover:shadow-lift sm:py-3 ${
                            isRowPlaying && filled[playingIdx]?.r[0] === kc.r[0]
                              ? 'border-accent-dark bg-accent-light'
                              : ''
                          }`}
                        >
                          <span className="font-serif text-xl font-semibold sm:text-2xl">
                            {script === 'hiragana' ? kc.h : kc.k}
                          </span>
                          <span className="mt-0.5 text-[11px] text-stone-400">{kc.r[0]}</span>
                        </button>
                      ) : (
                        <span key={i} />
                      ),
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
