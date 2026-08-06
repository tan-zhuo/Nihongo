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
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-accent-light text-accent-dark' : 'text-stone-500 hover:text-ink'
    }`

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-1 sm:gap-4">
            <Link to="/" className="mr-2 text-lg font-bold tracking-tight text-accent-dark">
              日<span className="text-ink">Type</span>
            </Link>
            <nav className="flex items-center gap-1">
              <NavLink to="/" end className={navCls}>{t('nav.home')}</NavLink>
              <NavLink to="/articles" className={navCls}>{t('nav.articles')}</NavLink>
              <NavLink to="/vocab" className={navCls}>{t('nav.vocab')}</NavLink>
              <NavLink to="/stats" className={navCls}>{t('nav.stats')}</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-0.5">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => i18n.changeLanguage(l.code)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  current.startsWith(l.code)
                    ? 'bg-accent text-white'
                    : 'text-stone-500 hover:text-ink'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-stone-200 py-4 text-center text-xs text-stone-400">
        NihongoType · {t('app.tagline')}
      </footer>
    </div>
  )
}
