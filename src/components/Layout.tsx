import { useState } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'zh', label: '中' },
  { code: 'ja', label: '日' },
  { code: 'en', label: 'EN' },
]

const ICONS: Record<string, JSX.Element> = {
  home: (
    <path d="M3 10.5 12 3l9 7.5M5.5 8.5V21h13V8.5" />
  ),
  articles: (
    <path d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3 5h6M9 12h6M9 16h4" />
  ),
  vocab: (
    <path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2V5Zm4 14v2M12 7v4m0 0-2.5 6M12 11l2.5 6" />
  ),
  stats: (
    <path d="M4 20h16M7 20v-6m5 6V9m5 11v-9" />
  ),
}

function NavIcon({ name }: { name: string }) {
  if (name === 'kana') {
    return <span className="flex h-5 w-5 items-center justify-center text-[15px] leading-none">あ</span>
  }
  if (name === 'grammar') {
    return <span className="flex h-5 w-5 items-center justify-center font-serif text-[15px] leading-none">文</span>
  }
  if (name === 'quiz') {
    return <span className="flex h-5 w-5 items-center justify-center font-serif text-[15px] leading-none">験</span>
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  )
}

const NAV_ITEMS = [
  { to: '/', key: 'home', icon: 'home', end: true },
  { to: '/kana', key: 'kana', icon: 'kana' },
  { to: '/grammar', key: 'grammar', icon: 'grammar' },
  { to: '/articles', key: 'articles', icon: 'articles' },
  { to: '/vocab', key: 'vocab', icon: 'vocab' },
  { to: '/quiz', key: 'quiz', icon: 'quiz' },
  { to: '/stats', key: 'stats', icon: 'stats' },
]

// The bottom tab bar drops Home — the logo already goes there — to stay legible at 375px.
const TAB_ITEMS = NAV_ITEMS.filter((i) => i.key !== 'home')

export default function Layout() {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage ?? 'en'
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')

  const submitFeedback = () => {
    const url = `https://github.com/tan-zhuo/Nihongo/issues/new?title=${encodeURIComponent(
      '[Feedback] ',
    )}&body=${encodeURIComponent(feedbackText + '\n\n---\nvia nihongo.ink feedback')}`
    window.open(url, '_blank', 'noopener')
    setFeedbackOpen(false)
    setFeedbackText('')
  }

  const topNavCls = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors duration-150 ${
      isActive
        ? 'font-semibold text-accent-deep'
        : 'font-medium text-stone-400 hover:text-ink'
    }`

  const tabCls = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition-colors duration-150 ${
      isActive ? 'font-semibold text-accent-deep' : 'font-medium text-stone-400'
    }`

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-stone-200/70 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-6">
            <Link to="/" className="flex shrink-0 items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-dark font-serif text-lg font-bold text-white">
                日
              </span>
              <span className="font-serif text-lg font-semibold tracking-tight">
                nihongo.ink
              </span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={topNavCls}>
                  {t(`nav.${item.key}`)}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center rounded-full border border-stone-200 bg-white p-0.5">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => i18n.changeLanguage(l.code)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200/70 px-4 pb-20 pt-6 text-center text-xs tracking-wide text-stone-400 sm:pb-6">
        <p className="mb-2">nihongo.ink · {t('app.tagline')}</p>
        <p className="flex items-center justify-center gap-4">
          <a
            href="https://tanzhuo.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-accent-dark"
          >
            {t('footer.blog')}
          </a>
          <span className="text-stone-300">·</span>
          <a
            href="https://github.com/tan-zhuo/Nihongo"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-accent-dark"
          >
            {t('footer.source')} (GitHub)
          </a>
          <span className="text-stone-300">·</span>
          <button
            onClick={() => setFeedbackOpen(true)}
            className="transition-colors hover:text-accent-dark"
          >
            {t('feedback.title')}
          </button>
        </p>
        {/* Required by the VOICEVOX terms for the pre-generated audio. */}
        <p className="mt-2 text-[11px] text-stone-300">音声: VOICEVOX:四国めたん</p>
      </footer>

      {feedbackOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
          onClick={() => setFeedbackOpen(false)}
        >
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 font-serif text-lg font-bold">{t('feedback.title')}</h2>
            <p className="mb-4 text-xs text-stone-400">{t('feedback.note')}</p>
            <textarea
              value={feedbackText}
              autoFocus
              rows={5}
              placeholder={t('feedback.placeholder')}
              className="mb-4 w-full resize-none rounded-lg border border-stone-300 p-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-light"
              onChange={(e) => setFeedbackText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="btn-ghost text-sm" onClick={() => setFeedbackOpen(false)}>
                {t('feedback.cancel')}
              </button>
              <button
                className="btn-primary text-sm"
                disabled={!feedbackText.trim()}
                onClick={submitFeedback}
              >
                {t('feedback.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200/70 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="flex">
          {TAB_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={tabCls}>
              <NavIcon name={item.icon} />
              {t(`nav.${item.key}`)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
