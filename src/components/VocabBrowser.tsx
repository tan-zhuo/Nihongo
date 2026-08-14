import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { speak } from '../lib/tts'
import type { VocabWord } from '../types'

const POS_KEY = 'nihongotype.vocab.browse.pos.v1'
const INTERVALS = [5000, 3000, 2000] as const

// One shared fetch of the prebuilt word→image manifest (public/word-images.json).
let imagesPromise: Promise<Record<string, string>> | null = null
function loadImages(): Promise<Record<string, string>> {
  imagesPromise ??= fetch('/word-images.json')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
  return imagesPromise
}

function loadPositions(): Record<string, number> {
  try {
    const raw = localStorage.getItem(POS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // corrupted/unavailable storage → start fresh
  }
  return {}
}

function savePosition(poolKey: string, index: number) {
  try {
    const all = loadPositions()
    all[poolKey] = index
    localStorage.setItem(POS_KEY, JSON.stringify(all))
  } catch {
    // best-effort
  }
}

interface Props {
  pool: VocabWord[]
  poolKey: string
  zhFirst: boolean
}

export default function VocabBrowser({ pool, poolKey, zhFirst }: Props) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(() => {
    const saved = loadPositions()[poolKey] ?? 0
    return saved < pool.length ? saved : 0
  })
  const [playing, setPlaying] = useState(false)
  const [intervalMs, setIntervalMs] = useState<number>(3000)
  const [sound, setSound] = useState(true)
  const [images, setImages] = useState<Record<string, string>>({})
  const soundRef = useRef(sound)
  soundRef.current = sound

  useEffect(() => {
    loadImages().then(setImages)
  }, [])

  // Filter change → jump to that pool's saved position.
  useEffect(() => {
    const saved = loadPositions()[poolKey] ?? 0
    setIndex(saved < pool.length ? saved : 0)
    setPlaying(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolKey])

  const word: VocabWord | undefined = pool[index]
  const done = pool.length > 0 && index >= pool.length

  useEffect(() => {
    if (!done) savePosition(poolKey, index)
    if (word && soundRef.current) speak(word.reading)
  }, [index, poolKey, done, word])

  useEffect(() => {
    if (!playing || done) return
    const id = setTimeout(() => setIndex((i) => i + 1), intervalMs)
    return () => clearTimeout(id)
  }, [playing, index, intervalMs, done])

  useEffect(() => {
    if (done) setPlaying(false)
  }, [done])

  const prev = () => setIndex((i) => Math.max(0, i - 1))
  const next = () => setIndex((i) => Math.min(pool.length, i + 1))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.length])

  if (pool.length === 0) {
    return <p className="py-12 text-center text-stone-400">{t('vocab.empty')}</p>
  }

  if (done) {
    return (
      <div className="card p-8 text-center">
        <h2 className="mb-2 text-xl font-bold text-accent-dark">{t('vocab.browseDone')}</h2>
        <p className="mb-6 text-sm text-stone-500">{pool.length} / {pool.length}</p>
        <button
          className="btn-primary"
          onClick={() => {
            savePosition(poolKey, 0)
            setIndex(0)
          }}
        >
          {t('vocab.restart')}
        </button>
      </div>
    )
  }

  const img = word ? images[word.word] : undefined

  return (
    <div className="card overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-stone-100">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${((index + 1) / pool.length) * 100}%` }}
        />
      </div>

      <div className="p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-between text-xs text-stone-400">
          <span>
            {index + 1} / {pool.length}
          </span>
          <span className="rounded-full bg-accent-light px-2.5 py-0.5 font-medium text-accent-deep">
            {word!.level}
          </span>
        </div>

        <div className="text-center">
          {img && (
            <img
              src={img}
              alt={word!.word}
              loading="lazy"
              className="mx-auto mb-5 h-40 rounded-xl object-cover shadow-sm sm:h-48"
            />
          )}
          <button
            className="font-serif text-4xl font-bold transition-colors hover:text-accent-deep sm:text-5xl"
            onClick={() => speak(word!.reading)}
            title={t('vocab.playAudio')}
          >
            {word!.word}
          </button>
          <div className="mt-2 text-lg text-stone-500">{word!.reading}</div>
          <div className="mt-3 text-xl font-medium">
            {zhFirst ? word!.meaning_zh : word!.meaning_en}
          </div>
          <div className="mt-1 text-sm text-stone-400">
            {zhFirst ? word!.meaning_en : word!.meaning_zh} ·{' '}
            {t(`vocab.pos.${word!.pos}`, { defaultValue: word!.pos })}
          </div>
          <a
            href={`https://www.google.com/search?udm=2&q=${encodeURIComponent(word!.word)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs text-accent-dark underline decoration-accent-light underline-offset-4 transition-colors hover:text-accent-deep"
          >
            {t('vocab.googleImages')} ↗
          </a>
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <button className="btn-ghost px-3" onClick={prev} disabled={index === 0} aria-label="prev">
            ←
          </button>
          <button className="btn-primary min-w-28" onClick={() => setPlaying((p) => !p)}>
            {playing ? t('vocab.pause') : t('vocab.play')}
          </button>
          <button className="btn-ghost px-3" onClick={next} aria-label="next">
            →
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          {INTERVALS.map((ms) => (
            <button
              key={ms}
              className={intervalMs === ms ? 'chip-on' : 'chip-off'}
              onClick={() => setIntervalMs(ms)}
            >
              {ms / 1000}s
            </button>
          ))}
          <button className={sound ? 'chip-on' : 'chip-off'} onClick={() => setSound((s) => !s)}>
            {t('vocab.sound')}
          </button>
        </div>

        <p className="mt-4 hidden text-center text-xs text-stone-300 sm:block">
          {t('vocab.browseHint')}
        </p>
      </div>
    </div>
  )
}
