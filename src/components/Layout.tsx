import { Outlet, NavLink, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'zh', label: '中' },
  { code: 'ja', label: '日' },
  { code: 'en', label: 'EN' },
]

export default function Layout() {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage ?? 'en'

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap rounded-lg px-2 py-1.5 text-[13px] transition-colors duration-150 sm:px-3 sm:text-sm ${
      isActive
        ? 'font-semibold text-accent-deep'
        : 'font-medium text-stone-400 hover:text-ink'
    }`

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-stone-200/70 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-6">
            <Link to="/" className="flex shrink-0 items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-dark font-serif text-lg font-bold text-white">
                日
              </span>
              <span className="hidden font-serif text-lg font-semibold tracking-tight md:block">
                NihongoType
              </span>
            </Link>
            <nav className="flex items-center gap-0 sm:gap-1">
              <NavLink to="/" end className={(p) => `${navCls(p)} hidden sm:block`}>
                {t('nav.home')}
              </NavLink>
              <NavLink to="/articles" className={navCls}>{t('nav.articles')}</NavLink>
              <NavLink to="/vocab" className={navCls}>{t('nav.vocab')}</NavLink>
              <NavLink to="/stats" className={navCls}>{t('nav.stats')}</NavLink>
            </nav>
          </div>
          <div className="flex shrink-0 items-center rounded-full border border-stone-200 bg-white p-0.5">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => i18n.changeLanguage(l.code)}
                className={`rounded-full px-2 py-1 text-xs font-medium transition-colors duration-150 sm:px-2.5 ${
                  current.startsWith(l.code)
                    ? 'bg-accent-dark text-white'
                    : 'text-stone-400 hover:text-ink'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-stone-200/70 py-6 text-center text-xs tracking-wide text-stone-400">
        NihongoType · {t('app.tagline')}
      </footer>
    </div>
  )
}
