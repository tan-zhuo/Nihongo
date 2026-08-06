import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Home() {
  const { t } = useTranslation()
  return (
    <div className="py-8 sm:py-16">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-3xl font-bold sm:text-4xl">{t('home.heroTitle')}</h1>
        <p className="mx-auto max-w-xl text-stone-500">{t('home.heroSubtitle')}</p>
      </div>
      <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
        <Link
          to="/articles"
          className="card group p-8 transition-shadow hover:shadow-md"
        >
          <div className="mb-3 text-4xl">✍️</div>
          <h2 className="mb-2 text-xl font-bold group-hover:text-accent-dark">
            {t('home.articleTitle')}
          </h2>
          <p className="mb-4 text-sm text-stone-500">{t('home.articleDesc')}</p>
          <span className="text-sm font-medium text-accent">{t('home.start')} →</span>
        </Link>
        <Link
          to="/vocab"
          className="card group p-8 transition-shadow hover:shadow-md"
        >
          <div className="mb-3 text-4xl">📚</div>
          <h2 className="mb-2 text-xl font-bold group-hover:text-accent-dark">
            {t('home.vocabTitle')}
          </h2>
          <p className="mb-4 text-sm text-stone-500">{t('home.vocabDesc')}</p>
          <span className="text-sm font-medium text-accent">{t('home.start')} →</span>
        </Link>
      </div>
    </div>
  )
}
