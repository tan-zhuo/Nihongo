import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { allCells, conversionOptions, type KanaCell, type KanaSection } from '../data/kana'
import { addKanaRecord } from '../lib/storage'
import { speakKana } from '../lib/tts'
import manifest from '../data/audio-manifest.json'
import { usePageMeta } from '../hooks/usePageMeta'

const KANA_AUDIO: readonly string[] = manifest.kana ?? []

type Direction = 'h2k' | 'k2h'
type AnswerMode = 'choice' | 'write'
type SetKey = KanaSection | 'all'

const SESSION_SIZE = 20
const OPTION_COUNT = 6
const AUTO_NEXT_MS = 550
const DIR_KEY = 'nihongotype.kana.convert.dir'
const MODE_KEY = 'nihongotype.kana.convert.mode'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Yōon are two glyphs wide — mixing them with single kana gives the answer away. */
const isYoon = (c: KanaCell) => c.h.length > 1

// ---------------------------------------------------------------------------
// Writing pad: draw the answer by hand, then compare against the real glyph.
// ---------------------------------------------------------------------------

type Point = [number, number]

function WritingPad({ ghost }: { ghost: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [strokes, setStrokes] = useState<Point[][]>([])
  const current = useRef<Point[] | null>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })

  // Match the backing store to the CSS box so strokes stay crisp on retina.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const fit = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      const ctx = canvas.getContext('2d')
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
      setBox({ w: rect.width, h: rect.height })
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !box.w) return
    ctx.clearRect(0, 0, box.w, box.h)

    // 田字格 guide lines
    ctx.save()
    ctx.strokeStyle = '#e7e5e4'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 6])
    ctx.beginPath()
    ctx.moveTo(box.w / 2, 0)
    ctx.lineTo(box.w / 2, box.h)
    ctx.moveTo(0, box.h / 2)
    ctx.lineTo(box.w, box.h / 2)
    ctx.stroke()
    ctx.restore()

    ctx.strokeStyle = '#1c1917'
    ctx.lineWidth = Math.max(4, box.w * 0.035)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const stroke of current.current ? [...strokes, current.current] : strokes) {
      if (stroke.length === 0) continue
      ctx.beginPath()
      ctx.moveTo(stroke[0][0], stroke[0][1])
      if (stroke.length === 1) ctx.lineTo(stroke[0][0] + 0.1, stroke[0][1])
      else for (const [x, y] of stroke.slice(1)) ctx.lineTo(x, y)
      ctx.stroke()
    }
  }, [strokes, box])

  useEffect(redraw, [redraw])

  const pointOf = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[16rem]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-crosshair touch-none rounded-2xl border border-stone-200 bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          current.current = [pointOf(e)]
          redraw()
        }}
        onPointerMove={(e) => {
          if (!current.current) return
          current.current.push(pointOf(e))
          redraw()
        }}
        onPointerUp={() => {
          // Read the ref now — the state updater runs after it has been cleared.
          const stroke = current.current
          current.current = null
          if (stroke && stroke.length > 0) setStrokes((s) => [...s, stroke])
          else redraw()
        }}
        onPointerCancel={() => {
          current.current = null
          redraw()
        }}
      />
      {/* The answer is overlaid on top of the ink so mistakes are obvious. */}
      {ghost && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-serif text-[9rem] leading-none text-accent-dark/30">
          {ghost}
        </span>
      )}
      <div className="absolute -bottom-11 left-0 right-0 flex justify-center gap-2">
        <PadButton onClick={() => setStrokes((s) => s.slice(0, -1))} label="undo" />
        <PadButton onClick={() => setStrokes([])} label="clear" />
      </div>
    </div>
  )
}

function PadButton({ onClick, label }: { onClick: () => void; label: 'undo' | 'clear' }) {
  const { t } = useTranslation()
  return (
    <button className="btn-ghost px-3 py-1.5 text-xs" onClick={onClick} type="button">
      {t(`kana.convert.${label}`)}
    </button>
  )
}

// ---------------------------------------------------------------------------

export default function KanaConvert() {
  usePageMeta('/kana/convert')
  const { t } = useTranslation()

  const [direction, setDirection] = useState<Direction>(
    () => (localStorage.getItem(DIR_KEY) === 'k2h' ? 'k2h' : 'h2k'),
  )
  const [answerMode, setAnswerMode] = useState<AnswerMode>(
    () => (localStorage.getItem(MODE_KEY) === 'write' ? 'write' : 'choice'),
  )
  const [setKey, setSetKey] = useState<SetKey>('all')
  const [seed, setSeed] = useState(0)
  const [retryPool, setRetryPool] = useState<KanaCell[] | null>(null)

  const target: 'hiragana' | 'katakana' = direction === 'h2k' ? 'katakana' : 'hiragana'
  const source = (c: KanaCell) => (direction === 'h2k' ? c.h : c.k)
  const answer = (c: KanaCell) => (direction === 'h2k' ? c.k : c.h)

  const session = useMemo(
    () =>
      retryPool
        ? shuffle(retryPool)
        : shuffle(allCells(setKey === 'all' ? undefined : [setKey])).slice(0, SESSION_SIZE),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setKey, seed, retryPool],
  )

  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<KanaCell | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [missed, setMissed] = useState<KanaCell[]>([])
  const savedRef = useRef(false)

  useEffect(() => {
    cancelAutoNext()
    setIndex(0)
    setPicked(null)
    setRevealed(false)
    setCorrectCount(0)
    setMissed([])
    savedRef.current = false
  }, [session, direction, answerMode])

  const cell: KanaCell | undefined = session[index]
  const done = session.length > 0 && index >= session.length

  useEffect(() => {
    if (!done || savedRef.current) return
    savedRef.current = true
    addKanaRecord({
      ts: Date.now(),
      script: target,
      set: setKey,
      mode: 'convert',
      correct: correctCount,
      total: session.length,
    })
  }, [done, target, setKey, correctCount, session.length])

  // Distractors come from the same shape class so length never leaks the answer.
  const options = useMemo(() => {
    if (!cell || answerMode !== 'choice') return []
    const pool = allCells().filter((c) => isYoon(c) === isYoon(cell))
    return conversionOptions(cell, pool, target, OPTION_COUNT)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell, target, answerMode, index])

  const persist = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value)
    } catch {
      // private mode → preference just won't stick
    }
  }

  // A correct pick moves on by itself; only a miss waits for the reader.
  const autoNext = useRef<number | null>(null)
  const cancelAutoNext = () => {
    if (autoNext.current !== null) {
      clearTimeout(autoNext.current)
      autoNext.current = null
    }
  }
  useEffect(() => cancelAutoNext, [])

  const advance = useCallback(() => {
    cancelAutoNext()
    setIndex((i) => i + 1)
    setPicked(null)
    setRevealed(false)
  }, [])

  const grade = useCallback(
    (ok: boolean) => {
      if (!cell) return
      if (ok) setCorrectCount((n) => n + 1)
      else setMissed((m) => (m.some((c) => c.r[0] === cell.r[0]) ? m : [...m, cell]))
    },
    [cell],
  )

  const choose = (option: KanaCell) => {
    if (!cell || picked) return
    const ok = answer(option) === answer(cell)
    setPicked(option)
    setRevealed(true)
    grade(ok)
    speakKana(answer(cell), cell.r[0], KANA_AUDIO)
    // Long enough to register the green flash, short enough to stay in flow.
    if (ok) autoNext.current = window.setTimeout(advance, AUTO_NEXT_MS)
  }

  const reveal = useCallback(() => {
    if (!cell || revealed) return
    setRevealed(true)
    speakKana(answer(cell), cell.r[0], KANA_AUDIO)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell, revealed, direction])

  const selfGrade = (ok: boolean) => {
    grade(ok)
    advance()
  }

  // Keyboard: 1–6 answer in choice mode, Enter reveals / moves on.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || done || !cell) return
      if (e.key === 'Enter') {
        e.preventDefault()
        if (answerMode === 'choice') {
          if (revealed) advance()
        } else if (!revealed) reveal()
        return
      }
      const n = Number(e.key)
      if (!Number.isInteger(n) || n < 1) return
      if (answerMode === 'choice') {
        if (revealed || n > options.length) return
        e.preventDefault()
        choose(options[n - 1])
      } else if (revealed && n <= 2) {
        e.preventDefault()
        selfGrade(n === 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const scriptName = t(`kana.${target}`)

  const controls = (
    <>
      <div className="mb-3 flex gap-2">
        {(['h2k', 'k2h'] as Direction[]).map((d) => (
          <button
            key={d}
            className={`${direction === d ? 'chip-on' : 'chip-off'} flex-1 justify-center whitespace-nowrap sm:flex-none`}
            onClick={() => {
              setDirection(d)
              persist(DIR_KEY, d)
              setRetryPool(null)
              setSeed((n) => n + 1)
            }}
          >
            {t(`kana.convert.${d}`)}
          </button>
        ))}
      </div>
      <div className="mb-3 flex gap-2">
        {(['choice', 'write'] as AnswerMode[]).map((m) => (
          <button
            key={m}
            className={`${answerMode === m ? 'chip-on' : 'chip-off'} flex-1 justify-center whitespace-nowrap sm:flex-none`}
            onClick={() => {
              setAnswerMode(m)
              persist(MODE_KEY, m)
            }}
          >
            {t(`kana.convert.${m}`)}
          </button>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {(['all', 'seion', 'dakuon', 'yoon'] as SetKey[]).map((s) => (
          <button
            key={s}
            className={setKey === s && !retryPool ? 'chip-on' : 'chip-off'}
            onClick={() => {
              setSetKey(s)
              setRetryPool(null)
              setSeed((n) => n + 1)
            }}
          >
            {s === 'all' ? t('vocab.all') : t(`kana.${s}`)}
          </button>
        ))}
      </div>
    </>
  )

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold">{t('kana.convert.title')}</h1>
        <Link to="/kana" className="btn-ghost shrink-0 text-xs">
          {t('kana.convert.backToChart')}
        </Link>
      </div>
      {controls}

      {done ? (
        <div className="card p-8 text-center">
          <h2 className="mb-2 font-serif text-xl font-bold text-accent-deep">
            {t('vocab.sessionDone')}
          </h2>
          <p className="mb-6 text-3xl font-bold">
            {t('vocab.scoreOf', { correct: correctCount, total: session.length })}
          </p>
          {missed.length > 0 && (
            <div className="mb-6 text-left">
              <p className="mb-2 text-xs font-semibold text-stone-400">
                {t('kana.convert.missedTitle')}
              </p>
              <div className="flex flex-wrap gap-2">
                {missed.map((c) => (
                  <button
                    key={c.r[0] + c.h}
                    onClick={() => speakKana(answer(c), c.r[0], KANA_AUDIO)}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 font-serif text-lg"
                  >
                    {source(c)} → <span className="font-bold text-accent-deep">{answer(c)}</span>
                    <span className="ml-1.5 font-sans text-[11px] text-stone-400">{c.r[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              className="btn-primary"
              onClick={() => {
                setRetryPool(null)
                setSeed((n) => n + 1)
              }}
            >
              {t('vocab.again')}
            </button>
            {missed.length > 0 && (
              <button className="btn-ghost" onClick={() => setRetryPool(missed)}>
                {t('kana.convert.practiceMissed')}
              </button>
            )}
          </div>
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

          <div className="my-6 text-center">
            <button
              className="font-serif text-7xl font-bold transition-colors hover:text-accent-deep"
              onClick={() => speakKana(source(cell), cell.r[0], KANA_AUDIO)}
            >
              {source(cell)}
            </button>
            <p className="mt-3 text-xs text-stone-400">
              {t(answerMode === 'choice' ? 'kana.convert.promptChoice' : 'kana.convert.promptWrite', {
                script: scriptName,
              })}
            </p>
          </div>

          {answerMode === 'choice' ? (
            <>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {options.map((o, i) => {
                  const isAnswer = answer(o) === answer(cell)
                  const isPicked = picked !== null && answer(o) === answer(picked)
                  const state = !revealed
                    ? 'border-stone-200 bg-white hover:-translate-y-0.5 hover:border-accent hover:shadow-lift'
                    : isAnswer
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : isPicked
                        ? 'border-red-300 bg-red-50 text-red-600'
                        : 'border-stone-200 bg-white opacity-40'
                  return (
                    <button
                      key={answer(o)}
                      disabled={revealed}
                      onClick={() => choose(o)}
                      className={`relative rounded-2xl border py-5 font-serif text-4xl font-semibold shadow-card transition-all duration-150 ${state}`}
                    >
                      <span className="absolute left-2 top-1.5 font-sans text-[10px] text-stone-300">
                        {i + 1}
                      </span>
                      {answer(o)}
                    </button>
                  )
                })}
              </div>
              <p className="mt-4 text-center text-[11px] text-stone-300">
                {t('kana.convert.hintChoice')}
              </p>
              {revealed && picked && answer(picked) !== answer(cell) && (
                <div className="mt-4 flex justify-center">
                  <button className="btn-primary" onClick={advance}>
                    {t('vocab.nextWord')}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <WritingPad key={`${index}-${direction}`} ghost={revealed ? answer(cell) : null} />
              <div className="mt-14 flex flex-wrap justify-center gap-2">
                {revealed ? (
                  <>
                    <button className="btn-primary" onClick={() => selfGrade(true)}>
                      {t('kana.convert.gotIt')}
                    </button>
                    <button className="btn-ghost" onClick={() => selfGrade(false)}>
                      {t('kana.convert.missedIt')}
                    </button>
                  </>
                ) : (
                  <button className="btn-primary" onClick={reveal}>
                    {t('kana.convert.reveal')}
                  </button>
                )}
              </div>
              <p className="mt-4 text-center text-[11px] text-stone-300">
                {t(revealed ? 'kana.convert.hintGrade' : 'kana.convert.hintWrite')}
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
