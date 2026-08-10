import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { grammarPoints, keigoLessons, byGroup } from '../data/grammar'
import LevelFilter from '../components/LevelFilter'
import Furigana from '../components/Furigana'
import { speak } from '../lib/tts'
import type { GrammarPoint, Level } from '../types'

type Track = 'grammar' | 'keigo'

const LEVEL_BADGE: Record<Level, string> = {
  N5: 'bg-emerald-50 text-emerald-700',
  N4: 'bg-sky-50 text-sky-700',
  N3: 'bg-amber-50 text-amber-700',
  N2: 'bg-orange-50 text-orange-700',
  N1: 'bg-rose-50 text-rose-700',
}

function PointCard({ point, zhFirst }: { point: GrammarPoint; zhFirst: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className="card overflow-hidden">
      <button
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-stone-50"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${LEVEL_BADGE[point.level]}`}>
          {point.level}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-lg font-semibold">{point.pattern}</span>
          <span className="block truncate text-sm text-stone-500">
            {zhFirst ? point.meaning_zh : point.meaning_en}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-stone-100 p-5 pt-4">
          <div className="mb-4 rounded-lg bg-stone-50 px-3 py-2">
            <span className="mr-2 text-xs font-semibold text-stone-400">
              {t('grammar.formation')}
            </span>
            <span className="text-sm">{point.formation}</span>
          </div>

          <p className="mb-5 text-sm leading-relaxed text-stone-600">
            {zhFirst ? point.explain_zh : point.explain_en}
          </p>

          <ul className="mb-1 space-y-4">
            {point.examples.map((ex, i) => (
              <li key={i} className="border-l-2 border-accent-light pl-4">
                <button
                  className="text-left text-lg leading-relaxed transition-colors hover:text-accent-deep"
                  onClick={() => speak(ex.ja)}
                  title={t('vocab.playAudio')}
                >
                  <Furigana text={ex.ja} furigana={ex.furigana} />
                </button>
                <p className="mt-1 text-sm text-stone-500">{zhFirst ? ex.zh : ex.en}</p>
              </li>
            ))}
          </ul>

          {(zhFirst ? point.note_zh : point.note_en) && (
            <p className="mt-5 rounded-lg bg-amber-50/70 px-3 py-2 text-sm leading-relaxed text-amber-800">
              <span className="mr-1.5 font-semibold">{t('grammar.note')}</span>
              {zhFirst ? point.note_zh : point.note_en}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function Grammar() {
  const { t, i18n } = useTranslation()
  const zhFirst = (i18n.resolvedLanguage ?? 'en').startsWith('zh')
  const [track, setTrack] = useState<Track>('grammar')
  const [level, setLevel] = useState<Level | 'all'>('all')

  const groups = useMemo(() => {
    if (track === 'keigo') return byGroup(keigoLessons)
    const list =
      level === 'all' ? grammarPoints : grammarPoints.filter((p) => p.level === level)
    return byGroup(list)
  }, [track, level])

  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-serif text-2xl font-bold">{t('grammar.title')}</h1>

      <div className="mb-5 flex gap-2">
        {(['grammar', 'keigo'] as Track[]).map((tk) => (
          <button
            key={tk}
            className={`${track === tk ? 'chip-on' : 'chip-off'} flex-1 justify-center whitespace-nowrap sm:flex-none`}
            onClick={() => setTrack(tk)}
          >
            {t(`grammar.track_${tk}`)}
          </button>
        ))}
      </div>

      {track === 'grammar' ? (
        <div className="mb-3">
          <LevelFilter value={level} onChange={setLevel} />
        </div>
      ) : (
        <p className="mb-3 text-sm text-stone-500">{t('grammar.keigoIntro')}</p>
      )}
      <p className="mb-6 text-xs text-stone-400">{t('grammar.count', { count: total })}</p>

      {total === 0 ? (
        <p className="py-12 text-center text-stone-400">{t('grammar.empty')}</p>
      ) : (
        groups.map((g) => (
          // Keyed by first item, not group name: a group can recur non-adjacently
          // (N3 has two 推量・伝聞 runs) and duplicate keys strand stale sections.
          <section key={g.items[0].id} className="mb-8">
            <h2 className="mb-3 font-serif text-sm font-semibold tracking-wide text-accent-deep">
              {g.group}
            </h2>
            <div className="space-y-2.5">
              {g.items.map((p) => (
                <PointCard key={p.id} point={p} zhFirst={zhFirst} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
