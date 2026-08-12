import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageMeta } from '../hooks/usePageMeta'

export default function Home() {
  const { t } = useTranslation()
  usePageMeta('/')

  const cards = [
    { to: '/kana', mark: '音', title: t('home.kanaTitle'), desc: t('home.kanaDesc') },
    { to: '/articles', mark: '文', title: t('home.articleTitle'), desc: t('home.articleDesc') },
    { to: '/vocab', mark: '語', title: t('home.vocabTitle'), desc: t('home.vocabDesc') },
  ]

  return (
    <div className="py-10 sm:py-20">
      <div className="mb-16 text-center">
        <p className="mb-5 font-serif text-sm font-semibold tracking-[0.35em] text-accent-dark">
          日本語タイピング
        </p>
        <h1 className="mx-auto mb-5 max-w-2xl font-serif text-4xl font-bold leading-snug sm:text-5xl">
          {t('home.heroTitle')}
        </h1>
        <p className="mx-auto max-w-xl leading-relaxed text-stone-500">
          {t('home.heroSubtitle')}
        </p>
      </div>
      <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="card group p-8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
          >
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-light font-serif text-2xl font-bold text-accent-deep">
              {c.mark}
            </span>
            <h2 className="mb-2 font-serif text-xl font-semibold group-hover:text-accent-deep">
              {c.title}
            </h2>
            <p className="mb-5 text-sm leading-relaxed text-stone-500">{c.desc}</p>
            <span className="text-sm font-medium text-accent-dark transition-colors group-hover:text-accent-deep">
              {t('home.start')} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
